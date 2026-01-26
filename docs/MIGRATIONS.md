# Database Migration Guide

## Initial Setup

The database schema is automatically applied on first startup via Docker's init scripts. For manual setup:

```bash
psql $DATABASE_URL -f backend/schema.sql
```

## Future Migrations

As the application evolves, you may need to modify the database schema. Here's how to manage migrations:

### Creating a Migration

1. Create a new migration file in `backend/migrations/`:

```sql
-- backend/migrations/001_add_notification_settings.sql
-- Description: Add notification settings to registrations table

ALTER TABLE registrations 
ADD COLUMN notification_email TEXT,
ADD COLUMN notification_telegram TEXT;

-- Add index for faster lookups
CREATE INDEX idx_registrations_notification_email 
ON registrations(notification_email) 
WHERE notification_email IS NOT NULL;
```

2. Name migrations sequentially: `001_`, `002_`, etc.

3. Always include:
   - Description comment
   - Reversible changes when possible
   - Necessary indexes

### Applying Migrations

#### Development

```bash
psql $DATABASE_URL -f backend/migrations/001_add_notification_settings.sql
```

#### Production

```bash
# Backup first!
docker-compose exec postgres pg_dump -U postgres fiscal_monitor > backup_before_migration.sql

# Apply migration
docker-compose exec -T postgres psql -U postgres fiscal_monitor < \
  backend/migrations/001_add_notification_settings.sql

# Verify
docker-compose exec postgres psql -U postgres fiscal_monitor -c "\d registrations"
```

### Rollback

Create rollback files for each migration:

```sql
-- backend/migrations/001_add_notification_settings.rollback.sql
ALTER TABLE registrations 
DROP COLUMN IF EXISTS notification_email,
DROP COLUMN IF EXISTS notification_telegram;

DROP INDEX IF EXISTS idx_registrations_notification_email;
```

To rollback:

```bash
docker-compose exec -T postgres psql -U postgres fiscal_monitor < \
  backend/migrations/001_add_notification_settings.rollback.sql
```

## Common Migration Patterns

### Adding a Column

```sql
ALTER TABLE table_name 
ADD COLUMN column_name TYPE DEFAULT value;

-- Example
ALTER TABLE registrations 
ADD COLUMN max_pos INTEGER DEFAULT 10;
```

### Adding an Index

```sql
CREATE INDEX idx_table_column ON table_name(column_name);

-- Partial index
CREATE INDEX idx_table_column 
ON table_name(column_name) 
WHERE condition;

-- Example
CREATE INDEX idx_fiscal_last_state_critical 
ON fiscal_last_state(shop_inn) 
WHERE severity = 'CRITICAL';
```

### Adding a Foreign Key

```sql
ALTER TABLE child_table
ADD CONSTRAINT fk_name 
FOREIGN KEY (column_name) 
REFERENCES parent_table(parent_column)
ON DELETE CASCADE;

-- Example
ALTER TABLE notifications
ADD CONSTRAINT fk_notifications_shop_inn 
FOREIGN KEY (shop_inn) 
REFERENCES registrations(shop_inn)
ON DELETE CASCADE;
```

### Creating a New Table

```sql
CREATE TABLE table_name (
  id SERIAL PRIMARY KEY,
  column1 TYPE NOT NULL,
  column2 TYPE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_table_column1 ON table_name(column1);

-- Example: Notification log
CREATE TABLE notification_log (
  id SERIAL PRIMARY KEY,
  shop_inn TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_log_shop_inn ON notification_log(shop_inn);
CREATE INDEX idx_notification_log_sent_at ON notification_log(sent_at);
```

## Data Migrations

When you need to modify existing data:

```sql
-- Add new column with default
ALTER TABLE fiscal_last_state 
ADD COLUMN status TEXT DEFAULT 'active';

-- Update existing rows based on conditions
UPDATE fiscal_last_state 
SET status = 'stale' 
WHERE updated_at < NOW() - INTERVAL '15 minutes';

-- Create computed column
ALTER TABLE fiscal_last_state 
ADD COLUMN last_alert_severity TEXT;

UPDATE fiscal_last_state 
SET last_alert_severity = severity;
```

## Testing Migrations

Always test migrations in a development environment first:

1. Backup production data:
```bash
pg_dump production > production_backup.sql
```

2. Restore to development:
```bash
psql development < production_backup.sql
```

3. Test migration:
```bash
psql development < migrations/001_new_feature.sql
```

4. Verify application works with new schema

5. Test rollback:
```bash
psql development < migrations/001_new_feature.rollback.sql
```

## Migration Tracking

Keep a log of applied migrations:

```sql
-- Create migrations table
CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  description TEXT,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- Record migration
INSERT INTO schema_migrations (version, description) 
VALUES ('001', 'Add notification settings');
```

Check applied migrations:

```sql
SELECT * FROM schema_migrations ORDER BY version;
```

## Best Practices

1. **Always backup before migrations**
2. **Test in development first**
3. **Make migrations reversible**
4. **Keep migrations small and focused**
5. **Document all changes**
6. **Use transactions for data migrations**
7. **Add indexes for new query patterns**
8. **Consider downtime during large migrations**

## Zero-Downtime Migrations

For large tables, consider:

### Adding Columns

```sql
-- Step 1: Add column as nullable first
ALTER TABLE large_table ADD COLUMN new_column TYPE;

-- Step 2: Backfill in batches (outside transaction)
DO $$
DECLARE
  batch_size INTEGER := 1000;
  last_id INTEGER := 0;
BEGIN
  LOOP
    UPDATE large_table 
    SET new_column = compute_value()
    WHERE id > last_id 
      AND id <= last_id + batch_size
      AND new_column IS NULL;
    
    EXIT WHEN NOT FOUND;
    last_id := last_id + batch_size;
    COMMIT;
  END LOOP;
END $$;

-- Step 3: Add NOT NULL constraint
ALTER TABLE large_table 
ALTER COLUMN new_column SET NOT NULL;
```

### Adding Indexes

```sql
-- Create index concurrently (doesn't lock table)
CREATE INDEX CONCURRENTLY idx_table_column 
ON table_name(column_name);
```

## Emergency Procedures

### Corrupted Migration

```bash
# 1. Stop application
docker-compose stop backend frontend

# 2. Restore from backup
docker-compose exec -T postgres psql -U postgres fiscal_monitor < backup.sql

# 3. Verify data integrity
docker-compose exec postgres psql -U postgres fiscal_monitor -c "
  SELECT COUNT(*) FROM fiscal_last_state;
  SELECT COUNT(*) FROM registrations;
  SELECT COUNT(*) FROM access_tokens;
"

# 4. Restart application
docker-compose up -d
```

### Long-Running Migration

If a migration is taking too long:

```sql
-- Check progress
SELECT pid, query, state, query_start
FROM pg_stat_activity
WHERE state = 'active';

-- If needed, cancel (use with caution!)
SELECT pg_cancel_backend(pid);
```

## Example: Complete Migration Workflow

### Scenario: Add notification system

**1. Create migration file:**

```sql
-- migrations/002_add_notifications.sql
-- Add notification system tables and columns

-- Add notification settings to registrations
ALTER TABLE registrations 
ADD COLUMN notify_critical BOOLEAN DEFAULT true,
ADD COLUMN notify_danger BOOLEAN DEFAULT true,
ADD COLUMN notify_warn BOOLEAN DEFAULT false,
ADD COLUMN notification_email TEXT,
ADD COLUMN notification_telegram TEXT;

-- Create notification log
CREATE TABLE notification_log (
  id SERIAL PRIMARY KEY,
  shop_inn TEXT NOT NULL REFERENCES registrations(shop_inn) ON DELETE CASCADE,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  channel TEXT NOT NULL,
  status TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_log_shop_inn ON notification_log(shop_inn);
CREATE INDEX idx_notification_log_sent_at ON notification_log(sent_at);
CREATE INDEX idx_notification_log_status ON notification_log(status);

-- Add trigger for auto-cleanup (optional)
CREATE OR REPLACE FUNCTION cleanup_old_notifications() 
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM notification_log 
  WHERE sent_at < NOW() - INTERVAL '90 days';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleanup_notifications
  AFTER INSERT ON notification_log
  EXECUTE FUNCTION cleanup_old_notifications();
```

**2. Create rollback file:**

```sql
-- migrations/002_add_notifications.rollback.sql
DROP TRIGGER IF EXISTS trigger_cleanup_notifications ON notification_log;
DROP FUNCTION IF EXISTS cleanup_old_notifications();
DROP TABLE IF EXISTS notification_log;

ALTER TABLE registrations
DROP COLUMN IF EXISTS notify_critical,
DROP COLUMN IF EXISTS notify_danger,
DROP COLUMN IF EXISTS notify_warn,
DROP COLUMN IF EXISTS notification_email,
DROP COLUMN IF EXISTS notification_telegram;
```

**3. Test in development:**

```bash
# Apply
psql dev_database -f migrations/002_add_notifications.sql

# Test application
npm run dev

# Rollback
psql dev_database -f migrations/002_add_notifications.rollback.sql
```

**4. Apply to production:**

```bash
# Backup
docker-compose exec postgres pg_dump -U postgres fiscal_monitor > \
  backup_before_notifications_$(date +%Y%m%d).sql

# Apply
docker-compose exec -T postgres psql -U postgres fiscal_monitor < \
  migrations/002_add_notifications.sql

# Verify
docker-compose exec postgres psql -U postgres fiscal_monitor -c "\d registrations"
docker-compose exec postgres psql -U postgres fiscal_monitor -c "\d notification_log"
```
