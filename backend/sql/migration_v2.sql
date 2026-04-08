-- Run on existing database if upgrading from previous version

-- Add phone column
ALTER TABLE users ADD COLUMN phone VARCHAR(30) DEFAULT NULL AFTER display_name;

-- Add topic column (if not already added)
ALTER TABLE sessions ADD COLUMN topic VARCHAR(100) DEFAULT NULL AFTER outcome;
ALTER TABLE sessions ADD INDEX idx_topic (topic);

-- Backfill
UPDATE sessions SET topic = 'General' WHERE topic IS NULL;
