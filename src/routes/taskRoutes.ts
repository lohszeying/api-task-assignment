import { Router } from 'express';
import { getTasks, assignDeveloperToTask } from '../controllers/taskController';

const router = Router();

router.get('/', getTasks);
router.patch('/:taskId/developer', assignDeveloperToTask);

export default router;
