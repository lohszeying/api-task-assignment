BEGIN;

INSERT INTO skills (skill_id, skill_name) VALUES
  (1, 'Frontend'),
  (2, 'Backend')
ON CONFLICT (skill_id) DO NOTHING;

COMMIT;
