-- Fiscal Monitor Database Schema

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Registrations table
CREATE TABLE IF NOT EXISTS registrations (
  shop_inn TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Access tokens table
CREATE TABLE IF NOT EXISTS access_tokens (
  token TEXT PRIMARY KEY,
  shop_inn TEXT NOT NULL REFERENCES registrations(shop_inn) ON DELETE CASCADE,
  label TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_tokens_shop_inn ON access_tokens(shop_inn);

-- Fiscal last state table (main data store)
CREATE TABLE IF NOT EXISTS fiscal_last_state (
  state_key TEXT PRIMARY KEY,
  shop_inn TEXT NOT NULL,
  shop_number INTEGER,
  shop_name TEXT,
  pos_number INTEGER,
  pos_ip TEXT,
  snapshot JSONB NOT NULL,
  severity TEXT,
  is_registered BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_fiscal_last_state_shop_inn ON fiscal_last_state(shop_inn);
CREATE INDEX IF NOT EXISTS idx_fiscal_last_state_severity ON fiscal_last_state(severity);
CREATE INDEX IF NOT EXISTS idx_fiscal_last_state_updated_at ON fiscal_last_state(updated_at);
CREATE INDEX IF NOT EXISTS idx_fiscal_last_state_is_registered ON fiscal_last_state(is_registered);
CREATE INDEX IF NOT EXISTS idx_fiscal_last_state_snapshot ON fiscal_last_state USING GIN(snapshot);

-- Fiscal events table (for future event history)
CREATE TABLE IF NOT EXISTS fiscal_events (
  id SERIAL PRIMARY KEY,
  state_key TEXT NOT NULL,
  shop_inn TEXT NOT NULL,
  event_type TEXT,
  snapshot JSONB NOT NULL,
  severity TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fiscal_events_state_key ON fiscal_events(state_key);
CREATE INDEX IF NOT EXISTS idx_fiscal_events_shop_inn ON fiscal_events(shop_inn);
CREATE INDEX IF NOT EXISTS idx_fiscal_events_created_at ON fiscal_events(created_at);
CREATE INDEX IF NOT EXISTS idx_fiscal_events_severity ON fiscal_events(severity);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for registrations
DROP TRIGGER IF EXISTS update_registrations_updated_at ON registrations;
CREATE TRIGGER update_registrations_updated_at
  BEFORE UPDATE ON registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE fiscal_last_state IS 'Stores the most recent state snapshot for each POS terminal';
COMMENT ON TABLE registrations IS 'Client companies registered in the system';
COMMENT ON TABLE access_tokens IS 'Portal access tokens for registered clients';
COMMENT ON TABLE fiscal_events IS 'Historical event log (for future use)';

COMMENT ON COLUMN fiscal_last_state.state_key IS 'Unique key: shopInn:shopNumber:posNumber';
COMMENT ON COLUMN fiscal_last_state.snapshot IS 'Complete POS snapshot in JSON format';
COMMENT ON COLUMN fiscal_last_state.severity IS 'Max severity from alerts: CRITICAL, DANGER, WARN, INFO';
COMMENT ON COLUMN fiscal_last_state.is_registered IS 'Whether the INN has an active registration';

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
  
  -- Admin review fields
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  admin_comment TEXT,
  
  -- Link to subscription if approved
  subscription_id INTEGER,
  
  -- Only one pending request per INN
  CONSTRAINT unique_pending_request UNIQUE (shop_inn, status) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX IF NOT EXISTS idx_subscription_requests_status ON notification_subscription_requests(status, requested_at);
CREATE INDEX IF NOT EXISTS idx_subscription_requests_inn ON notification_subscription_requests(shop_inn);

-- Active subscriptions (admin-approved)
CREATE TABLE IF NOT EXISTS notification_subscriptions (
  id SERIAL PRIMARY KEY,
  shop_inn TEXT NOT NULL REFERENCES registrations(shop_inn) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'expired', 'cancelled'
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Admin approval info
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  payment_note TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_active_subscription UNIQUE (shop_inn, status) WHERE status = 'active'
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON notification_subscriptions(shop_inn, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires ON notification_subscriptions(expires_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_subscriptions_active_inn ON notification_subscriptions(shop_inn) WHERE status = 'active';

-- Notification preferences (client settings)
CREATE TABLE IF NOT EXISTS notification_preferences (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER NOT NULL REFERENCES notification_subscriptions(id) ON DELETE CASCADE UNIQUE,
  severity_filter TEXT[] DEFAULT ARRAY['DANGER', 'CRITICAL'],
  notify_on_recovery BOOLEAN DEFAULT true,
  notify_on_stale BOOLEAN DEFAULT true,
  notify_on_return BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_preferences_subscription ON notification_preferences(subscription_id);

-- Telegram connections (one active per subscription)
CREATE TABLE IF NOT EXISTS telegram_connections (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER NOT NULL REFERENCES notification_subscriptions(id) ON DELETE CASCADE,
  telegram_chat_id BIGINT NOT NULL,
  telegram_chat_type VARCHAR(20), -- 'private', 'group', 'supergroup'
  telegram_chat_title TEXT,
  telegram_username VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_notification_at TIMESTAMPTZ
);

-- Each chat_id can only be connected once per subscription (but multiple chats allowed per subscription)
CREATE UNIQUE INDEX IF NOT EXISTS idx_telegram_connections_unique_chat 
  ON telegram_connections(subscription_id, telegram_chat_id) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_telegram_connections_active ON telegram_connections(subscription_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_telegram_connections_chat_id ON telegram_connections(telegram_chat_id);

-- Telegram connect codes (one-time use, 10 min TTL)
CREATE TABLE IF NOT EXISTS telegram_connect_codes (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER NOT NULL REFERENCES notification_subscriptions(id) ON DELETE CASCADE,
  code CHAR(6) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  telegram_chat_id BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_connect_codes_lookup ON telegram_connect_codes(code, expires_at, used);
CREATE INDEX IF NOT EXISTS idx_connect_codes_subscription ON telegram_connect_codes(subscription_id);

-- Notification cooldowns (anti-spam)
CREATE TABLE IF NOT EXISTS notification_cooldowns (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER NOT NULL REFERENCES notification_subscriptions(id) ON DELETE CASCADE,
  state_key TEXT NOT NULL,
  last_notified_at TIMESTAMPTZ NOT NULL,
  last_severity VARCHAR(20),
  last_alert_hash VARCHAR(64),
  
  CONSTRAINT unique_cooldown UNIQUE (subscription_id, state_key)
);

CREATE INDEX IF NOT EXISTS idx_cooldowns_lookup ON notification_cooldowns(subscription_id, state_key);

-- Notification queue (pending notifications)
CREATE TABLE IF NOT EXISTS notification_queue (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER NOT NULL REFERENCES notification_subscriptions(id) ON DELETE CASCADE,
  state_key TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL,
  event_type VARCHAR(50) NOT NULL, -- 'new_alert', 'severity_change', 'stale', 'recovery', 'return'
  alert_summary TEXT,
  shop_number INTEGER,
  pos_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_queue_pending ON notification_queue(subscription_id, processed, created_at);

-- Notification history (sent notifications log)
CREATE TABLE IF NOT EXISTS notification_history (
  id SERIAL PRIMARY KEY,
  connection_id INTEGER REFERENCES telegram_connections(id) ON DELETE SET NULL,
  subscription_id INTEGER NOT NULL REFERENCES notification_subscriptions(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  alerts_count INTEGER DEFAULT 1,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  telegram_message_id BIGINT,
  delivered BOOLEAN DEFAULT false,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_history_subscription ON notification_history(subscription_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_history_sent_at ON notification_history(sent_at);

-- Update triggers
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON notification_subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON notification_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_preferences_updated_at ON notification_preferences;
CREATE TRIGGER update_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-create preferences when subscription is created
CREATE OR REPLACE FUNCTION create_default_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (subscription_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_create_preferences ON notification_subscriptions;
CREATE TRIGGER auto_create_preferences
  AFTER INSERT ON notification_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION create_default_preferences();

-- Comments
COMMENT ON TABLE notification_subscription_requests IS 'Client requests for Telegram notification activation';
COMMENT ON TABLE notification_subscriptions IS 'Active Telegram notification subscriptions (admin-approved)';
COMMENT ON TABLE notification_preferences IS 'Client notification settings';
COMMENT ON TABLE telegram_connections IS 'Telegram chat connections (personal or group)';
COMMENT ON TABLE telegram_connect_codes IS 'One-time connection codes (10 min TTL)';
COMMENT ON TABLE notification_cooldowns IS 'Anti-spam cooldown tracking';
COMMENT ON TABLE notification_queue IS 'Pending notifications to be sent';
COMMENT ON TABLE notification_history IS 'Log of all sent notifications';
