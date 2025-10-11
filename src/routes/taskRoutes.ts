import { Router } from 'express';
import { getTasks, assignDeveloperToTask, updateTaskStatus } from '../controllers/taskController';

const router = Router();

router.get('/', getTasks);
router.patch('/:taskId/developer', assignDeveloperToTask);
router.patch('/:taskId/status', updateTaskStatus);

export default router;
