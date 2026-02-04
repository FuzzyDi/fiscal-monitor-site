import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { adminApi } from '../../lib/api';
import AdminLayout from '../../components/AdminLayout';

export default function AdminState() {
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInn, setSelectedInn] = useState('');
  const [selectedShopNumber, setSelectedShopNumber] = useState('');
  const [exporting, setExporting] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open: false, state: null });
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const adminKey = localStorage.getItem('adminKey');
    if (!adminKey) {
      router.push('/admin/login');
      return;
    }

    const { inn, shopNumber, severity } = router.query;
    if (inn) {
      setSelectedInn(inn);
    }
    if (shopNumber !== undefined && shopNumber !== null && String(shopNumber).trim() !== '') {
      setSelectedShopNumber(String(shopNumber).trim());
    } else {
      setSelectedShopNumber('');
    }

    fetchStates(adminKey, inn, shopNumber, severity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query]);

  const fetchStates = async (key, inn = null, shopNumber = null, severity = null) => {
    try {
      setLoading(true);
      const res = await adminApi.getState(key, inn, shopNumber, severity);
      let filteredStates = res.data.states;
      
      if (severity) {
        filteredStates = filteredStates.filter(state =>
          state.severity && state.severity.toUpperCase() === severity.toUpperCase()
        );
      }

      if (shopNumber !== null && shopNumber !== undefined && String(shopNumber).trim() !== '') {
        const sn = String(shopNumber).trim();
        filteredStates = filteredStates.filter(state => String(getShopNumber(state)) === sn);
      }

      const sorted = Array.isArray(filteredStates)
        ? [...filteredStates].sort(compareStates)
        : [];
      setStates(sorted);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('adminKey');
        router.push('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const adminKey = localStorage.getItem('adminKey');
      if (!adminKey) {
        router.push('/admin/login');
        return;
      }

      const { inn, shopNumber, severity } = router.query;
      const response = await adminApi.exportState(adminKey, inn, shopNumber, severity);

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      let filename = 'pos_state_';
      if (inn) filename += `inn_${inn}_`;
      if (shopNumber) filename += `shop_${shopNumber}_`;
      if (severity) filename += `${severity.toLowerCase()}_`;
      filename += `${new Date().toISOString().split('T')[0]}.xlsx`;
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Не удалось экспортировать данные');
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async (deleteHistory = false) => {
    if (!deleteModal.state) return;
    
    try {
      setDeleting(true);
      const adminKey = localStorage.getItem('adminKey');
      if (!adminKey) {
        router.push('/admin/login');
        return;
      }

      const stateKey = deleteModal.state.state_key;
      const url = `/api/admin/state/${encodeURIComponent(stateKey)}${deleteHistory ? '?deleteHistory=true' : ''}`;
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'X-Admin-Key': adminKey
        }
      });

      if (response.status === 401) {
        localStorage.removeItem('adminKey');
        router.push('/admin/login');
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка удаления');
      }

      // Remove from local state
      setStates(states.filter(s => s.state_key !== stateKey));
      setDeleteModal({ open: false, state: null });
    } catch (error) {
      console.error('Delete failed:', error);
      alert(error.message || 'Не удалось удалить кассу');
    } finally {
      setDeleting(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200';
      case 'DANGER': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'WARN': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'INFO': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateStr) => {
    if (typeof window === 'undefined') return '';
    return new Date(dateStr).toLocaleString('ru-RU');
  };

  const getShopNumber = (state) => {
    const v = state?.snapshot?.shopNumber ?? state?.shop_number;
    return (v === undefined || v === null || v === '') ? '0' : String(v);
  };

  const getPosNumber = (state) => {
    const v = state?.snapshot?.posNumber ?? state?.pos_number;
    return (v === undefined || v === null || v === '') ? '0' : String(v);
  };

  const safeString = (v) => (v === undefined || v === null) ? '' : String(v);
  const isDigitsOnly = (s) => /^\d+$/.test(s);

  const toBigIntOrNull = (s) => {
    const t = safeString(s).trim();
    if (!t) return null;
    if (!isDigitsOnly(t)) return null;
    try {
      return BigInt(t);
    } catch {
      return null;
    }
  };

  const compareMaybeBigInt = (a, b) => {
    const aa = toBigIntOrNull(a);
    const bb = toBigIntOrNull(b);
    if (aa !== null && bb !== null) {
      if (aa < bb) return -1;
      if (aa > bb) return 1;
      return 0;
    }
    return safeString(a).localeCompare(safeString(b), undefined, { numeric: true, sensitivity: 'base' });
  };

  const toInt = (s) => {
    const t = safeString(s).trim();
    if (!t) return 0;
    const n = parseInt(t, 10);
    return Number.isFinite(n) ? n : 0;
  };

  const compareStates = (a, b) => {
    const innA = a?.shop_inn ?? a?.snapshot?.shopInn ?? a?.snapshot?.shop_inn;
    const innB = b?.shop_inn ?? b?.snapshot?.shopInn ?? b?.snapshot?.shop_inn;
    const innCmp = compareMaybeBigInt(innA, innB);
    if (innCmp !== 0) return innCmp;

    const shopCmp = toInt(getShopNumber(a)) - toInt(getShopNumber(b));
    if (shopCmp !== 0) return shopCmp;

    const posCmp = toInt(getPosNumber(a)) - toInt(getPosNumber(b));
    return posCmp;
  };

  const getFiscalUnsentCount = (state) => {
    const f = state?.snapshot?.fiscal;
    if (!f) return null;
    if (f.unsentCount !== undefined) return f.unsentCount;
    if (f.unsent_count !== undefined) return f.unsent_count;
    return null;
  };

  const getZMetrics = (state) => {
    const f = state?.snapshot?.fiscal;
    if (!f) return null;
	  const zCount =
		f.zReportCount ??
		f.z_report_count ??
		f.zCount;

	  const zMax =
		f.zReportMaxCount ??
		f.z_report_max_count ??
		f.zMax;

	  const zRemaining =
		f.zReportsRemaining ??
		f.z_reports_remaining ??
		f.zRemaining ??
		(zMax != null && zCount != null ? zMax - zCount : undefined);

	  if (zCount == null && zMax == null) return null;

	  return { zCount, zMax, zRemaining };
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Состояние POS - Fiscal Monitor</title>
      </Head>

      <AdminLayout>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Состояние POS</h1>
            <p className="text-gray-600">Детальная информация по терминалам</p>
          </div>
          <div className="flex items-center gap-2">
            {selectedInn && (
              <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                </svg>
                ИНН: {selectedInn}
              </span>
            )}
            {selectedShopNumber && (
              <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                </svg>
                Магазин: {selectedShopNumber}
              </span>
            )}
            {router.query.severity && (
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                router.query.severity.toUpperCase() === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                router.query.severity.toUpperCase() === 'DANGER' ? 'bg-orange-100 text-orange-800' :
                router.query.severity.toUpperCase() === 'WARN' ? 'bg-yellow-100 text-yellow-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                </svg>
                {router.query.severity.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">
              {states.length} {states.length === 1 ? 'терминал' : states.length < 5 ? 'терминала' : 'терминалов'}
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={handleExportExcel}
                disabled={exporting || states.length === 0}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Экспорт...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Экспорт в Excel
                  </>
                )}
              </button>
              {(selectedInn || selectedShopNumber || router.query.severity) && (
                <button
                  onClick={() => router.push('/admin/state')}
                  className="text-white hover:text-blue-100 text-sm font-medium inline-flex items-center transition-colors bg-white bg-opacity-20 px-3 py-1 rounded-lg"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Сбросить фильтры
                </button>
              )}
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {states.map((state) => (
              <div key={state.state_key} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      {state.shop_name || 'Без названия'}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600 font-mono">
                      <span className="bg-gray-100 px-2 py-0.5 rounded">ИНН: {state.shop_inn}</span>
                      <span className="bg-gray-100 px-2 py-0.5 rounded">Магазин: {getShopNumber(state)}</span>
                      <span className="bg-gray-100 px-2 py-0.5 rounded">Касса: {getPosNumber(state)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {state.severity && (
                      <span className={`px-4 py-2 rounded-lg text-sm font-bold border-2 ${getSeverityColor(state.severity)}`}>
                        {state.severity}
                      </span>
                    )}
                    <button
                      onClick={() => setDeleteModal({ open: true, state })}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Удалить кассу"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Обновлено</div>
                    <div className="text-sm text-gray-900">{formatDate(state.updated_at)}</div>
                  </div>
                  {state.pos_ip && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1">IP адрес</div>
                      <div className="text-sm text-gray-900 font-mono">{state.pos_ip}</div>
                    </div>
                  )}
                  {state.snapshot?.fiscal?.terminalId && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Терминал</div>
                      <div className="text-sm text-gray-900 font-mono">{state.snapshot.fiscal.terminalId}</div>
                    </div>
                  )}
                </div>

                {state.snapshot?.fiscal && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Чеки</div>
                        <div className="text-sm text-gray-900">
                          {state.snapshot.fiscal.receiptCount ?? 0} / {state.snapshot.fiscal.receiptMaxCount ?? '∞'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Не отправлено</div>
                        <div className="text-sm text-gray-900">{getFiscalUnsentCount(state) ?? '-'}</div>
                      </div>
                      {(() => {
                        const z = getZMetrics(state);
                        if (!z) return null;
                        return (
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Смены (Z-отчёты)</div>
                            <div className="text-sm text-gray-900">{z.zCount} / {z.zMax}</div>
                            {z.zRemaining != null && (
                              <div className="text-xs text-gray-500 mt-1">{z.zRemaining} осталось</div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <div className="text-xs text-gray-500 mb-1">Статус регистрации</div>
                  <div className="text-sm">
                    {state.is_registered ? (
                      <span className="text-green-600">✓ Зарегистрирован</span>
                    ) : (
                      <span className="text-gray-500">Не зарегистрирован</span>
                    )}
                  </div>
                </div>

                {state.snapshot?.alerts && state.snapshot.alerts.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Алерты</h4>
                    <div className="space-y-2">
                      {state.snapshot.alerts.map((alert, idx) => (
                        <div key={idx} className="flex items-start">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium mr-2 ${getSeverityColor(alert.severity)}`}>
                            {alert.severity}
                          </span>
                          <div className="flex-1">
                            <div className="text-sm text-gray-900">{alert.type}</div>
                            {alert.message && (
                              <div className="text-xs text-gray-600">{alert.message}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {deleteModal.open && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Удалить кассу?
              </h3>
              <div className="mb-4 text-sm text-gray-600">
                <p className="mb-2">
                  <strong>{deleteModal.state?.shop_name || 'Без названия'}</strong>
                </p>
                <p className="font-mono text-xs bg-gray-100 p-2 rounded">
                  ИНН: {deleteModal.state?.shop_inn} | 
                  Магазин: {getShopNumber(deleteModal.state)} | 
                  Касса: {getPosNumber(deleteModal.state)}
                </p>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                Если агент снова отправит данные, касса появится как новая запись.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleDelete(false)}
                  disabled={deleting}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? 'Удаление...' : 'Удалить кассу'}
                </button>
                <button
                  onClick={() => handleDelete(true)}
                  disabled={deleting}
                  className="w-full px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900 disabled:opacity-50"
                >
                  {deleting ? 'Удаление...' : 'Удалить с историей событий'}
                </button>
                <button
                  onClick={() => setDeleteModal({ open: false, state: null })}
                  disabled={deleting}
                  className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </>
  );
}
