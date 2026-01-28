-- Исправление типа колонки severity_filter
-- Проблема: VARCHAR(20) не может хранить массив
-- Решение: Изменить на TEXT[]

BEGIN;

-- Изменить тип колонки на TEXT[]
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

-- Установить default
ALTER TABLE notification_preferences
ALTER COLUMN severity_filter SET DEFAULT ARRAY['DANGER', 'CRITICAL'];

-- Добавить индекс для активных подписок
CREATE INDEX IF NOT EXISTS idx_subscriptions_active_inn 
  ON notification_subscriptions(shop_inn) 
  WHERE status = 'active';

COMMIT;

-- Проверка
SELECT subscription_id, severity_filter, pg_typeof(severity_filter) as type 
FROM notification_preferences;
