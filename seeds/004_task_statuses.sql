BEGIN;

INSERT INTO task_statuses (status_id, status_name) VALUES
  (1, 'Backlog'),
  (2, 'Ready for development'),
  (3, 'Testing'),
  (4, 'PO Review'),
  (5, 'Done')
ON CONFLICT (status_id) DO NOTHING;

COMMIT;
