import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';

export default function TelegramSettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [connectCode, setConnectCode] = useState(null);
  const [preferences, setPreferences] = useState({
    severity_filter: 'DANGER',
    notify_on_recovery: true,
    notify_on_stale: true,
    notify_on_return: true
  });

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('portalToken');
      if (!token) {
        router.push('/portal/login');
        return;
      }

      const response = await fetch('/api/v1/portal/telegram/status', {
        headers: { 'X-Token': token }
      });

      if (response.status === 401) {
        router.push('/portal/login');
        return;
      }

      const data = await response.json();
      setStatus(data);
      
      if (data.preferences) {
        // Преобразовать массив severity_filter обратно в строку для UI
        let severityString = 'DANGER'; // default
        if (Array.isArray(data.preferences.severity_filter)) {
          const severities = data.preferences.severity_filter;
          if (severities.length === 1 && severities[0] === 'CRITICAL') {
            severityString = 'CRITICAL';
          } else if (severities.includes('INFO')) {
            severityString = 'INFO';
          } else if (severities.includes('WARN')) {
            severityString = 'WARN';
          } else if (severities.includes('DANGER')) {
            severityString = 'DANGER';
          }
        }
        
        setPreferences({
          ...data.preferences,
          severity_filter: severityString
        });
      }
    } catch (error) {
      console.error('Failed to load status:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleRequestSubscription = async () => {
    const comment = prompt('Комментарий к запросу (опционально):');
    
    try {
      const token = localStorage.getItem('portalToken');
      const response = await fetch('/api/v1/portal/telegram/request-subscription', {
        method: 'POST',
        headers: {
          'X-Token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ client_comment: comment || '' })
      });

      const data = await response.json();
      
      if (response.ok) {
        alert('Запрос отправлен! Ожидайте одобрения администратора (обычно до 24 часов).');
        loadStatus();
      } else {
        alert('Ошибка: ' + data.error);
      }
    } catch (error) {
      alert('Ошибка: ' + error.message);
    }
  };

  const handleGenerateCode = async () => {
    try {
      const token = localStorage.getItem('portalToken');
      const response = await fetch('/api/v1/portal/telegram/generate-code', {
        method: 'POST',
        headers: { 'X-Token': token }
      });

      const data = await response.json();
      
      if (response.ok) {
        setConnectCode(data);
        setTimeout(() => setConnectCode(null), 600000); // Clear after 10 minutes
      } else {
        alert('Ошибка: ' + data.error);
      }
    } catch (error) {
      alert('Ошибка: ' + error.message);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Отключить Telegram уведомления?')) return;
    
    try {
      const token = localStorage.getItem('portalToken');
      const response = await fetch('/api/v1/portal/telegram/disconnect', {
        method: 'POST',
        headers: { 'X-Token': token }
      });

      if (response.ok) {
        alert('Telegram отключен');
        setConnectCode(null);
        loadStatus();
      } else {
        const data = await response.json();
        alert('Ошибка: ' + data.error);
      }
    } catch (error) {
      alert('Ошибка: ' + error.message);
    }
  };

  const handleSavePreferences = async () => {
    try {
      const token = localStorage.getItem('portalToken');
      
      // Преобразовать severity_filter в массив
      const severityMap = {
        'CRITICAL': ['CRITICAL'],
        'DANGER': ['DANGER', 'CRITICAL'],
        'WARN': ['WARN', 'DANGER', 'CRITICAL'],
        'INFO': ['INFO', 'WARN', 'DANGER', 'CRITICAL']
      };
      
      const severityArray = severityMap[preferences.severity_filter] || ['DANGER', 'CRITICAL'];
      
      const response = await fetch('/api/v1/portal/telegram/preferences', {
        method: 'PUT',
        headers: {
          'X-Token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...preferences,
          severity_filter: severityArray
        })
      });

      if (response.ok) {
        alert('Настройки сохранены');
      } else {
        const data = await response.json();
        alert('Ошибка: ' + data.error);
      }
    } catch (error) {
      alert('Ошибка: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <button
            onClick={() => router.push('/portal')}
            className="text-blue-500 hover:underline"
          >
            ← Назад в портал
          </button>
        </div>

        <h1 className="text-3xl font-bold mb-6">Telegram Уведомления</h1>

        {/* Subscription Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Статус подписки</h2>
          
          {!status?.subscription ? (
            <div>
              <p className="text-gray-600 mb-4">
                Подписка на Telegram уведомления не активирована.
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Стоимость: 1000₽/месяц. Получайте мгновенные уведомления о проблемах с кассами.
              </p>
              
              {status?.request?.status === 'pending' ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                  <p className="text-yellow-800">
                    ⏳ Запрос отправлен {new Date(status.request.requested_at).toLocaleDateString('ru')}
                  </p>
                  <p className="text-sm text-yellow-600 mt-2">
                    Ожидайте одобрения администратора (обычно до 24 часов)
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleRequestSubscription}
                  className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
                >
                  Запросить активацию
                </button>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-4 mb-4">
                <span className={`px-3 py-1 rounded ${
                  status.subscription.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {status.subscription.status === 'active' ? '✓ Активна' : 'Истекла'}
                </span>
                <span className="text-gray-600">
                  до {new Date(status.subscription.expires_at).toLocaleDateString('ru')}
                </span>
              </div>
              
              {status.subscription.status === 'active' && new Date(status.subscription.expires_at) - new Date() < 7 * 24 * 60 * 60 * 1000 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
                  <p className="text-yellow-800">
                    ⚠️ Подписка истекает через {Math.ceil((new Date(status.subscription.expires_at) - new Date()) / (1000 * 60 * 60 * 24))} дней
                  </p>
                  <p className="text-sm text-yellow-600 mt-2">
                    Свяжитесь с администратором для продления
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Telegram Connection */}
        {status?.subscription?.status === 'active' && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Подключение Telegram</h2>
            
            {!status.connection ? (
              <div>
                {!connectCode ? (
                  <div>
                    <p className="text-gray-600 mb-4">
                      Подключите Telegram чтобы получать уведомления
                    </p>
                    <button
                      onClick={handleGenerateCode}
                      className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
                    >
                      Подключить Telegram
                    </button>
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded p-6">
                    <h3 className="font-semibold text-lg mb-4">Код подключения:</h3>
                    <div className="bg-white border-2 border-blue-500 rounded p-4 mb-4">
                      <div className="text-4xl font-mono font-bold text-center text-blue-600">
                        {connectCode.code}
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-2">
                        Код действителен {connectCode.expires_in_seconds} секунд ({Math.floor(connectCode.expires_in_seconds / 60)} минут)
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded p-4">
                      <h4 className="font-semibold mb-2">Инструкция:</h4>
                      <ol className="list-decimal list-inside space-y-2 text-sm">
                        <li>Откройте Telegram на вашем устройстве</li>
                        <li>Найдите бота <strong>@{connectCode.bot_username}</strong></li>
                        <li>Отправьте команду: <code className="bg-white px-2 py-1 rounded">/connect {connectCode.code}</code></li>
                        <li>Бот подтвердит подключение</li>
                      </ol>
                    </div>

                    <p className="text-xs text-gray-500 mt-4">
                      💡 Совет: Можете добавить бота в группу для командного мониторинга
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="bg-green-50 border border-green-200 rounded p-4 mb-4">
                  <p className="text-green-800 font-semibold">
                    ✓ Telegram подключен
                  </p>
                  {status.connection?.telegram_chat_type === 'group' && (
                    <p className="text-sm text-green-600 mt-2">
                      Группа: {status.connection?.telegram_chat_title}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleDisconnect}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
                  Отключить Telegram
                </button>
              </div>
            )}
          </div>
        )}

        {/* Notification Preferences */}
        {status?.subscription?.status === 'active' && status?.connection && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Настройки уведомлений</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Уровень важности
                </label>
                <select
                  value={preferences.severity_filter}
                  onChange={(e) => setPreferences({...preferences, severity_filter: e.target.value})}
                  className="w-full border rounded px-3 py-2 text-gray-900"
                >
                  <option value="INFO">Все уведомления (INFO и выше)</option>
                  <option value="WARN">Предупреждения (WARN и выше)</option>
                  <option value="DANGER">Важно (DANGER и выше) - рекомендуется</option>
                  <option value="CRITICAL">Только критические (CRITICAL)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={preferences.notify_on_recovery}
                    onChange={(e) => setPreferences({...preferences, notify_on_recovery: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm">Уведомлять о решении проблем</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={preferences.notify_on_stale}
                    onChange={(e) => setPreferences({...preferences, notify_on_stale: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm">Уведомлять о потере связи с кассой</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={preferences.notify_on_return}
                    onChange={(e) => setPreferences({...preferences, notify_on_return: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm">Уведомлять о восстановлении связи</span>
                </label>
              </div>

              <button
                onClick={handleSavePreferences}
                className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
              >
                Сохранить настройки
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
