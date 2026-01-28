-- Migration: Telegram notification system fixes
-- Date: 2026-01-28
-- Description: Fix severity_filter type, add missing indexes, allow multiple connections per subscription

-- 1. Fix severity_filter type if it was created as VARCHAR
DO $$
BEGIN
  -- Check if column exists and is wrong type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notification_preferences' 
    AND column_name = 'severity_filter'
    AND data_type = 'character varying'
  ) THEN
    -- Convert VARCHAR to TEXT[]
    ALTER TABLE notification_preferences
    ALTER COLUMN severity_filter TYPE TEXT[] 
    USING CASE 
      WHEN severity_filter IS NULL THEN ARRAY['DANGER', 'CRITICAL']::TEXT[]
      WHEN severity_filter = 'CRITICAL' THEN ARRAY['CRITICAL']::TEXT[]
      WHEN severity_filter = 'DANGER' THEN ARRAY['DANGER', 'CRITICAL']::TEXT[]
      WHEN severity_filter = 'WARN' THEN ARRAY['WARN', 'DANGER', 'CRITICAL']::TEXT[]
      WHEN severity_filter = 'INFO' THEN ARRAY['INFO', 'WARN', 'DANGER', 'CRITICAL']::TEXT[]
      ELSE ARRAY['DANGER', 'CRITICAL']::TEXT[]
    END;
    
    -- Set default
    ALTER TABLE notification_preferences
    ALTER COLUMN severity_filter SET DEFAULT ARRAY['DANGER', 'CRITICAL'];
    
    RAISE NOTICE 'Fixed severity_filter column type';
  ELSE
    RAISE NOTICE 'severity_filter already has correct type';
  END IF;
END $$;

-- 2. Add telegram_username column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'telegram_connections' 
    AND column_name = 'telegram_username'
  ) THEN
    ALTER TABLE telegram_connections ADD COLUMN telegram_username VARCHAR(255);
    RAISE NOTICE 'Added telegram_username column';
  END IF;
END $$;

-- 3. Drop old unique constraint that limited to 1 connection per subscription
DO $$
BEGIN
  -- Try to drop the old unique index
  DROP INDEX IF EXISTS idx_telegram_connections_active;
  DROP INDEX IF EXISTS unique_active_connection;
  
  -- Also try dropping constraint if it exists
  BEGIN
    ALTER TABLE telegram_connections DROP CONSTRAINT IF EXISTS unique_active_connection;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Ignore if doesn't exist
  END;
  
  RAISE NOTICE 'Removed old unique constraint on subscription_id';
END $$;

-- 4. Create new index that allows multiple connections per subscription
-- but prevents same chat_id from connecting twice to same subscription
CREATE UNIQUE INDEX IF NOT EXISTS idx_telegram_connections_unique_chat 
  ON telegram_connections(subscription_id, telegram_chat_id) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_telegram_connections_sub 
  ON telegram_connections(subscription_id) 
  WHERE is_active = true;

-- 5. Add missing index for active subscriptions by INN
CREATE INDEX IF NOT EXISTS idx_subscriptions_active_inn 
  ON notification_subscriptions(shop_inn) 
  WHERE status = 'active';

-- 6. Ensure notification_cooldowns has correct unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_cooldown'
  ) THEN
    ALTER TABLE notification_cooldowns
    ADD CONSTRAINT unique_cooldown UNIQUE (subscription_id, state_key);
    RAISE NOTICE 'Added unique_cooldown constraint';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'unique_cooldown constraint may already exist';
END $$;

-- 7. Clean up any orphaned data
DELETE FROM notification_queue WHERE processed = true AND created_at < NOW() - INTERVAL '1 day';
DELETE FROM telegram_connect_codes WHERE expires_at < NOW() - INTERVAL '1 day';

-- 8. Update any NULL severity_filter to default
UPDATE notification_preferences 
SET severity_filter = ARRAY['DANGER', 'CRITICAL']
WHERE severity_filter IS NULL;

RAISE NOTICE 'Migration 001_telegram_fixes completed successfully';
