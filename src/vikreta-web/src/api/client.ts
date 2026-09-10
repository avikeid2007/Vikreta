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

// ── Response interceptor: handle 401 with automatic token refresh ────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      const { refreshToken, setTokens, logout } = useAuthStore.getState();

      if (!refreshToken) {
        logout();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await axios.post(`${BASE_URL}/api/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = refreshResponse.data;
        setTokens(accessToken, newRefreshToken);
        processQueue(null, accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        logout();
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ── Typed API helpers ──────────────────────────────────────────────────────

// Auth
export const authApi = {
  login: (tenantSlug: string, email: string, password: string) =>
    apiClient.post('/auth/login', { tenantSlug, email, password }),
  refresh: (refreshToken: string) =>
    apiClient.post('/auth/refresh', { refreshToken }),
  forgotPassword: (tenantSlug: string, email: string) =>
    apiClient.post('/auth/forgot-password', { tenantSlug, email }),
  resetPassword: (token: string, newPassword: string) =>
    apiClient.post('/auth/reset-password', { token, newPassword }),
  me: () => apiClient.get('/auth/me'),
};

// Tenants
export const tenantsApi = {
  list: () => apiClient.get('/tenants'),
  get: (id: string) => apiClient.get(`/tenants/${id}`),
  getBySlug: (slug: string) => apiClient.get(`/tenants/slug/${slug}`),
  create: (data: object) => apiClient.post('/tenants', data),
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
  listBatches: (params?: object) => apiClient.get('/stock/batches', { params }),
  createBatch: (data: object) => apiClient.post('/stock/batches', data),
  writeOffBatch: (id: string, data: object) => apiClient.post(`/stock/batches/${id}/write-off`, data),
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
  adjustLoyalty: (id: string, data: object) => apiClient.patch(`/customers/${id}/loyalty`, data),
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
  generateFromLowStock: (data: object) => apiClient.post('/purchase-orders/auto-generate-low-stock', data),
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
