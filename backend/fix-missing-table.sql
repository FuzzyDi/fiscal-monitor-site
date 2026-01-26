-- Create missing notification_subscription_requests table
-- This table tracks client requests for Telegram notification activation

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

-- Verify
SELECT 'Table created successfully!' AS status;
\dt notification_subscription_requests
