import { Prisma } from '@prisma/client';
import { prisma } from '../db/client';
import {
  inferSkillsForTasks,
  SkillDescriptor,
  TaskDescriptor
} from '../client/geminiClient';
import { HttpError } from './errors';
import type { CreatedTaskResult, TaskDetails, TaskSummary } from '../responseParam/task';

enum TaskStatusIds {
  Backlog = 1,
  Done = 5
}

export interface TaskCreationPayload {
  title?: string;
  skills?: string[];
  subtasks?: TaskCreationPayload[];
}

export const fetchTaskHierarchy = async (): Promise<TaskSummary[]> => {
  const tasks = await prisma.task.findMany({
    include: {
      skills: { include: { skill: true } },
      status: true,
      developer: true
    },
    orderBy: [{ createdAt: 'asc' }]
  });

  const taskMap = new Map<string, TaskSummary>();
  const roots: TaskSummary[] = [];

  for (const task of tasks) {
    taskMap.set(task.taskId, {
      taskId: task.taskId,
      title: task.title,
      skills: task.skills.map(({ skillId, skill }) => ({
        skillId,
        skillName: skill.skillName
      })),
      status: task.status.statusName,
      developer: task.developer
        ? { developerId: task.developer.developerId, developerName: task.developer.developerName }
        : undefined
    });
  }

  for (const task of tasks) {
    const summary = taskMap.get(task.taskId);
    if (!summary) continue;

    if (task.parentTaskId) {
      const parent = taskMap.get(task.parentTaskId);
      if (!parent) continue;
      if (!parent.subtasks) parent.subtasks = [];
      parent.subtasks.push(summary);
    } else {
      roots.push(summary);
    }
  }

  return roots;
};

interface TaskCreationContext {
  skillsByName: Map<string, SkillDescriptor>;
  skillsById: Map<number, SkillDescriptor>;
  tasksNeedingInference: Array<{
    taskId: string;
    title: string;
    resultRef: CreatedTaskResult;
  }>;
  createdTaskIds: string[];
}

const normaliseSkills = (
  skills: string[] | undefined,
  context: TaskCreationContext
): SkillDescriptor[] => {
  if (!Array.isArray(skills)) return [];

  const unique = Array.from(
    new Set(
      skills
        .map((skill) => (typeof skill === 'string' ? skill.trim() : ''))
        .filter((skill) => skill.length > 0)
    )
  );

  const matched: SkillDescriptor[] = [];
  const missing: string[] = [];

  for (const name of unique) {
    const descriptor = context.skillsByName.get(name.toLowerCase());
    if (descriptor) matched.push(descriptor);
    else missing.push(name);
  }

  if (missing.length > 0) {
    throw new HttpError(400, `Unknown skills: ${missing.join(', ')}`);
  }

  return matched;
};

const createTaskRecursive = async (
  payload: TaskCreationPayload,
  parentTaskId: string | null,
  tx: Prisma.TransactionClient,
  context: TaskCreationContext
): Promise<CreatedTaskResult> => {
  if (!payload || typeof payload !== 'object') {
    throw new HttpError(400, 'Invalid task payload.');
  }

  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  if (!title) {
    throw new HttpError(400, 'Task title is required.');
  }

  const matchedSkills = normaliseSkills(payload.skills, context);

  const task = await tx.task.create({
    data: {
      title,
      statusId: TaskStatusIds.Backlog,
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
    const child = await createTaskRecursive(subtaskPayload, task.taskId, tx, context);
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

const enrichTasksWithGemini = async (context: TaskCreationContext) => {
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
    skillsByName: new Map(
      skills.map((skill) => [skill.skillName.toLowerCase(), skill as SkillDescriptor])
    ),
    skillsById: new Map(
      skills.map((skill) => [skill.skillId, skill as SkillDescriptor])
    ),
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

  await enrichTasksWithGemini(context);

  return result;
};

export const assignDeveloperToTaskService = async (
  taskId: string,
  developerId: string | undefined
): Promise<void> => {
  const developerIdClean = developerId?.trim();
  if (!developerIdClean) {
    throw new HttpError(400, 'developerId is required.');
  }

  const task = await prisma.task.findUnique({
    where: { taskId },
    include: { skills: { select: { skillId: true } } }
  });

  if (!task) {
    throw new HttpError(404, 'Task not found.');
  }

  const requiredSkillIds = task.skills.map((skill) => skill.skillId);
  if (requiredSkillIds.length === 0) {
    await prisma.task.update({
      where: { taskId },
      data: { developerId: developerIdClean }
    });
    return;
  }

  const developer = await prisma.developer.findUnique({
    where: { developerId: developerIdClean },
    include: { skills: { select: { skillId: true } } }
  });

  if (!developer) {
    throw new HttpError(404, 'Developer not found.');
  }

  const developerSkillIds = developer.skills.map((skill) => skill.skillId);
  const hasAllSkills = requiredSkillIds.every((skillId) =>
    developerSkillIds.includes(skillId)
  );

  if (!hasAllSkills) {
    throw new HttpError(400, 'Developer does not have all skills required for this task.');
  }

  await prisma.task.update({
    where: { taskId },
    data: { developerId: developerIdClean }
  });
};

export const updateTaskStatusService = async (
  taskId: string,
  statusId: number | string | undefined
): Promise<void> => {
  if (statusId === undefined || statusId === null) {
    throw new HttpError(400, 'statusId is required.');
  }

  if (
    !(typeof statusId === 'number' && Number.isInteger(statusId)) &&
    !/^[0-9]+$/.test(String(statusId).trim())
  ) {
    throw new HttpError(400, 'statusId must be an integer.');
  }

  const numericStatusId =
    typeof statusId === 'number' ? statusId : Number(String(statusId).trim());

  const statusRecord = await prisma.taskStatus.findUnique({
    where: { statusId: numericStatusId }
  });

  if (!statusRecord) {
    throw new HttpError(404, 'Status not found.');
  }

  const taskExists = await prisma.task.findUnique({
    where: { taskId },
    select: { taskId: true }
  });

  if (!taskExists) {
    throw new HttpError(404, 'Task not found.');
  }

  if (statusRecord.statusId === TaskStatusIds.Done) {
    const [result] = await prisma.$queryRaw<{ pending_count: bigint }[]>(
      Prisma.sql`
        WITH RECURSIVE descendants AS (
          SELECT task_id, status_id
          FROM tasks
          WHERE task_id = ${taskId}::uuid
          UNION ALL
          SELECT t.task_id, t.status_id
          FROM tasks t
          INNER JOIN descendants d ON t.parent_task_id = d.task_id
        )
        SELECT COUNT(*)::bigint AS pending_count
        FROM descendants
        WHERE task_id <> ${taskId}::uuid AND status_id <> ${TaskStatusIds.Done};
      `
    );

    const pendingCount = Number(result?.pending_count ?? 0);
    if (pendingCount > 0) {
      throw new HttpError(400, 'Cannot mark task as Done until all subtasks are Done.');
    }
  }

  await prisma.task.update({
    where: { taskId },
    data: { statusId: statusRecord.statusId }
  });
};

export const fetchTaskWithNeighbors = async (taskId: string): Promise<TaskDetails> => {
  const task = await prisma.task.findUnique({
    where: { taskId },
    include: {
      status: true,
      developer: true,
      skills: { include: { skill: true } },
      parent: {
        select: {
          taskId: true,
          title: true,
          status: { select: { statusName: true } }
        }
      },
      children: {
        select: {
          taskId: true,
          title: true,
          status: { select: { statusName: true } }
        },
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  if (!task) {
    throw new HttpError(404, 'Task not found.');
  }

  return {
    taskId: task.taskId,
    title: task.title,
    status: task.status.statusName,
    skills: task.skills.map(({ skill }) => skill.skillName),
    developer: task.developer
      ? { developerId: task.developer.developerId, developerName: task.developer.developerName }
      : null,
    parent: task.parent
      ? {
          taskId: task.parent.taskId,
          title: task.parent.title,
          status: task.parent.status?.statusName ?? 'Unknown'
        }
      : undefined,
    children:
      task.children.length > 0
        ? task.children.map((child) => ({
            taskId: child.taskId,
            title: child.title,
            status: child.status?.statusName ?? 'Unknown'
          }))
        : undefined
  };
};
