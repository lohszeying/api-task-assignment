import { Router } from 'express';
import { getDevelopers } from '../controllers/developerController';

const router = Router();

router.get('/', getDevelopers);

export default router;
