BEGIN;

INSERT INTO tasks (task_id, title, status_id, developer_id, parent_task_id) VALUES
  ('60a7aa66-8eed-499b-be7f-78ac158d8094', 'As a visitor, I want to see a responsive homepage so that I can easily navigate on both desktop and mobile devices.', 2, NULL, NULL),
  ('7a5e9113-bbe9-42cc-9ce5-f6035f77461e', 'As a system administrator, I want audit logs of all data access and modifications so that I can ensure compliance with data protection regulations and investigate any security incidents.', 2, NULL, NULL),
  ('b24c93ca-338a-41e3-acd2-6920290a570b', 'As a logged-in user, I want to update my profile information and upload a profile picture so that my account details are accurate and personalized.', 2, NULL, NULL)
ON CONFLICT (task_id) DO NOTHING;

COMMIT;
