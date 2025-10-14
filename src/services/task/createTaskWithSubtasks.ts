import { Prisma } from '@prisma/client';
import { prisma } from '../../db/client';
import {
  inferSkillsForTasks,
  type SkillDescriptor,
  type TaskDescriptor
} from '../../client/geminiClient';
import type { CreatedTaskResult } from '../../responseParam/task';
import { HttpError } from '../errors';
import { TaskStatusId, MAX_TASK_NESTING_DEPTH } from './constants';

export interface TaskCreationPayload {
  title?: string;
  skills?: number[];
  subtasks?: TaskCreationPayload[];
}

interface TaskCreationContext {
  skillsById: Map<number, SkillDescriptor>;
  tasksNeedingInference: Array<{
    taskId: string;
    title: string;
    resultRef: CreatedTaskResult;
  }>;
  createdTaskIds: string[];
}

const normaliseSkills = (
  skills: number[] | undefined,
  context: TaskCreationContext
): SkillDescriptor[] => {
  if (!Array.isArray(skills)) return [];

  const uniqueIds = Array.from(new Set(skills));
  const matched: SkillDescriptor[] = [];
  const invalidValues: Array<string | number> = [];

  for (const raw of uniqueIds) {
    if (typeof raw !== 'number' || !Number.isInteger(raw)) {
      invalidValues.push(raw);
      continue;
    }

    const descriptor = context.skillsById.get(raw);
    if (!descriptor) {
      invalidValues.push(raw);
      continue;
    }

    matched.push(descriptor);
  }

  if (invalidValues.length > 0) {
    throw new HttpError(400, `Unknown skills: ${invalidValues.join(', ')}`);
  }

  return matched;
};

const createTaskRecursive = async (
  payload: TaskCreationPayload,
  parentTaskId: string | null,
  tx: Prisma.TransactionClient,
  context: TaskCreationContext,
  depth: number = 0
): Promise<CreatedTaskResult> => {
  if (!payload || typeof payload !== 'object') {
    throw new HttpError(400, 'Invalid task payload.');
  }

  if (depth > MAX_TASK_NESTING_DEPTH) {
    throw new HttpError(400, `Maximum task nesting depth of ${MAX_TASK_NESTING_DEPTH} levels exceeded.`);
  }

  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  if (!title) {
    throw new HttpError(400, 'Task title is required.');
  }

  const matchedSkills = normaliseSkills(payload.skills, context);

  const task = await tx.task.create({
    data: {
      title,
      statusId: TaskStatusId.Backlog,
      developerId: null,
      parentTaskId
    }
  });

  context.createdTaskIds.push(task.taskId);

  if (matchedSkills.length > 0) {
    await tx.taskSkill.createMany({
      data: matchedSkills.map((skill) => ({
        taskId: task.taskId,
        skillId: skill.skillId
      })),
      skipDuplicates: true
    });
  }

  const subtasksPayload = Array.isArray(payload.subtasks) ? payload.subtasks : [];
  const subtasks: CreatedTaskResult[] = [];

  for (const subtaskPayload of subtasksPayload) {
    const child = await createTaskRecursive(subtaskPayload, task.taskId, tx, context, depth + 1);
    subtasks.push(child);
  }

  const result: CreatedTaskResult = {
    taskId: task.taskId,
    title: task.title,
    statusId: task.statusId,
    developerId: null,
    skills: matchedSkills.map((skill) => ({
      skillId: skill.skillId,
      skillName: skill.skillName
    })),
    subtasks: subtasks.length > 0 ? subtasks : undefined
  };

  if (matchedSkills.length === 0) {
    context.tasksNeedingInference.push({
      taskId: task.taskId,
      title: task.title,
      resultRef: result
    });
  }

  return result;
};

const getSkillsWithGemini = async (context: TaskCreationContext) => {
  if (context.tasksNeedingInference.length === 0) return;

  try {
    const suggestions = await inferSkillsForTasks(
      context.tasksNeedingInference.map<TaskDescriptor>(({ taskId, title }) => ({
        taskId,
        description: title
      })),
      Array.from(context.skillsById.values())
    );

    const insertData: { taskId: string; skillId: number }[] = [];

    for (const pending of context.tasksNeedingInference) {
      const suggestion = suggestions[pending.taskId];
      if (!Array.isArray(suggestion) || suggestion.length === 0) continue;

      const validSkillIds = Array.from(
        new Set(
          suggestion
            .map((value) => Number(value))
            .filter((value) => Number.isInteger(value) && context.skillsById.has(value))
        )
      );

      if (validSkillIds.length === 0) continue;

      pending.resultRef.skills = validSkillIds.map((skillId) => {
        const descriptor = context.skillsById.get(skillId)!;
        return { skillId: descriptor.skillId, skillName: descriptor.skillName };
      });

      for (const skillId of validSkillIds) {
        insertData.push({ taskId: pending.taskId, skillId });
      }
    }

    if (insertData.length > 0) {
      await prisma.taskSkill.createMany({ data: insertData, skipDuplicates: true });
    }
  } catch (error) {
    await prisma.task.deleteMany({
      where: { taskId: { in: context.createdTaskIds } }
    });
    throw new HttpError(500, 'Failed to automatically assign skills to tasks.');
  }
};

export const createTaskWithSubtasks = async (
  payload: TaskCreationPayload,
  parentTaskId: string | null
): Promise<CreatedTaskResult> => {
  if (!payload || typeof payload !== 'object') {
    throw new HttpError(400, 'Request body must be an object.');
  }

  const skills = await prisma.skill.findMany({
    select: { skillId: true, skillName: true }
  });

  const context: TaskCreationContext = {
    skillsById: new Map(skills.map((skill) => [skill.skillId, skill as SkillDescriptor])),
    tasksNeedingInference: [],
    createdTaskIds: []
  };

  const result = await prisma.$transaction(async (tx) => {
    if (parentTaskId) {
      const parent = await tx.task.findUnique({
        where: { taskId: parentTaskId },
        select: { taskId: true }
      });

      if (!parent) {
        throw new HttpError(404, 'Parent task not found.');
      }
    }

    return createTaskRecursive(payload, parentTaskId, tx, context);
  });

  await getSkillsWithGemini(context);

  return result;
};
