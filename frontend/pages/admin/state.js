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
      
      // Filter by severity if provided (server already filters, but keep as safety)
      if (severity) {
        filteredStates = filteredStates.filter(state =>
          state.severity && state.severity.toUpperCase() === severity.toUpperCase()
        );
      }

      // Filter by shop number if provided (server already filters, but keep as safety)
      if (shopNumber !== null && shopNumber !== undefined && String(shopNumber).trim() !== '') {
        const sn = String(shopNumber).trim();
        filteredStates = filteredStates.filter(state => String(getShopNumber(state)) === sn);
      }

      // Stable default sort: INN -> Shop number -> POS (cash) number.
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

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename with current date and filters
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
    if (typeof window === 'undefined') return ''; // Skip SSR
    return new Date(dateStr).toLocaleString();
  };

  const getShopNumber = (state) => {
    const v = state?.snapshot?.shopNumber ?? state?.shop_number;
    return (v === undefined || v === null || v === '') ? '0' : String(v);
  };

  const getPosNumber = (state) => {
    const v = state?.snapshot?.posNumber ?? state?.pos_number;
    return (v === undefined || v === null || v === '') ? '0' : String(v);
  };

  // Default ordering for /admin/state:
  // 1) INN (shop_inn) asc
  // 2) Shop number asc
  // 3) POS (cash) number asc
  // Note: we keep the sort robust to missing/non-numeric values.
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
    // Fallback: natural-ish string comparison.
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
    if (posCmp !== 0) return posCmp;

    // Deterministic tie-breaker.
    return safeString(a?.state_key).localeCompare(safeString(b?.state_key), undefined, { numeric: true, sensitivity: 'base' });
  };

  const getFiscalUnsentCount = (state) => {
    const v = state?.snapshot?.fiscal?.unsentCount;
    return typeof v === 'number' ? v : null;
  };

  const getZMetrics = (state) => {
    const fiscal = state?.snapshot?.fiscal;
    if (!fiscal || typeof fiscal !== 'object') return null;
    const zCount = (typeof fiscal.zReportCount === 'number') ? fiscal.zReportCount : fiscal.zCount;
    const zMax = (typeof fiscal.zReportMaxCount === 'number') ? fiscal.zReportMaxCount : fiscal.zMax;
    if (typeof zCount !== 'number' || typeof zMax !== 'number') return null;
    const zRemaining = (typeof fiscal.zRemaining === 'number') ? fiscal.zRemaining : (zMax - zCount);
    return { zCount, zMax, zRemaining };
  };

  const getFiscalField = (fiscal, key, fallbackKey) => {
    if (!fiscal) return undefined;
    if (fiscal[key] !== undefined) return fiscal[key];
    if (fallbackKey && fiscal[fallbackKey] !== undefined) return fiscal[fallbackKey];
    return undefined;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <Head>
        <title>State View - Admin - Fiscal Monitor</title>
      </Head>

      <AdminLayout>
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">POS State</h1>
          <div className="flex items-center gap-3">
            {selectedInn && (
              <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                </svg>
                INN: {selectedInn}
              </span>
            )}
            {selectedShopNumber && (
              <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                </svg>
                Shop: {selectedShopNumber}
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
              {states.length} POS Terminal{states.length !== 1 ? 's' : ''}
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
                  Clear Filters
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
                      {state.shop_name || 'Unnamed Shop'}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600 font-mono">
                      <span className="bg-gray-100 px-2 py-0.5 rounded">INN: {state.shop_inn}</span>
                      <span className="bg-gray-100 px-2 py-0.5 rounded">Shop: {getShopNumber(state)}</span>
                      <span className="bg-gray-100 px-2 py-0.5 rounded">POS: {getPosNumber(state)}</span>
                    </div>
                  </div>
                  {state.severity && (
                    <span className={`px-4 py-2 rounded-lg text-sm font-bold border-2 ${getSeverityColor(state.severity)}`}>
                      {state.severity}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Last Update</div>
                    <div className="text-sm text-gray-900">{formatDate(state.updated_at)}</div>
                  </div>
                  {state.pos_ip && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1">POS IP</div>
                      <div className="text-sm text-gray-900 font-mono">{state.pos_ip}</div>
                    </div>
                  )}
                  {state.snapshot?.fiscal?.terminalId && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Terminal ID</div>
                      <div className="text-sm text-gray-900 font-mono">{state.snapshot.fiscal.terminalId}</div>
                    </div>
                  )}
                </div>

                {state.snapshot?.fiscal && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Receipts</div>
                        <div className="text-sm text-gray-900">
                          {state.snapshot.fiscal.receiptCount ?? 0} / {state.snapshot.fiscal.receiptMaxCount ?? '∞'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Unsent</div>
                        <div className="text-sm text-gray-900">{getFiscalUnsentCount(state) ?? '-'}</div>
                      </div>
                      {(() => {
                        const z = getZMetrics(state);
                        if (!z) return null;
                        return (
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Shifts (Z Reports)</div>
                            <div className="text-sm text-gray-900">{z.zCount} / {z.zMax}</div>
                            {typeof z.zRemaining === 'number' && (
                              <div className="text-xs text-gray-500 mt-1">{z.zRemaining} remaining</div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <div className="text-xs text-gray-500 mb-1">Registration Status</div>
                  <div className="text-sm">
                    {state.is_registered ? (
                      <span className="text-green-600">✓ Registered</span>
                    ) : (
                      <span className="text-gray-500">Not Registered</span>
                    )}
                  </div>
                </div>

                {state.snapshot?.alerts && state.snapshot.alerts.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Alerts</h4>
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
      </AdminLayout>
    </>
  );
}
