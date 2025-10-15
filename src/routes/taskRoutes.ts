import { Router } from 'express';
import {
  getTasks,
  assignDeveloperToTask,
  updateTaskStatus,
  createTask,
  unassignDeveloperFromTask
} from '../controllers/taskController';

const router = Router();

router.get('/', getTasks);
router.post('/', createTask);
router.post('/:taskId', createTask);
router.patch('/:taskId/developer', assignDeveloperToTask);
router.delete('/:taskId/developer', unassignDeveloperFromTask);
router.patch('/:taskId/status', updateTaskStatus);

export default router;
