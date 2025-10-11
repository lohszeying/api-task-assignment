import { Router } from 'express';
import { checkDatabaseHealth, getApiStatus, getGemini } from '../controllers/healthController';

const router = Router();

router.get('/', getApiStatus);
router.get('/db-health', checkDatabaseHealth);
router.get('/gemini', getGemini)

export default router;
