import { Router } from 'express';
import { getStatuses } from '../controllers/statusController';

const router = Router();

router.get('/', getStatuses);

export default router;
