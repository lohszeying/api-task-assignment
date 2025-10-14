BEGIN;

DROP INDEX IF EXISTS idx_tasks_status_id;
DROP INDEX IF EXISTS idx_tasks_developer_id;
DROP INDEX IF EXISTS idx_tasks_parent_task_id;

DROP TABLE IF EXISTS tasks;

COMMIT;
