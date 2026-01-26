import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { adminApi } from '../../lib/api';
import AdminLayout from '../../components/AdminLayout';

export default function AdminTokens() {
  const [tokens, setTokens] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ shopInn: '', label: '' });
  const [formError, setFormError] = useState('');
  const [newToken, setNewToken] = useState(null);
  const [editToken, setEditToken] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [revokeConfirm, setRevokeConfirm] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedToken, setCopiedToken] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const adminKey = localStorage.getItem('adminKey');
    if (!adminKey) {
      router.push('/admin/login');
      return;
    }

    const { inn } = router.query;
    if (inn) {
      setFormData(prev => ({ ...prev, shopInn: inn }));
    }

    fetchData(adminKey, inn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query]);

  const fetchData = async (key, inn = null) => {
    try {
      setLoading(true);
      const [tokensRes, regsRes] = await Promise.all([
        adminApi.getTokens(key, inn),
        adminApi.getRegistrations(key)
      ]);
      setTokens(tokensRes.data.tokens);
      setRegistrations(regsRes.data.registrations.filter(r => r.is_active));
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('adminKey');
        router.push('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setNewToken(null);
    setActionLoading(true);

    const adminKey = localStorage.getItem('adminKey');
    if (!adminKey) return;

    try {
      const res = await adminApi.issueToken(adminKey, formData);
      setNewToken(res.data.token);
      setShowForm(false);
      setFormData({ shopInn: router.query.inn || '', label: '' });
      fetchData(adminKey, router.query.inn);
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to issue token');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editToken || !editLabel.trim()) return;

    setActionLoading(true);
    const adminKey = localStorage.getItem('adminKey');
    if (!adminKey) return;

    try {
      await adminApi.updateToken(adminKey, editToken.token, { label: editLabel });
      setEditToken(null);
      setEditLabel('');
      fetchData(adminKey, router.query.inn);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update token');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevoke = async (token) => {
    const adminKey = localStorage.getItem('adminKey');
    if (!adminKey) return;

    setActionLoading(true);
    try {
      await adminApi.revokeToken(adminKey, token);
      setRevokeConfirm(null);
      fetchData(adminKey, router.query.inn);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to revoke token');
    } finally {
      setActionLoading(false);
    }
  };

  const copyToken = async (token) => {
    try {
      await navigator.clipboard.writeText(token);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch (err) {
      alert('Failed to copy token');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setFormData({ shopInn: router.query.inn || '', label: '' });
    setFormError('');
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString();
  };

  const getFilteredInn = () => {
    const { inn } = router.query;
    if (!inn) return null;
    const reg = registrations.find(r => r.shop_inn === inn) || 
                tokens.find(t => t.shop_inn === inn);
    return reg ? { inn, title: reg.title || reg.registration_title } : { inn, title: inn };
  };

  const filteredInn = getFilteredInn();

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
        <title>Access Tokens - Admin - Fiscal Monitor</title>
      </Head>

      <AdminLayout>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Access Tokens</h1>
            <p className="text-gray-600">Manage client portal access tokens</p>
            {filteredInn && (
              <div className="mt-2 flex items-center gap-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  Filtered by: {filteredInn.title}
                </span>
                <button
                  onClick={() => router.push('/admin/tokens')}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Clear filter
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => {
              if (showForm) {
                handleCancel();
              } else {
                setShowForm(true);
                setNewToken(null);
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {showForm ? 'Cancel' : 'Issue Token'}
          </button>
        </div>

        {newToken && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
            <div className="flex items-start">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mr-4 flex-shrink-0">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-green-900 mb-1">Token Created!</h2>
                <p className="text-sm text-green-700 mb-4">
                  Save this token securely. It won&apos;t be shown again in full.
                </p>
                <div className="bg-white rounded-lg p-4 font-mono text-sm break-all border border-green-300 mb-4">
                  {newToken.token}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => copyToken(newToken.token)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors inline-flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy Token
                  </button>
                  <button
                    onClick={() => setNewToken(null)}
                    className="px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showForm && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Issue New Token</h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Registration (INN) *
                  </label>
                  <select
                    value={formData.shopInn}
                    onChange={(e) => setFormData({ ...formData, shopInn: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select INN</option>
                    {registrations.map((reg) => (
                      <option key={reg.shop_inn} value={reg.shop_inn}>
                        {reg.shop_inn} - {reg.title}
                      </option>
                    ))}
                  </select>
                  {registrations.length === 0 && (
                    <p className="mt-1 text-xs text-amber-600">
                      No active registrations. Create a registration first.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Label *
                  </label>
                  <input
                    type="text"
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    placeholder="e.g., Production Token, Test Access"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>
              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{formError}</p>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={actionLoading || registrations.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {actionLoading ? 'Issuing...' : 'Issue Token'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Edit Token Modal */}
        {editToken && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Token Label</h3>
              <form onSubmit={handleEditSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Token
                  </label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-mono text-sm text-gray-600">
                    {editToken.token.substring(0, 16)}...
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Label *
                  </label>
                  <input
                    type="text"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    autoFocus
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setEditToken(null);
                      setEditLabel('');
                    }}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading || !editLabel.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {actionLoading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Revoke Confirmation Modal */}
        {revokeConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Revoke Token</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-gray-700 mb-2">
                Are you sure you want to revoke this token?
              </p>
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="font-mono text-sm text-gray-900">{revokeConfirm.token.substring(0, 24)}...</p>
                <p className="text-sm text-gray-600">{revokeConfirm.label}</p>
                <p className="text-xs text-gray-500 mt-1">INN: {revokeConfirm.shop_inn}</p>
              </div>
              <p className="text-sm text-red-600 mb-4">
                ⚠️ Users with this token will immediately lose access!
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setRevokeConfirm(null)}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRevoke(revokeConfirm.token)}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {actionLoading ? 'Revoking...' : 'Revoke Token'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
            <h2 className="text-xl font-semibold text-white">
              {tokens.length} Token{tokens.length !== 1 ? 's' : ''}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Token</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">INN</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Label</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Last Used</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {tokens.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No tokens yet. Click &quot;Issue Token&quot; to create one.
                    </td>
                  </tr>
                ) : (
                  tokens.map((token) => (
                    <tr key={token.token} className="hover:bg-purple-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-mono text-gray-900">
                        <span className="bg-gray-100 px-2 py-1 rounded">
                          {token.token.substring(0, 16)}...
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div>
                          <span className="font-mono text-gray-900">{token.shop_inn}</span>
                          {token.registration_title && (
                            <p className="text-xs text-gray-500">{token.registration_title}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">{token.label}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(token.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {token.last_used_at ? (
                          <span className="text-gray-600">{formatDate(token.last_used_at)}</span>
                        ) : (
                          <span className="text-gray-400 italic">Never</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => copyToken(token.token)}
                            className={`p-1.5 rounded transition-colors ${
                              copiedToken === token.token
                                ? 'text-green-600 bg-green-100'
                                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                            }`}
                            title={copiedToken === token.token ? 'Copied!' : 'Copy Token'}
                          >
                            {copiedToken === token.token ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setEditToken(token);
                              setEditLabel(token.label);
                            }}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors"
                            title="Edit Label"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setRevokeConfirm(token)}
                            className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-100 rounded transition-colors"
                            title="Revoke Token"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </AdminLayout>
    </>
  );
}
