-- Migration: Add quiet hours columns to notification_preferences
-- Date: 2026-01-31

-- Add quiet hours columns
ALTER TABLE notification_preferences 
ADD COLUMN IF NOT EXISTS quiet_hours_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS quiet_hours_start TIME DEFAULT '23:00',
ADD COLUMN IF NOT EXISTS quiet_hours_end TIME DEFAULT '08:00';

-- Comment
COMMENT ON COLUMN notification_preferences.quiet_hours_enabled IS 'Enable quiet hours (do not disturb)';
COMMENT ON COLUMN notification_preferences.quiet_hours_start IS 'Quiet hours start time (HH:MM)';
COMMENT ON COLUMN notification_preferences.quiet_hours_end IS 'Quiet hours end time (HH:MM)';
