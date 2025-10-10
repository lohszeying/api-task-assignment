BEGIN;

INSERT INTO developer_skills (developer_id, skill_id) VALUES
  ('537b1b67-b1b4-452f-96ad-8078044264b9', 1),
  ('445a91f0-83bf-417c-8715-aac52a0fe9a8', 2),
  ('aa9beae9-336d-46ce-aafb-74c88992a568', 1),
  ('aa9beae9-336d-46ce-aafb-74c88992a568', 2),
  ('be54b438-4e63-4d41-9e89-cce388e28201', 2)
ON CONFLICT (developer_id, skill_id) DO NOTHING;

COMMIT;
