import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { portalApi } from '../../lib/api';

export default function Portal() {
  const [summary, setSummary] = useState(null);
  const [states, setStates] = useState([]);
  const [filteredStates, setFilteredStates] = useState([]);
  const [activeFilter, setActiveFilter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('portalToken');
    if (!token) {
      router.push('/portal/login');
      return;
    }

    fetchData(token);
    const interval = setInterval(() => fetchData(token), 30000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Apply filter when activeFilter or states change
    if (activeFilter) {
      const filtered = states.filter(state => {
        if (activeFilter === 'STALE') {
          return state.isStale;
        }
        return state.severity && state.severity.toUpperCase() === activeFilter;
      });
      setFilteredStates(filtered);
    } else {
      setFilteredStates(states);
    }
  }, [activeFilter, states]);

  const fetchData = async (token) => {
    try {
      setLoading(true);
      const [summaryRes, statesRes] = await Promise.all([
        portalApi.getSummary(token),
        portalApi.getState(token)
      ]);
      
      setSummary(summaryRes.data);
      const rawStates = Array.isArray(statesRes?.data?.states) ? statesRes.data.states : [];
      const sortedStates = [...rawStates].sort(compareStates);
      setStates(sortedStates);
      // Don't reset filter here - keep it if user has one active
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('portalToken');
        router.push('/portal/login');
      } else {
        setError('Failed to load data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFilterClick = (filter) => {
    if (activeFilter === filter) {
      setActiveFilter(null); // Remove filter if clicking the same one
    } else {
      setActiveFilter(filter);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('portalToken');
    router.push('/portal/login');
  };

  const formatDate = (dateString) => {
    if (typeof window === 'undefined') return ''; // Skip SSR
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
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

  const isDigitsOnly = (s) => {
    const t = safeString(s).trim();
    return !!t && /^\d+$/.test(t);
  };

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

  const getSeverityColor = (severity) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-gradient-to-r from-red-500 to-red-600 text-white border-red-600';
      case 'DANGER':
        return 'bg-gradient-to-r from-orange-500 to-orange-600 text-white border-orange-600';
      case 'WARN':
        return 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white border-yellow-600';
      case 'INFO':
        return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-600';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'DANGER':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
          </svg>
        );
      case 'WARN':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  if (loading && !summary) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Client Portal - Fiscal Monitor</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50" suppressHydrationWarning>
        {/* Header */}
        <nav className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h1 className="text-lg font-bold text-gray-900">Fiscal Monitor</h1>
                  {summary && (
                    <p className="text-xs text-gray-500">INN: {summary.shopInn}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push('/portal/telegram')}
                  className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.223-.548.223l.188-2.85 5.18-4.68c.223-.198-.054-.308-.346-.11l-6.4 4.03-2.76-.918c-.6-.187-.612-.6.125-.89l10.782-4.156c.5-.18.94.12.78.89z"/>
                  </svg>
                  Telegram
                </button>
                <button
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-gray-900 font-medium inline-flex items-center px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h2 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h2>
            <p className="text-gray-600">Real-time monitoring of your POS terminals</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-600 font-medium">{error}</p>
            </div>
          )}

          {summary && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-5 text-white">
                  <div className="text-sm font-medium opacity-90 mb-2">Total POS</div>
                  <div className="text-3xl font-bold">{summary.totalPos}</div>
                </div>

                <button
                  onClick={() => handleFilterClick('CRITICAL')}
                  className={`bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-5 text-white text-left transform transition-all hover:scale-105 hover:shadow-xl ${
                    activeFilter === 'CRITICAL' ? 'ring-4 ring-red-300 scale-105' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium opacity-90">Critical</div>
                    {activeFilter === 'CRITICAL' && (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="text-3xl font-bold">{summary.criticalCount}</div>
                  <div className="text-xs opacity-75 mt-1">Click to filter</div>
                </button>

                <button
                  onClick={() => handleFilterClick('DANGER')}
                  className={`bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-5 text-white text-left transform transition-all hover:scale-105 hover:shadow-xl ${
                    activeFilter === 'DANGER' ? 'ring-4 ring-orange-300 scale-105' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium opacity-90">Danger</div>
                    {activeFilter === 'DANGER' && (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="text-3xl font-bold">{summary.dangerCount}</div>
                  <div className="text-xs opacity-75 mt-1">Click to filter</div>
                </button>

                <button
                  onClick={() => handleFilterClick('WARN')}
                  className={`bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-5 text-white text-left transform transition-all hover:scale-105 hover:shadow-xl ${
                    activeFilter === 'WARN' ? 'ring-4 ring-yellow-300 scale-105' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium opacity-90">Warning</div>
                    {activeFilter === 'WARN' && (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="text-3xl font-bold">{summary.warnCount}</div>
                  <div className="text-xs opacity-75 mt-1">Click to filter</div>
                </button>

                <button
                  onClick={() => handleFilterClick('INFO')}
                  className={`bg-gradient-to-br from-blue-400 to-blue-500 rounded-xl shadow-lg p-5 text-white text-left transform transition-all hover:scale-105 hover:shadow-xl ${
                    activeFilter === 'INFO' ? 'ring-4 ring-blue-300 scale-105' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium opacity-90">Info</div>
                    {activeFilter === 'INFO' && (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="text-3xl font-bold">{summary.infoCount}</div>
                  <div className="text-xs opacity-75 mt-1">Click to filter</div>
                </button>

                <button
                  onClick={() => handleFilterClick('STALE')}
                  className={`bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl shadow-lg p-5 text-white text-left transform transition-all hover:scale-105 hover:shadow-xl ${
                    activeFilter === 'STALE' ? 'ring-4 ring-gray-300 scale-105' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium opacity-90">Stale</div>
                    {activeFilter === 'STALE' && (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="text-3xl font-bold">{summary.staleCount}</div>
                  <div className="text-xs opacity-75 mt-1">&gt;15m • Click to filter</div>
                </button>
              </div>

              {/* POS Terminals */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-white">
                        POS Terminals
                      </h3>
                      {activeFilter && (
                        <p className="text-indigo-100 text-sm mt-1">
                          Filtered by: {activeFilter}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      {activeFilter ? (
                        <>
                          <span className="text-white font-medium">
                            {filteredStates.length} of {states.length} terminals
                          </span>
                          <button
                            onClick={() => setActiveFilter(null)}
                            className="text-white hover:text-indigo-100 text-sm font-medium inline-flex items-center transition-colors bg-white bg-opacity-20 px-3 py-1 rounded-lg"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Clear Filter
                          </button>
                        </>
                      ) : (
                        <span className="text-indigo-100 text-sm">
                          Last update: {summary.lastUpdate ? formatDate(summary.lastUpdate) : 'Never'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-gray-200">
                  {filteredStates.length === 0 ? (
                    <div className="p-12 text-center">
                      {activeFilter ? (
                        <>
                          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <p className="text-gray-500 font-medium">No {activeFilter} terminals found</p>
                          <p className="text-gray-400 text-sm mt-1">Try a different filter</p>
                          <button
                            onClick={() => setActiveFilter(null)}
                            className="mt-4 text-indigo-600 hover:text-indigo-800 font-medium"
                          >
                            Clear filter
                          </button>
                        </>
                      ) : (
                        <>
                          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                          </svg>
                          <p className="text-gray-500 font-medium">No POS terminals found</p>
                          <p className="text-gray-400 text-sm mt-1">Waiting for first snapshot...</p>
                        </>
                      )}
                    </div>
                  ) : (
                    filteredStates.map((state) => (
                      <div key={state.state_key} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h4 className="text-xl font-bold text-gray-900 mb-1">
                              {state.shop_name || 'Unnamed Shop'}
                            </h4>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <span className="bg-gray-100 px-2 py-0.5 rounded font-mono">Shop: {getShopNumber(state)}</span>
                              <span className="bg-gray-100 px-2 py-0.5 rounded font-mono">POS: {getPosNumber(state)}</span>
                            </div>
                          </div>
                          {state.severity && (
                            <div className={`px-4 py-2 rounded-lg font-bold text-sm shadow-md flex items-center gap-2 ${getSeverityColor(state.severity)}`}>
                              {getSeverityIcon(state.severity)}
                              {state.severity}
                            </div>
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
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4 pb-4 border-b border-gray-200">
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
                        )}

                        {state.snapshot?.alerts && state.snapshot.alerts.length > 0 && (
                          <div className="space-y-2">
                            {state.snapshot.alerts.map((alert, idx) => (
                              <div
                                key={idx}
                                className={`p-3 rounded-lg border-l-4 ${
                                  alert.severity === 'CRITICAL'
                                    ? 'bg-red-50 border-red-500'
                                    : alert.severity === 'DANGER'
                                    ? 'bg-orange-50 border-orange-500'
                                    : alert.severity === 'WARN'
                                    ? 'bg-yellow-50 border-yellow-500'
                                    : 'bg-blue-50 border-blue-500'
                                }`}
                              >
                                <div className="flex items-start">
                                  <div className={`flex-shrink-0 ${
                                    alert.severity === 'CRITICAL'
                                      ? 'text-red-600'
                                      : alert.severity === 'DANGER'
                                      ? 'text-orange-600'
                                      : alert.severity === 'WARN'
                                      ? 'text-yellow-600'
                                      : 'text-blue-600'
                                  }`}>
                                    {getSeverityIcon(alert.severity)}
                                  </div>
                                  <div className="ml-3 flex-1">
                                    <p className={`text-sm font-semibold ${
                                      alert.severity === 'CRITICAL'
                                        ? 'text-red-900'
                                        : alert.severity === 'DANGER'
                                        ? 'text-orange-900'
                                        : alert.severity === 'WARN'
                                        ? 'text-yellow-900'
                                        : 'text-blue-900'
                                    }`}>
                                      {alert.severity}: {alert.type}
                                    </p>
                                    <p className={`text-sm mt-1 ${
                                      alert.severity === 'CRITICAL'
                                        ? 'text-red-700'
                                        : alert.severity === 'DANGER'
                                        ? 'text-orange-700'
                                        : alert.severity === 'WARN'
                                        ? 'text-yellow-700'
                                        : 'text-blue-700'
                                    }`}>
                                      {alert.message}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
