import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AppShell } from './layouts/AppShell';
import { LoginPage } from './modules/auth/LoginPage';
import { ForgotPasswordPage } from './modules/auth/ForgotPasswordPage';
import { useAuthStore } from './stores/authStore';

// Lazy-loaded pages
const DashboardPage = lazy(() => import('./modules/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const PosPage = lazy(() => import('./modules/pos/PosPage').then(m => ({ default: m.PosPage })));
const ProductsPage = lazy(() => import('./modules/catalog/ProductsPage').then(m => ({ default: m.ProductsPage })));
const ProductDetailPage = lazy(() => import('./modules/catalog/ProductDetailPage').then(m => ({ default: m.ProductDetailPage })));
const CategoriesPage = lazy(() => import('./modules/catalog/CategoriesPage').then(m => ({ default: m.CategoriesPage })));
const StockPage = lazy(() => import('./modules/inventory/StockPage').then(m => ({ default: m.StockPage })));
const AdjustmentPage = lazy(() => import('./modules/inventory/AdjustmentPage').then(m => ({ default: m.AdjustmentPage })));
const TransfersPage = lazy(() => import('./modules/inventory/TransfersPage').then(m => ({ default: m.TransfersPage })));
const InvoicesPage = lazy(() => import('./modules/invoices/InvoicesPage').then(m => ({ default: m.InvoicesPage })));
const InvoiceDetailPage = lazy(() => import('./modules/invoices/InvoiceDetailPage').then(m => ({ default: m.InvoiceDetailPage })));
const CustomersPage = lazy(() => import('./modules/customers/CustomersPage').then(m => ({ default: m.CustomersPage })));
const CustomerDetailPage = lazy(() => import('./modules/customers/CustomerDetailPage').then(m => ({ default: m.CustomerDetailPage })));
const SuppliersPage = lazy(() => import('./modules/suppliers/SuppliersPage').then(m => ({ default: m.SuppliersPage })));
const PurchaseOrdersPage = lazy(() => import('./modules/suppliers/PurchaseOrdersPage').then(m => ({ default: m.PurchaseOrdersPage })));
const SalesReportPage = lazy(() => import('./modules/reports/SalesReportPage').then(m => ({ default: m.SalesReportPage })));
const StockValuationPage = lazy(() => import('./modules/reports/StockValuationPage').then(m => ({ default: m.StockValuationPage })));
const TopProductsPage = lazy(() => import('./modules/reports/TopProductsPage').then(m => ({ default: m.TopProductsPage })));
const TaxSummaryPage = lazy(() => import('./modules/reports/TaxSummaryPage').then(m => ({ default: m.TaxSummaryPage })));
const AdminLocationsPage = lazy(() => import('./modules/admin/AdminLocationsPage').then(m => ({ default: m.AdminLocationsPage })));
const AdminUsersPage = lazy(() => import('./modules/admin/AdminUsersPage').then(m => ({ default: m.AdminUsersPage })));
const AdminSettingsPage = lazy(() => import('./modules/admin/AdminSettingsPage').then(m => ({ default: m.AdminSettingsPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="flex gap-1.5">
      {[0, 1, 2].map(i => (
        <div key={i} className="w-2 h-2 bg-teal rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
      ))}
    </div>
  </div>
);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#241F1C',
              color: '#FBF4E6',
              border: '2px solid #241F1C',
              fontFamily: 'Space Grotesk, sans-serif',
              fontSize: '13px',
            },
          }}
        />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          <Route path="/" element={<AuthGuard><AppShell /></AuthGuard>}>
            <Route index element={<Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>} />
            <Route path="pos" element={<Suspense fallback={<PageLoader />}><PosPage /></Suspense>} />

            {/* Catalog */}
            <Route path="products" element={<Suspense fallback={<PageLoader />}><ProductsPage /></Suspense>} />
            <Route path="products/new" element={<Suspense fallback={<PageLoader />}><ProductDetailPage /></Suspense>} />
            <Route path="products/:id" element={<Suspense fallback={<PageLoader />}><ProductDetailPage /></Suspense>} />
            <Route path="categories" element={<Suspense fallback={<PageLoader />}><CategoriesPage /></Suspense>} />

            {/* Inventory */}
            <Route path="inventory" element={<Suspense fallback={<PageLoader />}><StockPage /></Suspense>} />
            <Route path="inventory/adjust" element={<Suspense fallback={<PageLoader />}><AdjustmentPage /></Suspense>} />
            <Route path="inventory/transfers" element={<Suspense fallback={<PageLoader />}><TransfersPage /></Suspense>} />

            {/* Invoices */}
            <Route path="invoices" element={<Suspense fallback={<PageLoader />}><InvoicesPage /></Suspense>} />
            <Route path="invoices/:id" element={<Suspense fallback={<PageLoader />}><InvoiceDetailPage /></Suspense>} />

            {/* Customers */}
            <Route path="customers" element={<Suspense fallback={<PageLoader />}><CustomersPage /></Suspense>} />
            <Route path="customers/:id" element={<Suspense fallback={<PageLoader />}><CustomerDetailPage /></Suspense>} />

            {/* Suppliers & POs */}
            <Route path="suppliers" element={<Suspense fallback={<PageLoader />}><SuppliersPage /></Suspense>} />
            <Route path="purchase-orders" element={<Suspense fallback={<PageLoader />}><PurchaseOrdersPage /></Suspense>} />

            {/* Reports */}
            <Route path="reports" element={<Navigate to="/reports/sales" replace />} />
            <Route path="reports/sales" element={<Suspense fallback={<PageLoader />}><SalesReportPage /></Suspense>} />
            <Route path="reports/stock-valuation" element={<Suspense fallback={<PageLoader />}><StockValuationPage /></Suspense>} />
            <Route path="reports/top-products" element={<Suspense fallback={<PageLoader />}><TopProductsPage /></Suspense>} />
            <Route path="reports/tax-summary" element={<Suspense fallback={<PageLoader />}><TaxSummaryPage /></Suspense>} />

            {/* Admin */}
            <Route path="admin/locations" element={<Suspense fallback={<PageLoader />}><AdminLocationsPage /></Suspense>} />
            <Route path="admin/users" element={<Suspense fallback={<PageLoader />}><AdminUsersPage /></Suspense>} />
            <Route path="admin/settings" element={<Suspense fallback={<PageLoader />}><AdminSettingsPage /></Suspense>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
