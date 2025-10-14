BEGIN;

DROP INDEX IF EXISTS idx_tasks_parent_task_id;

DROP TABLE IF EXISTS tasks;

COMMIT;
