BEGIN;

DROP INDEX IF EXISTS idx_task_skills_skill_id;

DROP TABLE IF EXISTS task_skills;

COMMIT;
