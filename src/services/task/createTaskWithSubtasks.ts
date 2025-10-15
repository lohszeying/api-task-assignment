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

interface TaskForInference {
  tempId: string;
  title: string;
}

interface TaskCreationContext {
  skillsById: Map<number, SkillDescriptor>;
  inferredSkills: Map<string, number[]>;
}

const buildTempId = (indexPath: number[]): string => {
  return indexPath.length === 0 ? 'root' : indexPath.join('-');
};

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

const collectTasksNeedingInference = (
  payload: TaskCreationPayload,
  indexPath: number[] = []
): TaskForInference[] => {
  if (!payload || typeof payload !== 'object') {
    throw new HttpError(400, 'Invalid task payload.');
  }

  if (indexPath.length > MAX_TASK_NESTING_DEPTH) {
    throw new HttpError(400, `Maximum task nesting depth of ${MAX_TASK_NESTING_DEPTH} levels exceeded.`);
  }

  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  if (!title) {
    throw new HttpError(400, 'Task title is required.');
  }

  const tasks: TaskForInference[] = [];
  const tempId = buildTempId(indexPath);

  // If no skills provided, add to inference list
  if (!Array.isArray(payload.skills) || payload.skills.length === 0) {
    tasks.push({ tempId, title });
  }

  // Recursively collect from subtasks
  const subtasksPayload = Array.isArray(payload.subtasks) ? payload.subtasks : [];
  for (let i = 0; i < subtasksPayload.length; i++) {
    tasks.push(...collectTasksNeedingInference(subtasksPayload[i], [...indexPath, i]));
  }

  return tasks;
};

const createTaskRecursive = async (
  payload: TaskCreationPayload,
  parentTaskId: string | null,
  tx: Prisma.TransactionClient,
  context: TaskCreationContext,
  indexPath: number[] = []
): Promise<CreatedTaskResult> => {
  const tempId = buildTempId(indexPath);
  const title = payload.title as string;

  // Use inferred skills if available, otherwise use provided skills
  const skillsToUse = context.inferredSkills.get(tempId) || payload.skills;
  const matchedSkills = normaliseSkills(skillsToUse, context);

  const task = await tx.task.create({
    data: {
      title,
      statusId: TaskStatusId.Backlog,
      developerId: null,
      parentTaskId
    }
  });

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

  for (let i = 0; i < subtasksPayload.length; i++) {
    const child = await createTaskRecursive(subtasksPayload[i], task.taskId, tx, context, [...indexPath, i]);
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

  return result;
};

const inferSkillsBeforeCreation = async (
  tasksNeedingInference: TaskForInference[],
  skillsById: Map<number, SkillDescriptor>
): Promise<Map<string, number[]>> => {
  if (tasksNeedingInference.length === 0) {
    return new Map();
  }

  const taskDescriptors: TaskDescriptor[] = tasksNeedingInference.map((task) => ({
    taskId: task.tempId,
    description: task.title
  }));

  const suggestions = await inferSkillsForTasks(
    taskDescriptors,
    Array.from(skillsById.values())
  );

  const inferredSkills = new Map<string, number[]>();

  for (const task of tasksNeedingInference) {
    const suggestion = suggestions[task.tempId];

    if (!Array.isArray(suggestion) || suggestion.length === 0) continue;

    const validSkillIds = Array.from(
      new Set(
        suggestion
          .map((value) => Number(value))
          .filter((value) => Number.isInteger(value) && skillsById.has(value))
      )
    );

    if (validSkillIds.length > 0) {
      inferredSkills.set(task.tempId, validSkillIds);
    }
  }

  return inferredSkills;
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

  const skillsById = new Map(skills.map((skill) => [skill.skillId, skill as SkillDescriptor]));

  // Step 1: Collect all tasks that need skill inference BEFORE creating anything
  const tasksNeedingInference = collectTasksNeedingInference(payload);

  // Step 2: Call Gemini to infer skills BEFORE starting transaction
  const inferredSkills = await inferSkillsBeforeCreation(tasksNeedingInference, skillsById);

  // Step 3: Create all tasks with their skills in ONE transaction
  const context: TaskCreationContext = {
    skillsById,
    inferredSkills
  };

  return await prisma.$transaction(async (tx) => {
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
};
