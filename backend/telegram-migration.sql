-- Telegram Tables Migration
-- Extract from backend/schema.sql (lines 90-269)

-- ====================================================================
-- TELEGRAM NOTIFICATIONS SYSTEM
-- ====================================================================

-- Subscription requests (clients request activation)
CREATE TABLE IF NOT EXISTS notification_subscription_requests (
  id SERIAL PRIMARY KEY,
  shop_inn TEXT NOT NULL REFERENCES registrations(shop_inn) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  client_comment TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  admin_comment TEXT,
  subscription_id INTEGER
);

-- Ensure only one pending request per INN
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_requests_pending 
  ON notification_subscription_requests(shop_inn, status) 
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_subscription_requests_status 
  ON notification_subscription_requests(status, requested_at);

-- Active subscriptions
CREATE TABLE IF NOT EXISTS notification_subscriptions (
  id SERIAL PRIMARY KEY,
  shop_inn TEXT NOT NULL REFERENCES registrations(shop_inn) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'expired', 'cancelled'
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  approved_by TEXT,
  approved_at TIMESTAMPTZ DEFAULT NOW(),
  payment_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_shop_inn 
  ON notification_subscriptions(shop_inn);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status 
  ON notification_subscriptions(status, expires_at);

-- Notification preferences for each subscription
CREATE TABLE IF NOT EXISTS notification_preferences (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER NOT NULL REFERENCES notification_subscriptions(id) ON DELETE CASCADE,
  severity_filter VARCHAR(20) DEFAULT 'DANGER', -- 'INFO', 'WARN', 'DANGER', 'CRITICAL'
  notify_on_recovery BOOLEAN DEFAULT true,
  notify_on_stale BOOLEAN DEFAULT true,
  notify_on_return BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_preferences_subscription 
  ON notification_preferences(subscription_id);

-- Telegram connections
CREATE TABLE IF NOT EXISTS telegram_connections (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER NOT NULL REFERENCES notification_subscriptions(id) ON DELETE CASCADE,
  telegram_chat_id BIGINT NOT NULL,
  telegram_chat_type VARCHAR(20), -- 'private', 'group', 'supergroup'
  telegram_chat_title TEXT,
  is_active BOOLEAN DEFAULT true,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_notification_at TIMESTAMPTZ
);

-- Only one active connection per subscription
CREATE UNIQUE INDEX IF NOT EXISTS idx_telegram_connections_active 
  ON telegram_connections(subscription_id) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_telegram_connections_chat_id 
  ON telegram_connections(telegram_chat_id);

-- Telegram connect codes (one-time use)
CREATE TABLE IF NOT EXISTS telegram_connect_codes (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER NOT NULL REFERENCES notification_subscriptions(id) ON DELETE CASCADE,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  telegram_chat_id BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_connect_codes_code 
  ON telegram_connect_codes(code) 
  WHERE used = false AND expires_at > NOW();

CREATE INDEX IF NOT EXISTS idx_connect_codes_subscription 
  ON telegram_connect_codes(subscription_id, created_at);

-- Notification queue
CREATE TABLE IF NOT EXISTS notification_queue (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER NOT NULL REFERENCES notification_subscriptions(id) ON DELETE CASCADE,
  state_key TEXT NOT NULL,
  severity VARCHAR(20),
  event_type VARCHAR(50), -- 'new_terminal', 'severity_change', 'new_alert', 'stale', 'return'
  alert_summary TEXT,
  shop_number INTEGER,
  pos_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_notification_queue_subscription 
  ON notification_queue(subscription_id, processed, created_at);

-- Notification history (sent messages)
CREATE TABLE IF NOT EXISTS notification_history (
  id SERIAL PRIMARY KEY,
  connection_id INTEGER REFERENCES telegram_connections(id) ON DELETE SET NULL,
  subscription_id INTEGER NOT NULL REFERENCES notification_subscriptions(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  alerts_count INTEGER DEFAULT 1,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  telegram_message_id BIGINT,
  delivered BOOLEAN DEFAULT true,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_notification_history_connection 
  ON notification_history(connection_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_notification_history_subscription 
  ON notification_history(subscription_id, sent_at);

-- Notification cooldowns (anti-spam)
CREATE TABLE IF NOT EXISTS notification_cooldowns (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER NOT NULL REFERENCES notification_subscriptions(id) ON DELETE CASCADE,
  state_key TEXT NOT NULL,
  last_notified_at TIMESTAMPTZ DEFAULT NOW(),
  last_severity VARCHAR(20),
  last_alert_hash TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cooldowns_lookup 
  ON notification_cooldowns(subscription_id, state_key);

-- Comments
COMMENT ON TABLE notification_subscription_requests IS 'Client requests for Telegram notification subscriptions';
COMMENT ON TABLE notification_subscriptions IS 'Active Telegram notification subscriptions';
COMMENT ON TABLE notification_preferences IS 'Notification preferences per subscription';
COMMENT ON TABLE telegram_connections IS 'Active Telegram bot connections';
COMMENT ON TABLE telegram_connect_codes IS 'One-time codes for Telegram bot connection';
COMMENT ON TABLE notification_queue IS 'Queue of pending notifications';
COMMENT ON TABLE notification_history IS 'History of sent Telegram notifications';
COMMENT ON TABLE notification_cooldowns IS 'Anti-spam cooldown tracking';
