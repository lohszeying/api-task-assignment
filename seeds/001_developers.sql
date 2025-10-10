BEGIN;

INSERT INTO developers (developer_id, developer_name) VALUES
  ('537b1b67-b1b4-452f-96ad-8078044264b9', 'Alice'),
  ('445a91f0-83bf-417c-8715-aac52a0fe9a8', 'Bob'),
  ('aa9beae9-336d-46ce-aafb-74c88992a568', 'Carol'),
  ('be54b438-4e63-4d41-9e89-cce388e28201', 'Dave')
ON CONFLICT (developer_id) DO NOTHING;

COMMIT;
