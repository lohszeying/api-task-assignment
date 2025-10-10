import { Router } from 'express';
import { checkDatabaseHealth, getApiStatus } from '../controllers/healthController';

const router = Router();

router.get('/', getApiStatus);
router.get('/db-health', checkDatabaseHealth);

export default router;
