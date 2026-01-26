import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { adminApi } from '../../lib/api';
import AdminLayout from '../../components/AdminLayout';

const safeString = (v) => (v === undefined || v === null) ? '' : String(v);

const compareInn = (a, b) => {
  return safeString(a).localeCompare(safeString(b), undefined, { numeric: true, sensitivity: 'base' });
};

const severityOrder = (sev) => {
  const s = safeString(sev).toUpperCase();
  if (s === 'CRITICAL') return 4;
  if (s === 'DANGER') return 3;
  if (s === 'WARN') return 2;
  if (s === 'INFO') return 1;
  return 0;
};

const severityBadgeClass = (severity) => {
  const s = safeString(severity).toUpperCase();
  if (s === 'CRITICAL') return 'bg-red-100 text-red-800 border-red-200';
  if (s === 'DANGER') return 'bg-orange-100 text-orange-800 border-orange-200';
  if (s === 'WARN') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  if (s === 'INFO') return 'bg-blue-100 text-blue-800 border-blue-200';
  return 'bg-gray-100 text-gray-800 border-gray-200';
};

export default function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [inns, setInns] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState(null);
  const [activeTab, setActiveTab] = useState('shops');
  const router = useRouter();

  useEffect(() => {
    const adminKey = localStorage.getItem('adminKey');
    if (!adminKey) {
      router.push('/admin/login');
      return;
    }

    fetchData(adminKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async (key) => {
    try {
      setLoading(true);
      const [overviewRes, innsRes, shopsRes] = await Promise.all([
        adminApi.getOverview(key),
        adminApi.getInns(key),
        adminApi.getDashboardShops(key),
      ]);

      setOverview(overviewRes.data);
      setInns(Array.isArray(innsRes.data?.inns) ? innsRes.data.inns : []);
      setShops(Array.isArray(shopsRes.data?.shops) ? shopsRes.data.shops : []);
      setError('');
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('adminKey');
        router.push('/admin/login');
      } else {
        setError('Failed to load data');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (typeof window === 'undefined') return '';
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString();
  };

  const handleFilterClick = (filter) => {
    if (activeFilter === filter) {
      setActiveFilter(null);
    } else {
      setActiveFilter(filter);
    }
    router.push(`/admin/state?severity=${filter.toLowerCase()}`);
  };

  const sortedInns = useMemo(() => {
    const arr = Array.isArray(inns) ? [...inns] : [];
    arr.sort((a, b) => compareInn(a?.shop_inn, b?.shop_inn));
    return arr;
  }, [inns]);

  const sortedShops = useMemo(() => {
    const arr = Array.isArray(shops) ? [...shops] : [];
    arr.sort((a, b) => {
      const innCmp = compareInn(a?.shop_inn, b?.shop_inn);
      if (innCmp !== 0) return innCmp;
      const an = Number.isFinite(Number(a?.shop_number)) ? Number(a.shop_number) : 0;
      const bn = Number.isFinite(Number(b?.shop_number)) ? Number(b.shop_number) : 0;
      return an - bn;
    });
    return arr;
  }, [shops]);

  const renderRegistered = (row) => {
    if (row?.is_registered) {
      return (
        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold inline-flex items-center">
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Registered
        </span>
      );
    }
    return (
      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">
        Unregistered
      </span>
    );
  };

  const renderWorstSeverity = (sev) => {
    const s = safeString(sev).toUpperCase() || 'INFO';
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${severityBadgeClass(s)}`}>
        {s}
      </span>
    );
  };

  const innDisplayName = (innRow) => {
    if (innRow?.shop_name) return innRow.shop_name;
    const sc = innRow?.shop_count;
    if (Number.isFinite(Number(sc)) && Number(sc) > 1) return `Multiple shops (${Number(sc)})`;
    return innRow?.registration_title || '—';
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
        <title>Admin Dashboard - Fiscal Monitor</title>
      </Head>

      <AdminLayout>
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">System overview and real-time statistics</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {overview && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Total INNs Card */}
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white transform transition-all hover:scale-105 hover:shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-medium opacity-90">Total INNs</div>
                  <div className="bg-white bg-opacity-20 rounded-lg p-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
                <div className="text-4xl font-bold mb-2">{overview.totalInns}</div>
                <div className="text-sm opacity-90">
                  <span className="font-semibold">{overview.registeredInns}</span> registered •
                  <span className="font-semibold"> {overview.unregisteredInns}</span> unregistered
                </div>
              </div>

              {/* Critical Card */}
              <button
                onClick={() => handleFilterClick('CRITICAL')}
                className={`bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white transform transition-all hover:scale-105 hover:shadow-xl text-left ${
                  activeFilter === 'CRITICAL' ? 'ring-4 ring-red-300 scale-105' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-medium opacity-90">Critical</div>
                  <div className="bg-white bg-opacity-20 rounded-lg p-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                </div>
                <div className="text-4xl font-bold mb-2">{overview.criticalCount}</div>
                <div className="text-sm opacity-90 flex items-center">
                  Requires immediate attention
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>

              {/* Danger Card */}
              <button
                onClick={() => handleFilterClick('DANGER')}
                className={`bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white transform transition-all hover:scale-105 hover:shadow-xl text-left ${
                  activeFilter === 'DANGER' ? 'ring-4 ring-orange-300 scale-105' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-medium opacity-90">Danger</div>
                  <div className="bg-white bg-opacity-20 rounded-lg p-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                </div>
                <div className="text-4xl font-bold mb-2">{overview.dangerCount}</div>
                <div className="text-sm opacity-90 flex items-center">
                  Action needed soon
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>

              {/* Warning Card */}
              <button
                onClick={() => handleFilterClick('WARN')}
                className={`bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-6 text-white transform transition-all hover:scale-105 hover:shadow-xl text-left ${
                  activeFilter === 'WARN' ? 'ring-4 ring-yellow-300 scale-105' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-medium opacity-90">Warning</div>
                  <div className="bg-white bg-opacity-20 rounded-lg p-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="text-4xl font-bold mb-2">{overview.warnCount}</div>
                <div className="text-sm opacity-90 flex items-center">
                  Monitor closely
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            </div>

            {/* Tabs */}
            <div className="mb-6 flex flex-wrap gap-2">
              <button
                onClick={() => setActiveTab('shops')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                  activeTab === 'shops'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'
                }`}
              >
                By Shops
              </button>
              <button
                onClick={() => setActiveTab('inns')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                  activeTab === 'inns'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'
                }`}
              >
                By INN
              </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <h2 className="text-xl font-semibold text-white">
                  {activeTab === 'shops' ? 'Stores' : 'Companies'}
                </h2>
                <p className="text-blue-100 text-sm mt-1">
                  {activeTab === 'shops'
                    ? 'One row per INN + shop number'
                    : 'One row per INN (company-level)'}
                </p>
              </div>

              <div className="overflow-x-auto">
                {activeTab === 'shops' ? (
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">INN</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Shop #</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Shop Name</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Registered</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Worst</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">POS</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Last Seen</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {sortedShops.map((s) => (
                        <tr key={`${s.shop_inn}:${s.shop_number}`} className="hover:bg-blue-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-mono font-medium text-gray-900">{s.shop_inn}</td>
                          <td className="px-6 py-4 text-sm font-mono text-gray-900">{Number.isFinite(Number(s.shop_number)) ? s.shop_number : 0}</td>
                          <td className="px-6 py-4 text-sm text-gray-900 font-medium">{s.shop_name || s.registration_title || '—'}</td>
                          <td className="px-6 py-4 text-sm">{renderRegistered(s)}</td>
                          <td className="px-6 py-4 text-sm">
                            <div className="flex items-center gap-2">
                              {renderWorstSeverity(s.worst_severity)}
                              <span className="text-xs text-gray-500">
                                C:{s.critical_count || 0} D:{s.danger_count || 0} W:{s.warn_count || 0} I:{s.info_count || 0}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {s.pos_count || 0} POS
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">{formatDate(s.last_seen)}</td>
                          <td className="px-6 py-4 text-sm">
                            <button
                              onClick={() => router.push(`/admin/state?inn=${encodeURIComponent(s.shop_inn)}&shopNumber=${encodeURIComponent(String(s.shop_number))}`)}
                              className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center transition-colors"
                            >
                              View POS
                              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">INN</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Company / Shop Name</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Registered</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Shops</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">POS</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Worst</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Last Seen</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {sortedInns.map((inn) => (
                        <tr key={inn.shop_inn} className="hover:bg-blue-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-mono font-medium text-gray-900">{inn.shop_inn}</td>
                          <td className="px-6 py-4 text-sm text-gray-900 font-medium">{innDisplayName(inn)}</td>
                          <td className="px-6 py-4 text-sm">{renderRegistered(inn)}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">{inn.shop_count || 0}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {inn.pos_count || 0} POS
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div className="flex items-center gap-2">
                              {renderWorstSeverity(inn.worst_severity)}
                              <span className="text-xs text-gray-500">
                                C:{inn.critical_count || 0} D:{inn.danger_count || 0} W:{inn.warn_count || 0} I:{inn.info_count || 0}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">{formatDate(inn.last_seen)}</td>
                          <td className="px-6 py-4 text-sm">
                            <button
                              onClick={() => router.push(`/admin/state?inn=${encodeURIComponent(inn.shop_inn)}`)}
                              className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center transition-colors"
                            >
                              View POS
                              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}
      </AdminLayout>
    </>
  );
}
