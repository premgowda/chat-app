-- Run on existing database to replace phone with campus
ALTER TABLE users DROP COLUMN IF EXISTS phone;
ALTER TABLE users ADD COLUMN campus VARCHAR(100) DEFAULT NULL AFTER display_name;

-- Add campus tracking to sessions
ALTER TABLE sessions ADD COLUMN form_campus_name VARCHAR(100) DEFAULT NULL AFTER topic;
ALTER TABLE sessions ADD COLUMN chat_campus_name VARCHAR(100) DEFAULT NULL AFTER form_campus_name;
