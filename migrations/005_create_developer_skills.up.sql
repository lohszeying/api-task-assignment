BEGIN;

CREATE TABLE IF NOT EXISTS developer_skills (
  developer_id UUID NOT NULL,
  skill_id UUID NOT NULL,
  PRIMARY KEY (developer_id, skill_id),

  CONSTRAINT fk_dev_skill_developer
    FOREIGN KEY (developer_id)
    REFERENCES developers(developer_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_dev_skill_skill
    FOREIGN KEY (skill_id)
    REFERENCES skills(skill_id)
    ON DELETE CASCADE
);

COMMIT;
