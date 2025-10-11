import { Router } from 'express';
import { getSkills } from '../controllers/skillController';

const router = Router();

router.get('/', getSkills);

export default router;
