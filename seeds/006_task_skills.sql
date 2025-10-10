BEGIN;

INSERT INTO task_skills (task_id, skill_id) VALUES
  ('60a7aa66-8eed-499b-be7f-78ac158d8094', 1),
  ('7a5e9113-bbe9-42cc-9ce5-f6035f77461e', 2),
  ('b24c93ca-338a-41e3-acd2-6920290a570b', 1),
  ('b24c93ca-338a-41e3-acd2-6920290a570b', 2)
ON CONFLICT (task_id, skill_id) DO NOTHING;

COMMIT;
