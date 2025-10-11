BEGIN;

INSERT INTO tasks (task_id, title, status_id, developer_id, parent_task_id, created_at, updated_at) VALUES
  ('60a7aa66-8eed-499b-be7f-78ac158d8094', 'As a visitor, I want to see a responsive homepage so that I can easily navigate on both desktop and mobile devices.', 2, '537b1b67-b1b4-452f-96ad-8078044264b9', NULL, TIMESTAMPTZ '2024-02-01 09:00:00+00', TIMESTAMPTZ '2024-02-01 09:00:00+00'),
  ('7a5e9113-bbe9-42cc-9ce5-f6035f77461e', 'As a system administrator, I want audit logs of all data access and modifications so that I can ensure compliance with data protection regulations and investigate any security incidents.', 2, NULL, NULL, TIMESTAMPTZ '2024-02-01 09:00:01+00', TIMESTAMPTZ '2024-02-01 09:00:01+00'),
  ('b24c93ca-338a-41e3-acd2-6920290a570b', 'As a logged-in user, I want to update my profile information and upload a profile picture so that my account details are accurate and personalized.', 2, NULL, NULL, TIMESTAMPTZ '2024-02-01 09:00:02+00', TIMESTAMPTZ '2024-02-01 09:00:02+00'),
  ('3f1adce8-67a4-42cc-a3d1-57e43ac5f079', 'Subtask 1', 3, NULL, '60a7aa66-8eed-499b-be7f-78ac158d8094', TIMESTAMPTZ '2024-02-01 09:00:03+00', TIMESTAMPTZ '2024-02-01 09:00:03+00'),
  ('94d53968-af99-4bc1-9e98-a9d46a40d738', 'Subtask 1.1', 3, NULL, '3f1adce8-67a4-42cc-a3d1-57e43ac5f079', TIMESTAMPTZ '2024-02-01 09:00:04+00', TIMESTAMPTZ '2024-02-01 09:00:04+00'),
  ('5adc6e1f-02fb-4172-815d-3027b2aafbd5', 'Subtask 2', 3, NULL, '60a7aa66-8eed-499b-be7f-78ac158d8094', TIMESTAMPTZ '2024-02-01 09:00:05+00', TIMESTAMPTZ '2024-02-01 09:00:05+00')
ON CONFLICT (task_id) DO NOTHING;

COMMIT;
