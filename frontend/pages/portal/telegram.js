import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { portalApi } from '../../lib/api';

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
  const [testSending, setTestSending] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('portalToken');
      if (!token) {
        router.push('/portal/login');
        return;
      }

      const response = await portalApi.getTelegramStatus(token);
      const data = response.data;
      setStatus(data);
      
      if (data.preferences) {
        // Преобразовать массив severity_filter обратно в строку для UI
        let severityString = 'DANGER'; // default
        if (Array.isArray(data.preferences.severity_filter)) {
          const severities = data.preferences.severity_filter.sort();
          const severityKey = severities.join(',');
          
          // Точное сопоставление массивов
          const severityMap = {
            'CRITICAL': 'CRITICAL',
            'CRITICAL,DANGER': 'DANGER',
            'CRITICAL,DANGER,WARN': 'WARN',
            'CRITICAL,DANGER,INFO,WARN': 'INFO'
          };
          
          severityString = severityMap[severityKey] || 'DANGER';
        }
        
        setPreferences({
          ...data.preferences,
          severity_filter: severityString
        });
      }
    } catch (error) {
      console.error('Failed to load status:', error);
      if (error.response?.status === 401) {
        router.push('/portal/login');
      }
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
      await portalApi.requestTelegramSubscription(token, comment || '');
      alert('Запрос отправлен! Ожидайте одобрения администратора (обычно до 24 часов).');
      loadStatus();
    } catch (error) {
      alert('Ошибка: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleGenerateCode = async () => {
    try {
      const token = localStorage.getItem('portalToken');
      const response = await portalApi.generateTelegramCode(token);
      setConnectCode(response.data);
      setTimeout(() => setConnectCode(null), 600000); // Clear after 10 minutes
    } catch (error) {
      alert('Ошибка: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDisconnect = async (connectionId = null, connectionName = '') => {
    const confirmMsg = connectionId 
      ? `Отключить ${connectionName || 'это подключение'}?`
      : 'Отключить все Telegram подключения?';
    
    if (!confirm(confirmMsg)) return;
    
    try {
      const token = localStorage.getItem('portalToken');
      await portalApi.disconnectTelegram(token, connectionId);
      alert(connectionId ? 'Подключение отключено' : 'Все подключения отключены');
      setConnectCode(null);
      loadStatus();
    } catch (error) {
      alert('Ошибка: ' + (error.response?.data?.error || error.message));
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
      
      await portalApi.updateTelegramPreferences(token, {
        ...preferences,
        severity_filter: severityArray
      });

      alert('Настройки сохранены');
      loadStatus();
    } catch (error) {
      alert('Ошибка: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleSendTest = async () => {
    setTestSending(true);
    try {
      const token = localStorage.getItem('portalToken');
      const response = await portalApi.sendTelegramTest(token);
      const data = response.data;
      
      if (data.sent_count === data.total_connections) {
        alert(`✅ Тестовое уведомление отправлено (${data.sent_count} получателей)`);
      } else {
        alert(`Отправлено ${data.sent_count} из ${data.total_connections}. Ошибки: ${data.errors?.join(', ')}`);
      }
    } catch (error) {
      alert('Ошибка: ' + (error.response?.data?.error || error.message));
    } finally {
      setTestSending(false);
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const token = localStorage.getItem('portalToken');
      const response = await portalApi.getTelegramHistory(token, 20, 0);
      setHistory(response.data.history || []);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const toggleHistory = () => {
    if (!showHistory && history.length === 0) {
      loadHistory();
    }
    setShowHistory(!showHistory);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-800">Загрузка...</div>
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

        <h1 className="text-3xl font-bold mb-6 text-gray-900">Telegram Уведомления</h1>

        {/* Subscription Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Статус подписки</h2>
          
          {!status?.subscription ? (
            <div>
              <p className="text-gray-700 mb-4">
                Подписка на Telegram уведомления не активирована.
              </p>
              <p className="text-sm text-gray-600 mb-4">
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
                <span className="text-gray-700">
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
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Подключение Telegram</h2>
            
            {!status.connection ? (
              <div>
                {!connectCode ? (
                  <div>
                    <p className="text-gray-700 mb-4">
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
                    <h3 className="font-semibold text-lg mb-4 text-gray-900">Код подключения:</h3>
                    <div className="bg-white border-2 border-blue-500 rounded p-4 mb-4">
                      <div className="text-4xl font-mono font-bold text-center text-blue-600">
                        {connectCode.code}
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-sm text-gray-700 mb-2">
                        Код действителен {connectCode.expires_in_seconds} секунд ({Math.floor(connectCode.expires_in_seconds / 60)} минут)
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded p-4">
                      <h4 className="font-semibold mb-2 text-gray-900">Инструкция:</h4>
                      <ol className="list-decimal list-inside space-y-2 text-sm text-gray-800">
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
                  <p className="text-green-800 font-semibold mb-3">
                    ✓ Telegram подключен ({status.connections?.length || 1} {status.connections?.length === 1 ? 'пользователь' : 'пользователей'})
                  </p>
                  
                  {/* Список подключений */}
                  <div className="space-y-2">
                    {(status.connections || [status.connection]).map((conn, idx) => (
                      <div key={conn.id} className="flex items-center justify-between bg-white rounded p-2">
                        <div className="text-sm text-gray-800">
                          {conn.telegram_chat_type === 'private' ? (
                            <span>👤 {conn.telegram_username ? `@${conn.telegram_username}` : 'Личный чат'}</span>
                          ) : (
                            <span>👥 {conn.telegram_chat_title || 'Группа'}</span>
                          )}
                          <span className="text-gray-500 ml-2 text-xs">
                            с {new Date(conn.connected_at).toLocaleDateString('ru')}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDisconnect(conn.id, conn.telegram_username || conn.telegram_chat_title)}
                          className="text-red-500 hover:text-red-700 text-sm px-2 py-1"
                          title="Отключить"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Блок с кодом для добавления нового подключения */}
                {connectCode ? (
                  <div className="bg-blue-50 border border-blue-200 rounded p-6 mb-4">
                    <h3 className="font-semibold text-lg mb-4 text-gray-900">Код для нового подключения:</h3>
                    <div className="bg-white border-2 border-blue-500 rounded p-4 mb-4">
                      <div className="text-4xl font-mono font-bold text-center text-blue-600">
                        {connectCode.code}
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-sm text-gray-700 mb-2">
                        Код действителен {Math.floor(connectCode.expires_in_seconds / 60)} минут
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded p-4">
                      <h4 className="font-semibold mb-2 text-gray-900">Инструкция:</h4>
                      <ol className="list-decimal list-inside space-y-2 text-sm text-gray-800">
                        <li>Откройте Telegram у нового получателя</li>
                        <li>Найдите бота <strong>@{connectCode.bot_username}</strong></li>
                        <li>Отправьте команду: <code className="bg-white px-2 py-1 rounded">/connect {connectCode.code}</code></li>
                      </ol>
                    </div>
                    
                    <button
                      onClick={() => setConnectCode(null)}
                      className="mt-4 text-gray-500 hover:text-gray-700 text-sm"
                    >
                      Скрыть код
                    </button>
                  </div>
                ) : (
                  /* Кнопка добавления ещё одного подключения */
                  <div className="flex gap-2">
                    <button
                      onClick={handleGenerateCode}
                      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    >
                      + Добавить ещё Telegram
                    </button>
                    {(status.connections?.length || 1) > 1 && (
                      <button
                        onClick={() => handleDisconnect()}
                        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                      >
                        Отключить все
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Notification Preferences */}
        {status?.subscription?.status === 'active' && (status?.connections?.length > 0 || status?.connection) && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Настройки уведомлений</h2>
            
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
                  <span className="text-sm text-gray-800">Уведомлять о решении проблем</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={preferences.notify_on_stale}
                    onChange={(e) => setPreferences({...preferences, notify_on_stale: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-800">Уведомлять о потере связи с кассой</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={preferences.notify_on_return}
                    onChange={(e) => setPreferences({...preferences, notify_on_return: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-800">Уведомлять о восстановлении связи</span>
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSavePreferences}
                  className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
                >
                  Сохранить настройки
                </button>
                <button
                  onClick={handleSendTest}
                  disabled={testSending}
                  className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 disabled:opacity-50"
                >
                  {testSending ? 'Отправка...' : '📤 Тест'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* История уведомлений */}
        {status?.subscription?.status === 'active' && (status?.connections?.length > 0 || status?.connection) && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">История уведомлений</h2>
              <button
                onClick={toggleHistory}
                className="text-blue-500 hover:text-blue-700"
              >
                {showHistory ? 'Скрыть' : 'Показать'}
              </button>
            </div>

            {showHistory && (
              <div>
                {historyLoading ? (
                  <p className="text-gray-600">Загрузка...</p>
                ) : history.length === 0 ? (
                  <p className="text-gray-600">История пуста</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {history.map((item) => (
                      <div 
                        key={item.id} 
                        className={`p-3 rounded border ${item.delivered ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs text-gray-500">
                            {new Date(item.sent_at).toLocaleString('ru-RU')}
                          </span>
                          <span className="text-xs text-gray-500">
                            → {item.recipient}
                          </span>
                        </div>
                        <div className="text-sm text-gray-800">
                          {item.alerts_count > 0 && (
                            <span className="font-medium">Алертов: {item.alerts_count} • </span>
                          )}
                          <span className={item.delivered ? 'text-green-600' : 'text-red-600'}>
                            {item.delivered ? '✓ Доставлено' : '✕ Ошибка'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
