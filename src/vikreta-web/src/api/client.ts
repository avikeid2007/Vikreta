import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/authStore';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://localhost:7001';

export const apiClient = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach JWT + tenant slug ──────────────────────────
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { token, tenantSlug } = useAuthStore.getState();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (tenantSlug) config.headers['X-Tenant-Slug'] = tenantSlug;
  return config;
});

// ── Response interceptor: handle 401 ──────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── Typed API helpers ──────────────────────────────────────────────────────

// Auth
export const authApi = {
  login: (tenantSlug: string, email: string, password: string) =>
    apiClient.post('/auth/login', { tenantSlug, email, password }),
  me: () => apiClient.get('/auth/me'),
};

// Locations
export const locationsApi = {
  list: () => apiClient.get('/locations'),
  create: (data: object) => apiClient.post('/locations', data),
  update: (id: string, data: object) => apiClient.put(`/locations/${id}`, data),
};

// Categories
export const categoriesApi = {
  list: () => apiClient.get('/categories'),
  create: (data: object) => apiClient.post('/categories', data),
  update: (id: string, data: object) => apiClient.put(`/categories/${id}`, data),
  delete: (id: string) => apiClient.delete(`/categories/${id}`),
};

// Products
export const productsApi = {
  list: (params?: object) => apiClient.get('/products', { params }),
  get: (id: string) => apiClient.get(`/products/${id}`),
  getByBarcode: (barcode: string) => apiClient.get(`/products/barcode/${barcode}`),
  create: (data: object) => apiClient.post('/products', data),
  update: (id: string, data: object) => apiClient.put(`/products/${id}`, data),
  delete: (id: string) => apiClient.delete(`/products/${id}`),
  addVariant: (id: string, data: object) => apiClient.post(`/products/${id}/variants`, data),
};

// Stock
export const stockApi = {
  list: (locationId?: string) => apiClient.get('/stock', { params: { locationId } }),
  getByProduct: (productId: string) => apiClient.get(`/stock/${productId}`),
  adjust: (data: object) => apiClient.post('/stock/adjust', data),
  updateReorder: (productId: string, locationId: string, data: object) =>
    apiClient.put(`/stock/${productId}/reorder`, data, { params: { locationId } }),
};

// Transfers
export const transfersApi = {
  list: (status?: string) => apiClient.get('/stock-transfers', { params: { status } }),
  get: (id: string) => apiClient.get(`/stock-transfers/${id}`),
  create: (data: object) => apiClient.post('/stock-transfers', data),
  receive: (id: string, data: object) => apiClient.post(`/stock-transfers/${id}/receive`, data),
};

// Invoices
export const invoicesApi = {
  list: (params?: object) => apiClient.get('/invoices', { params }),
  get: (id: string) => apiClient.get(`/invoices/${id}`),
  create: (data: object) => apiClient.post('/invoices', data),
  addPayment: (id: string, data: object) => apiClient.post(`/invoices/${id}/payments`, data),
  void: (id: string) => apiClient.post(`/invoices/${id}/void`),
};

// Customers
export const customersApi = {
  list: (params?: object) => apiClient.get('/customers', { params }),
  get: (id: string) => apiClient.get(`/customers/${id}`),
  getInvoices: (id: string, params?: object) => apiClient.get(`/customers/${id}/invoices`, { params }),
  create: (data: object) => apiClient.post('/customers', data),
  update: (id: string, data: object) => apiClient.put(`/customers/${id}`, data),
  adjustCredit: (id: string, data: object) => apiClient.patch(`/customers/${id}/credit`, data),
};

// Suppliers
export const suppliersApi = {
  list: () => apiClient.get('/suppliers'),
  get: (id: string) => apiClient.get(`/suppliers/${id}`),
  create: (data: object) => apiClient.post('/suppliers', data),
  update: (id: string, data: object) => apiClient.put(`/suppliers/${id}`, data),
};

// Purchase Orders
export const purchaseOrdersApi = {
  list: (status?: string) => apiClient.get('/purchase-orders', { params: { status } }),
  get: (id: string) => apiClient.get(`/purchase-orders/${id}`),
  create: (data: object) => apiClient.post('/purchase-orders', data),
  submit: (id: string) => apiClient.post(`/purchase-orders/${id}/submit`),
  receive: (id: string, data: object) => apiClient.post(`/purchase-orders/${id}/receive`, data),
};

// Reports
export const reportsApi = {
  sales: (params?: object) => apiClient.get('/reports/sales', { params }),
  stockValuation: (params?: object) => apiClient.get('/reports/stock-valuation', { params }),
  topProducts: (params?: object) => apiClient.get('/reports/top-products', { params }),
  taxSummary: (params?: object) => apiClient.get('/reports/tax-summary', { params }),
};

// Dashboard
export const dashboardApi = {
  summary: (locationId?: string) => apiClient.get('/dashboard/summary', { params: { locationId } }),
};

// Admin
export const adminApi = {
  listUsers: () => apiClient.get('/admin/users'),
  createUser: (data: object) => apiClient.post('/admin/users', data),
  updateUser: (id: string, data: object) => apiClient.put(`/admin/users/${id}`, data),
  getSettings: () => apiClient.get('/admin/settings'),
  updateSettings: (data: object) => apiClient.put('/admin/settings', data),
};
