import { Router } from 'express';
import {
  getTasks,
  getTaskById,
  assignDeveloperToTask,
  updateTaskStatus,
  createTask
} from '../controllers/taskController';

const router = Router();

router.get('/', getTasks);
router.get('/:taskId', getTaskById);
router.post('/', createTask);
router.post('/:taskId', createTask);
router.patch('/:taskId/developer', assignDeveloperToTask);
router.patch('/:taskId/status', updateTaskStatus);

export default router;
