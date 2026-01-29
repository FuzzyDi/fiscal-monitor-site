import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { adminApi } from '../../lib/api';

export default function TelegramSubscriptions() {
  const [requests, setRequests] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('requests');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const adminKey = localStorage.getItem('adminKey');
      if (!adminKey) {
        alert('Not authenticated');
        return;
      }

      if (activeTab === 'requests') {
        const res = await adminApi.getTelegramRequests(adminKey, 'pending');
        setRequests(res.data.requests || []);
      } else if (activeTab === 'subscriptions') {
        const res = await adminApi.getTelegramSubscriptions(adminKey);
        setSubscriptions(res.data.subscriptions || []);
      } else if (activeTab === 'statistics') {
        const res = await adminApi.getTelegramStatistics(adminKey);
        setStatistics(res.data);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApprove = async (requestId, duration) => {
    if (!confirm('Активировать подписку на Telegram уведомления?')) return;
    
    try {
      const adminKey = localStorage.getItem('adminKey');
      await adminApi.approveTelegramRequest(adminKey, requestId, {
        duration_months: duration
      });
      alert('Подписка активирована!');
      loadData();
    } catch (error) {
      alert('Ошибка: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleReject = async (requestId, reason) => {
    const comment = prompt('Причина отклонения (опционально):');
    
    try {
      const adminKey = localStorage.getItem('adminKey');
      await adminApi.rejectTelegramRequest(adminKey, requestId, {
        admin_comment: comment || reason
      });
      alert('Запрос отклонён');
      loadData();
    } catch (error) {
      alert('Ошибка: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleExtend = async (subscriptionId, months) => {
    if (!confirm(`Продлить подписку на ${months} мес?`)) return;
    
    try {
      const adminKey = localStorage.getItem('adminKey');
      await adminApi.extendTelegramSubscription(adminKey, subscriptionId, {
        duration_months: months
      });
      alert('Подписка продлена!');
      loadData();
    } catch (error) {
      alert('Ошибка: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleCancel = async (subscriptionId) => {
    if (!confirm('Отменить подписку? Клиент перестанет получать уведомления.')) return;
    
    try {
      const adminKey = localStorage.getItem('adminKey');
      await adminApi.cancelTelegramSubscription(adminKey, subscriptionId);
      alert('Подписка отменена');
      loadData();
    } catch (error) {
      alert('Ошибка: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleExport = async () => {
    try {
      const adminKey = localStorage.getItem('adminKey');
      const response = await adminApi.exportTelegramSubscriptions(adminKey);
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `telegram_subscriptions_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Ошибка экспорта: ' + (error.response?.data?.error || error.message));
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Telegram Уведомления</h1>
          <button
            onClick={handleExport}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Экспорт в Excel
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b">
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 ${activeTab === 'requests' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
          >
            Запросы ({requests.length})
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`px-4 py-2 ml-4 ${activeTab === 'subscriptions' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
          >
            Активные подписки ({subscriptions.length})
          </button>
          <button
            onClick={() => setActiveTab('statistics')}
            className={`px-4 py-2 ml-4 ${activeTab === 'statistics' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
          >
            📊 Статистика
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-700">Загрузка...</div>
        ) : activeTab === 'requests' ? (
          <RequestsTable 
            requests={requests} 
            onApprove={handleApprove}
            onReject={handleReject}
          />
        ) : activeTab === 'subscriptions' ? (
          <SubscriptionsTable 
            subscriptions={subscriptions}
            onExtend={handleExtend}
            onCancel={handleCancel}
          />
        ) : activeTab === 'statistics' && statistics ? (
          <StatisticsPanel statistics={statistics} />
        ) : null}
      </div>
    </AdminLayout>
  );
}

function StatisticsPanel({ statistics }) {
  if (!statistics || !statistics.subscriptions) {
    return <div className="text-center py-8 text-gray-500">Нет данных</div>;
  }

  return (
    <div className="space-y-6">
      {/* Основные метрики */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white shadow rounded-lg p-4">
          <h3 className="text-sm text-gray-500 mb-1">Активных подписок</h3>
          <p className="text-3xl font-bold text-green-600">{statistics.subscriptions?.active || 0}</p>
          <p className="text-xs text-gray-400 mt-1">
            истекает скоро: {statistics.subscriptions?.expiring_soon || 0}
          </p>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <h3 className="text-sm text-gray-500 mb-1">Telegram подключений</h3>
          <p className="text-3xl font-bold text-blue-600">{statistics.connections?.active || 0}</p>
          <p className="text-xs text-gray-400 mt-1">
            личных: {statistics.connections?.private_chats || 0}, групп: {statistics.connections?.group_chats || 0}
          </p>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <h3 className="text-sm text-gray-500 mb-1">Ожидают одобрения</h3>
          <p className="text-3xl font-bold text-yellow-600">{statistics.requests?.pending || 0}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <h3 className="text-sm text-gray-500 mb-1">В очереди отправки</h3>
          <p className="text-3xl font-bold text-purple-600">{statistics.queue?.pending || 0}</p>
        </div>
      </div>

      {/* Уведомления за 30 дней */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Уведомления за 30 дней</h3>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-900">{statistics.notifications_30d?.total || 0}</p>
            <p className="text-sm text-gray-500">всего</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{statistics.notifications_30d?.delivered || 0}</p>
            <p className="text-sm text-gray-500">доставлено</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">{statistics.notifications_30d?.failed || 0}</p>
            <p className="text-sm text-gray-500">ошибок</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-600">{statistics.notifications_30d?.total_alerts || 0}</p>
            <p className="text-sm text-gray-500">алертов</p>
          </div>
        </div>
      </div>

      {/* По дням */}
      {statistics.daily_stats && statistics.daily_stats.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">По дням (последние 14)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-gray-600">Дата</th>
                  <th className="text-right py-2 text-gray-600">Уведомлений</th>
                  <th className="text-right py-2 text-gray-600">Алертов</th>
                </tr>
              </thead>
              <tbody>
                {statistics.daily_stats.map((day) => (
                  <tr key={day.date} className="border-b">
                    <td className="py-2 text-gray-900">{new Date(day.date).toLocaleDateString('ru-RU')}</td>
                    <td className="py-2 text-right text-gray-900">{day.notifications}</td>
                    <td className="py-2 text-right text-gray-900">{day.alerts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Топ проблемных */}
      {statistics.top_problematic && statistics.top_problematic.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Топ-10 проблемных ИНН (30 дней)</h3>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 text-gray-600">Компания</th>
                <th className="text-left py-2 text-gray-600">ИНН</th>
                <th className="text-right py-2 text-gray-600">Алертов</th>
                <th className="text-right py-2 text-gray-600">Уведомлений</th>
              </tr>
            </thead>
            <tbody>
              {statistics.top_problematic.map((item, idx) => (
                <tr key={item.shop_inn} className="border-b">
                  <td className="py-2 text-gray-900">{item.title || '-'}</td>
                  <td className="py-2 text-gray-600">{item.shop_inn}</td>
                  <td className="py-2 text-right font-semibold text-red-600">{item.total_alerts}</td>
                  <td className="py-2 text-right text-gray-900">{item.notifications}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RequestsTable({ requests, onApprove, onReject }) {
  if (requests.length === 0) {
    return <div className="text-center py-8 text-gray-500">Нет новых запросов</div>;
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <table className="min-w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Компания</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ИНН</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата запроса</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Комментарий</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {requests.map((req) => (
            <tr key={req.id}>
              <td className="px-6 py-4 text-gray-900">{req.company_name || req.registration_title || '-'}</td>
              <td className="px-6 py-4 font-mono text-gray-700">{req.shop_inn}</td>
              <td className="px-6 py-4 text-gray-700">{new Date(req.requested_at).toLocaleString('ru')}</td>
              <td className="px-6 py-4 text-sm text-gray-600">{req.client_comment || '-'}</td>
              <td className="px-6 py-4">
                <div className="flex gap-2">
                  <select 
                    onChange={(e) => onApprove(req.id, parseInt(e.target.value))}
                    className="border rounded px-2 py-1 text-sm text-gray-900"
                    defaultValue=""
                  >
                    <option value="" disabled>Одобрить...</option>
                    <option value="1">1 месяц</option>
                    <option value="3">3 месяца</option>
                    <option value="6">6 месяцев</option>
                    <option value="12">1 год</option>
                  </select>
                  <button
                    onClick={() => onReject(req.id, 'Отклонено администратором')}
                    className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                  >
                    Отклонить
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SubscriptionsTable({ subscriptions, onExtend, onCancel }) {
  if (subscriptions.length === 0) {
    return <div className="text-center py-8 text-gray-500">Нет активных подписок</div>;
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <table className="min-w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Компания</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ИНН</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Истекает</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telegram</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {subscriptions.map((sub) => {
            const isExpired = new Date(sub.expires_at) < new Date();
            const daysLeft = Math.ceil((new Date(sub.expires_at) - new Date()) / (1000 * 60 * 60 * 24));
            
            return (
              <tr key={sub.id}>
                <td className="px-6 py-4 text-gray-900">{sub.company_name || sub.registration_title || '-'}</td>
                <td className="px-6 py-4 font-mono text-gray-700">{sub.shop_inn}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs ${
                    sub.status === 'active' && !isExpired ? 'bg-green-100 text-green-800' : 
                    'bg-red-100 text-red-800'
                  }`}>
                    {sub.status === 'active' && !isExpired ? 'Активна' : 'Истекла'}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-700">
                  {new Date(sub.expires_at).toLocaleDateString('ru')}
                  {!isExpired && (
                    <span className="text-xs text-gray-500 ml-2">
                      ({daysLeft} дн.)
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {sub.telegram_connected ? (
                    <span className="text-green-600">✓ Подключен</span>
                  ) : (
                    <span className="text-gray-400">Не подключен</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onExtend(sub.id, 1)}
                      className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                    >
                      +1 мес
                    </button>
                    <button
                      onClick={() => onCancel(sub.id)}
                      className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                    >
                      Отменить
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
