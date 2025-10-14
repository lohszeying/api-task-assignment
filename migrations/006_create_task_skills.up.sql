BEGIN;

CREATE TABLE IF NOT EXISTS task_skills (
  task_id UUID NOT NULL,
  skill_id INT NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_task_skills_skill_id ON task_skills (skill_id);

COMMIT;
