import { Request, Response } from 'express';
import {
  fetchAllTasks,
  createTaskWithSubtasks,
  assignDeveloperToTaskService,
  updateTaskStatusService,
  unassignDeveloperFromTaskService
} from '../services/task';
import { handleError } from '../utils/error';

export const getTasks = async (_req: Request, res: Response) => {
  try {
    const tasks = await fetchAllTasks();
    res.json(tasks);
  } catch (error) {
    handleError(error, res, 'Failed to fetch tasks');
  }
};

export const createTask = async (req: Request, res: Response) => {
  try {
    const result = await createTaskWithSubtasks(req.body);
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
  const { statusId } = req.body;

  if (typeof statusId !== 'number' || !Number.isInteger(statusId)) {
    res.status(400).json({ message: 'statusId must be an integer.' });
    return;
  }

  try {
    await updateTaskStatusService(taskId, statusId);
    res.status(204).send();
  } catch (error) {
    handleError(error, res, 'Failed to update task status');
  }
};
