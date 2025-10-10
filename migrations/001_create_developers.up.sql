BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS developers (
  developer_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  developer_name VARCHAR(255) NOT NULL
);

COMMIT;
