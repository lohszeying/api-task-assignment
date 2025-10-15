import { Request, Response } from 'express';
import {
  fetchAllTasks,
  createTaskWithSubtasks,
  assignDeveloperToTaskService,
  updateTaskStatusService,
  fetchTaskWithTaskId,
  unassignDeveloperFromTaskService
} from '../services/task';
import { handleError } from '../utils/error';

const extractParentTaskId = (req: Request): string | null => {
  const paramId = typeof req.params.taskId === 'string' ? req.params.taskId : undefined;
  const bodyId =
    req.body && typeof (req.body as Record<string, unknown>).parentTaskId === 'string'
      ? ((req.body as Record<string, unknown>).parentTaskId as string)
      : undefined;

  return paramId || bodyId || null;
};

export const getTasks = async (_req: Request, res: Response) => {
  try {
    const tasks = await fetchAllTasks();
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
  const { developerId } = req.body;

  if (typeof developerId !== 'string' || !developerId.trim()) {
    res.status(400).json({ message: 'developerId is required.' });
    return;
  }

  try {
    await assignDeveloperToTaskService(taskId, developerId.trim());
    res.status(204).send();
  } catch (error) {
    handleError(error, res, 'Failed to assign developer to task');
  }
};

export const unassignDeveloperFromTask = async (req: Request, res: Response) => {
  const { taskId } = req.params;

  try {
    await unassignDeveloperFromTaskService(taskId);
    res.status(204).send();
  } catch (error) {
    handleError(error, res, 'Failed to unassign developer from task');
  }
};

export const updateTaskStatus = async (req: Request, res: Response) => {
  const { taskId } = req.params;
  const statusId = (req.body as Record<string, unknown>)?.statusId as number | undefined;

  try {
    await updateTaskStatusService(taskId, statusId);
    res.status(204).send();
  } catch (error) {
    handleError(error, res, 'Failed to update task status');
  }
};

// Note: Currently unused by frontend.
export const getTaskById = async (req: Request, res: Response) => {
  const { taskId } = req.params;

  try {
    const task = await fetchTaskWithTaskId(taskId);
    res.json(task);
  } catch (error) {
    handleError(error, res, 'Failed to fetch task');
  }
};
