BEGIN;

CREATE TABLE IF NOT EXISTS task_skills (
  task_id UUID NOT NULL,
  skill_id UUID NOT NULL,
  PRIMARY KEY (task_id, skill_id),

  CONSTRAINT fk_task_skill_task
    FOREIGN KEY (task_id)
    REFERENCES tasks(task_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_task_skill_skill
    FOREIGN KEY (skill_id)
    REFERENCES skills(skill_id)
    ON DELETE CASCADE
);

COMMIT;
