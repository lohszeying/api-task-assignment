BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS tasks (
  task_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  status_id INT NOT NULL,
  developer_id UUID,
  parent_task_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_status
    FOREIGN KEY (status_id)
    REFERENCES task_statuses(status_id)
    ON DELETE RESTRICT,

  CONSTRAINT fk_developer
    FOREIGN KEY (developer_id)
    REFERENCES developers(developer_id)
    ON DELETE SET NULL,

  CONSTRAINT fk_parent_task
    FOREIGN KEY (parent_task_id)
    REFERENCES tasks(task_id)
    ON DELETE CASCADE
);

COMMIT;
