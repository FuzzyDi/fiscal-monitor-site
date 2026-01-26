import axios from 'axios';

// ВАЖНО: пустая строка допустима и означает "same-origin" (unified endpoint через nginx/tunnel).
// Поэтому нельзя использовать || для дефолта.
const raw = process.env.NEXT_PUBLIC_API_URL;
const API_URL = raw !== undefined
  ? String(raw).trim()
  : (process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : '');

// Admin API
export const adminApi = {
  getOverview: (key) =>
    axios.get(`${API_URL}/api/v1/admin/overview`, {
      headers: { 'X-Admin-Key': key }
    }),

  getInns: (key) =>
    axios.get(`${API_URL}/api/v1/admin/inns`, {
      headers: { 'X-Admin-Key': key }
    }),

  getDashboardShops: (key) =>
    axios.get(`${API_URL}/api/v1/admin/dashboard/shops`, {
      headers: { 'X-Admin-Key': key }
    }),

  getState: (key, shopInn = null, shopNumber = null, severity = null, limit = null) => {
    const params = {};
    if (shopInn) params.shopInn = shopInn;
    if (shopNumber !== null && shopNumber !== undefined && String(shopNumber).trim() !== '') params.shopNumber = shopNumber;
    if (severity) params.severity = severity;
    if (limit) params.limit = limit;
    return axios.get(`${API_URL}/api/v1/admin/state`, {
      headers: { 'X-Admin-Key': key },
      params
    });
  },

  getRegistrations: (key) =>
    axios.get(`${API_URL}/api/v1/admin/registrations`, {
      headers: { 'X-Admin-Key': key }
    }),

  createRegistration: (key, data) =>
    axios.post(`${API_URL}/api/v1/admin/registrations`, data, {
      headers: { 'X-Admin-Key': key }
    }),

  updateRegistration: (key, shopInn, data) =>
    axios.put(`${API_URL}/api/v1/admin/registrations/${encodeURIComponent(shopInn)}`, data, {
      headers: { 'X-Admin-Key': key }
    }),

  deleteRegistration: (key, shopInn) =>
    axios.delete(`${API_URL}/api/v1/admin/registrations/${encodeURIComponent(shopInn)}`, {
      headers: { 'X-Admin-Key': key }
    }),

  getTokens: (key, shopInn = null) =>
    axios.get(`${API_URL}/api/v1/admin/tokens`, {
      headers: { 'X-Admin-Key': key },
      params: shopInn ? { shopInn } : {}
    }),

  issueToken: (key, data) =>
    axios.post(`${API_URL}/api/v1/admin/tokens`, data, {
      headers: { 'X-Admin-Key': key }
    }),

  updateToken: (key, token, data) =>
    axios.put(`${API_URL}/api/v1/admin/tokens/${encodeURIComponent(token)}`, data, {
      headers: { 'X-Admin-Key': key }
    }),

  revokeToken: (key, token) =>
    axios.delete(`${API_URL}/api/v1/admin/tokens/${encodeURIComponent(token)}`, {
      headers: { 'X-Admin-Key': key }
    }),

  // Telegram methods
  getTelegramRequests: (key, status = 'pending') =>
    axios.get(`${API_URL}/api/v1/admin/telegram/requests`, {
      headers: { 'X-Admin-Key': key },
      params: { status }
    }),

  getTelegramSubscriptions: (key) =>
    axios.get(`${API_URL}/api/v1/admin/telegram/subscriptions`, {
      headers: { 'X-Admin-Key': key }
    }),

  approveTelegramRequest: (key, requestId, data) =>
    axios.post(`${API_URL}/api/v1/admin/telegram/approve-request/${requestId}`, data, {
      headers: { 'X-Admin-Key': key }
    }),

  rejectTelegramRequest: (key, requestId, data) =>
    axios.post(`${API_URL}/api/v1/admin/telegram/reject-request/${requestId}`, data, {
      headers: { 'X-Admin-Key': key }
    }),

  extendTelegramSubscription: (key, subscriptionId, data) =>
    axios.post(`${API_URL}/api/v1/admin/telegram/extend-subscription/${subscriptionId}`, data, {
      headers: { 'X-Admin-Key': key }
    }),

  cancelTelegramSubscription: (key, subscriptionId) =>
    axios.post(`${API_URL}/api/v1/admin/telegram/cancel-subscription/${subscriptionId}`, {}, {
      headers: { 'X-Admin-Key': key }
    }),

  exportTelegramSubscriptions: (key) =>
    axios.get(`${API_URL}/api/v1/admin/telegram/export/subscriptions`, {
      headers: { 'X-Admin-Key': key },
      responseType: 'blob'
    })
};

// Portal API
export const portalApi = {
  getState: (token) =>
    axios.get(`${API_URL}/api/v1/portal/state`, {
      headers: { 'X-Token': token }
    }),

  getSummary: (token) =>
    axios.get(`${API_URL}/api/v1/portal/summary`, {
      headers: { 'X-Token': token }
    })
};

// Ingest API (for testing)
export const ingestApi = {
  sendSnapshot: (snapshot) =>
    axios.post(`${API_URL}/api/v1/fiscal/snapshot`, snapshot)
};
