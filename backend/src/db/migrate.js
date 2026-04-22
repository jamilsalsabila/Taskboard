import { pool } from './pool.js';

const migrationSql = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
    CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(180) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  assignee VARCHAR(120) NOT NULL DEFAULT 'Unassigned',
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  status task_status NOT NULL DEFAULT 'todo',
  due_date TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author VARCHAR(120) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(60) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(80) NOT NULL,
  created_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sticky_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NULL,
  title VARCHAR(120) NOT NULL DEFAULT 'Sticky',
  content TEXT NOT NULL DEFAULT '',
  color CHAR(7) NOT NULL,
  x INTEGER NOT NULL CHECK (x >= 0),
  y INTEGER NOT NULL CHECK (y >= 0),
  width INTEGER NOT NULL CHECK (width >= 140),
  height INTEGER NOT NULL CHECK (height >= 120),
  z_index INTEGER NOT NULL DEFAULT 1 CHECK (z_index >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE sticky_notes
  ADD COLUMN IF NOT EXISTS board_id UUID;

INSERT INTO boards (name)
SELECT 'General'
WHERE NOT EXISTS (SELECT 1 FROM boards);

UPDATE sticky_notes
SET board_id = (SELECT id FROM boards ORDER BY created_at ASC LIMIT 1)
WHERE board_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'sticky_notes'
      AND constraint_name = 'sticky_notes_board_id_fkey'
  ) THEN
    ALTER TABLE sticky_notes
      ADD CONSTRAINT sticky_notes_board_id_fkey
      FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE;
  END IF;
END
$$;

ALTER TABLE sticky_notes
  ALTER COLUMN board_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee);
CREATE INDEX IF NOT EXISTS idx_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
CREATE INDEX IF NOT EXISTS idx_boards_created_at ON boards(created_at);
CREATE INDEX IF NOT EXISTS idx_sticky_notes_board_id ON sticky_notes(board_id);
CREATE INDEX IF NOT EXISTS idx_sticky_notes_z_index ON sticky_notes(z_index);
CREATE INDEX IF NOT EXISTS idx_sticky_notes_updated_at ON sticky_notes(updated_at DESC);
`;

try {
  await pool.query(migrationSql);
  console.log('Migration completed successfully.');
} catch (error) {
  console.error('Migration failed:', error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
