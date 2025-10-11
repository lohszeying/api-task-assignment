import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../db/client';
import {
  inferSkillsForTasks,
  SkillDescriptor,
  TaskDescriptor
} from '../client/geminiClient';

interface Developer {
  name: string;
  id: string;
}

interface TaskSummary {
  taskId: string;
  title: string;
  skills: string[];
  status: string;
  developer?: Developer;
  subtasks?: TaskSummary[];
}

interface TaskCreationPayload {
  title?: string;
  skills?: string[];
  developerId?: string;
  subtasks?: TaskCreationPayload[];
}

interface TaskSkillOutput {
  skillId: number;
  skillName: string;
}

interface CreatedTaskResult {
  taskId: string;
  title: string;
  statusId: number;
  developerId: string | null;
  skills: TaskSkillOutput[];
  subtasks?: CreatedTaskResult[];
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}

export const getTasks = async (_req: Request, res: Response) => {
  try {
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
        skills: task.skills.map(({ skill }) => skill.skillName),
        status: task.status.statusName,
        developer: task.developer ? {name: task.developer.developerName, id: task.developer.developerId} : undefined
      });
    }

    for (const task of tasks) {
      const summary = taskMap.get(task.taskId);
      if (!summary) {
        continue;
      }

      if (task.parentTaskId) {
        const parentSummary = taskMap.get(task.parentTaskId);
        if (parentSummary) {
          if (!parentSummary.subtasks) {
            parentSummary.subtasks = [];
          }
          parentSummary.subtasks.push(summary);
        }
      } else {
        roots.push(summary);
      }
    }

    res.json(roots);
  } catch (error) {
    console.error('Failed to fetch tasks', error);
    res.status(500).json({ message: 'Failed to fetch tasks' });
  }
};

export const assignDeveloperToTask = async (req: Request, res: Response) => {
  const { taskId } = req.params;
  const { developerId } = req.body as { developerId?: string };

  if (!developerId || typeof developerId !== 'string' || developerId.trim().length === 0) {
    return res.status(400).json({ message: 'developerId is required.' });
  }

  try {
    const task = await prisma.task.findUnique({
      where: { taskId },
      include: {
        skills: {
          select: { skillId: true }
        }
      }
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    const requiredSkillIds = task.skills.map((skill) => skill.skillId);

    if (requiredSkillIds.length === 0) {
      await prisma.task.update({
        where: { taskId },
        data: { developerId }
      });

      return res.status(204).send();
    }

    const developer = await prisma.developer.findUnique({
      where: { developerId },
      include: {
        skills: {
          select: { skillId: true }
        }
      }
    });

    if (!developer) {
      return res.status(404).json({ message: 'Developer not found.' });
    }

    const developerSkillIds = developer.skills.map((skill) => skill.skillId);
    const hasAllSkills = requiredSkillIds.every((skillId) => developerSkillIds.includes(skillId));

    if (!hasAllSkills) {
      return res.status(400).json({
        message: 'Developer does not have all skills required for this task.'
      });
    }

    await prisma.task.update({
      where: { taskId },
      data: { developerId }
    });

    return res.status(204).send();
  } catch (error) {
    console.error('Failed to assign developer to task', error);
    return res.status(500).json({ message: 'Failed to assign developer to task' });
  }
};

const BACKLOG_STATUS_ID = 1;
const DONE_STATUS_ID = 5;

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

  const skillNames = Array.isArray(payload.skills)
    ? Array.from(
        new Set(
          payload.skills
            .map((skill) => (typeof skill === 'string' ? skill.trim() : ''))
            .filter((skill) => skill.length > 0)
        )
      )
    : [];

  const matchedSkills: SkillDescriptor[] = [];
  const missingSkills: string[] = [];

  for (const skillName of skillNames) {
    const match = context.skillsByName.get(skillName.toLowerCase());
    if (match) {
      matchedSkills.push(match);
    } else {
      missingSkills.push(skillName);
    }
  }

  if (missingSkills.length > 0) {
    throw new HttpError(400, `Unknown skills: ${missingSkills.join(', ')}`);
  }

  let developerId: string | null =
    typeof payload.developerId === 'string' && payload.developerId.trim().length > 0
      ? payload.developerId.trim()
      : null;

  if (developerId && matchedSkills.length === 0) {
    throw new HttpError(400, 'Cannot assign a developer when skills are not specified.');
  }

  if (developerId) {
    const developer = await tx.developer.findUnique({
      where: { developerId },
      include: {
        skills: {
          select: { skillId: true }
        }
      }
    });

    if (!developer) {
      throw new HttpError(404, 'Developer not found.');
    }

    const requiredSkillIds = matchedSkills.map((record) => record.skillId);
    const developerSkillIds = developer.skills.map((skill) => skill.skillId);

    const hasAllSkills = requiredSkillIds.every((skillId) =>
      developerSkillIds.includes(skillId)
    );

    if (!hasAllSkills) {
      throw new HttpError(
        400,
        'Developer does not have all skills required for this task.'
      );
    }
  }

  const task = await tx.task.create({
    data: {
      title,
      statusId: BACKLOG_STATUS_ID,
      developerId,
      parentTaskId
    }
  });

  context.createdTaskIds.push(task.taskId);

  if (matchedSkills.length > 0) {
    await tx.taskSkill.createMany({
      data: matchedSkills.map((record) => ({
        taskId: task.taskId,
        skillId: record.skillId
      })),
      skipDuplicates: true
    });
  }

  const subtaskPayloads = Array.isArray(payload.subtasks) ? payload.subtasks : [];
  const subtaskResults: CreatedTaskResult[] = [];

  for (const subtaskPayload of subtaskPayloads) {
    if (!subtaskPayload || typeof subtaskPayload !== 'object') {
      throw new HttpError(400, 'Invalid subtask payload.');
    }
    const subtaskResult = await createTaskRecursive(
      subtaskPayload,
      task.taskId,
      tx,
      context
    );
    subtaskResults.push(subtaskResult);
  }

  const taskResult: CreatedTaskResult = {
    taskId: task.taskId,
    title: task.title,
    statusId: task.statusId,
    developerId: task.developerId ?? null,
    skills: matchedSkills.map(({ skillId, skillName }) => ({ skillId, skillName })),
    subtasks: subtaskResults.length > 0 ? subtaskResults : undefined
  };

  if (matchedSkills.length === 0) {
    context.tasksNeedingInference.push({
      taskId: task.taskId,
      title: task.title,
      resultRef: taskResult
    });
  }

  return taskResult;
};

export const createTask = async (req: Request, res: Response) => {
  const parentTaskIdParam = typeof req.params.taskId === 'string' ? req.params.taskId : undefined;
  const parentTaskIdBody =
    typeof req.body?.parentTaskId === 'string' ? req.body.parentTaskId : undefined;

  const parentTaskId = parentTaskIdParam || parentTaskIdBody || null;

  const payload = req.body as TaskCreationPayload | undefined;

  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ message: 'Request body must be an object.' });
  }

  try {
    const skills = await prisma.skill.findMany({
      select: { skillId: true, skillName: true }
    });

    const skillsByName = new Map(
      skills.map((skill) => [skill.skillName.toLowerCase(), skill as SkillDescriptor])
    );

    const skillsById = new Map(
      skills.map((skill) => [skill.skillId, skill as SkillDescriptor])
    );

    const context: TaskCreationContext = {
      skillsByName,
      skillsById,
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

    if (context.tasksNeedingInference.length > 0) {
      try {
        const suggestions = await inferSkillsForTasks(
          context.tasksNeedingInference.map<TaskDescriptor>(({ taskId, title }) => ({
            taskId,
            description: title
          })),
          skills
        );

        const insertData: { taskId: string; skillId: number }[] = [];

        for (const pending of context.tasksNeedingInference) {
          const suggestedSkillIds = suggestions[pending.taskId];

          if (!Array.isArray(suggestedSkillIds) || suggestedSkillIds.length === 0) {
            continue;
          }

          const validSkills = Array.from(
            new Set(
              suggestedSkillIds
                .map((value) => Number(value))
                .filter((value) => Number.isInteger(value) && context.skillsById.has(value))
            )
          );

          if (validSkills.length === 0) {
            continue;
          }

          pending.resultRef.skills = validSkills.map((skillId) => {
            const skill = context.skillsById.get(skillId)!;
            return { skillId: skill.skillId, skillName: skill.skillName };
          });

          for (const skillId of validSkills) {
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

        console.error('Failed to infer skills for tasks', error);
        return res
          .status(500)
          .json({ message: 'Failed to automatically assign skills to tasks.' });
      }
    }

    return res.status(201).json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error('Failed to create task', error);
    return res.status(500).json({ message: 'Failed to create task.' });
  }
};

export const updateTaskStatus = async (req: Request, res: Response) => {
  const { taskId } = req.params;
  const { statusId } = req.body as { statusId?: number | string };

  if (statusId === undefined || statusId === null) {
    return res.status(400).json({ message: 'statusId is required.' });
  }

  if (
    !(
      typeof statusId === 'number' && Number.isInteger(statusId)
    ) &&
    !(/^[0-9]+$/.test(String(statusId).trim()))
  ) {
    return res.status(400).json({ message: 'statusId must be an integer.' });
  }

  const numericStatusId =
    typeof statusId === 'number' ? statusId : Number(String(statusId).trim());

  const statusRecord = await prisma.taskStatus.findUnique({
    where: { statusId: numericStatusId }
  });

  if (!statusRecord) {
    return res.status(404).json({ message: 'Status not found.' });
  }

  const task = await prisma.task.findUnique({
    where: { taskId },
    select: { taskId: true }
  });

  if (!task) {
    return res.status(404).json({ message: 'Task not found.' });
  }

  if (statusRecord.statusId === DONE_STATUS_ID) {
    const [result] = await prisma.$queryRaw<{ pending_count: bigint }[]>(Prisma.sql`
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
      WHERE task_id <> ${taskId}::uuid AND status_id <> ${DONE_STATUS_ID};
    `);

    const pendingCount = Number(result?.pending_count ?? 0);

    if (pendingCount > 0) {
      return res.status(400).json({
        message: 'Cannot mark task as Done until all subtasks are Done.'
      });
    }
  }

  await prisma.task.update({
    where: { taskId },
    data: { statusId: statusRecord.statusId }
  });

  return res.status(204).send();
};
