import { Request, Response } from 'express';
import {
  fetchTaskHierarchy,
  createTaskWithSubtasks,
  assignDeveloperToTaskService,
  updateTaskStatusService
} from '../services/taskService';
import { HttpError } from '../services/errors';

const extractParentTaskId = (req: Request): string | null => {
  const paramId = typeof req.params.taskId === 'string' ? req.params.taskId : undefined;
  const bodyId =
    req.body && typeof (req.body as Record<string, unknown>).parentTaskId === 'string'
      ? ((req.body as Record<string, unknown>).parentTaskId as string)
      : undefined;

  return paramId || bodyId || null;
};

const handleError = (error: unknown, res: Response, fallbackMessage: string) => {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ message: error.message });
  }

  console.error(fallbackMessage, error);
  return res.status(500).json({ message: fallbackMessage });
};

export const getTasks = async (_req: Request, res: Response) => {
  try {
    const tasks = await fetchTaskHierarchy();
    res.json(tasks);
  } catch (error) {
    handleError(error, res, 'Failed to fetch tasks');
  }
};

export const createTask = async (req: Request, res: Response) => {
  const parentTaskId = extractParentTaskId(req);

  try {
    const result = await createTaskWithSubtasks(req.body, parentTaskId);
    res.status(201).json(result);
  } catch (error) {
    handleError(error, res, 'Failed to create task.');
  }
};

export const assignDeveloperToTask = async (req: Request, res: Response) => {
  const { taskId } = req.params;
  const developerId =
    typeof (req.body as Record<string, unknown>)?.developerId === 'string'
      ? ((req.body as Record<string, unknown>).developerId as string)
      : undefined;

  try {
    await assignDeveloperToTaskService(taskId, developerId);
    res.status(204).send();
  } catch (error) {
    handleError(error, res, 'Failed to assign developer to task');
  }
};

export const updateTaskStatus = async (req: Request, res: Response) => {
  const { taskId } = req.params;
  const statusId = (req.body as Record<string, unknown>)?.statusId as
    | number
    | string
    | undefined;

  try {
    await updateTaskStatusService(taskId, statusId);
    res.status(204).send();
  } catch (error) {
    handleError(error, res, 'Failed to update task status');
  }
};
