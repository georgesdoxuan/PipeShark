-- Add status column to todos: todo, doing, done
ALTER TABLE todos ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'todo';

-- Migrate existing completed -> status
UPDATE todos SET status = 'done' WHERE completed = true;
