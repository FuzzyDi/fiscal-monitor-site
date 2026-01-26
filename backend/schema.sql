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
