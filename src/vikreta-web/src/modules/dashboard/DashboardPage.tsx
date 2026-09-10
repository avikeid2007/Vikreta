import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, ShoppingCart, Plus, FileText } from 'lucide-react';
import { dashboardApi } from '../../api/client';
import { useLocationStore } from '../../stores/locationStore';
import { StatusBadge } from '../../components/StatusBadge';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);

export const DashboardPage: React.FC = () => {
  const { activeLocation } = useLocationStore();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', activeLocation?.id],
    queryFn: () => dashboardApi.summary(activeLocation?.id),
    refetchInterval: 30_000, // refresh every 30s
  });

  const summary = data?.data;

  const statCards = [
    {
      label: 'Sales today',
      value: summary ? fmt(summary.salesToday) : '—',
      sub: summary
        ? `${summary.salesTodayChange >= 0 ? '↑' : '↓'} ${Math.abs(summary.salesTodayChange * 100).toFixed(0)}% vs yesterday`
        : 'Loading…',
      bg: 'bg-teal',
      textColor: 'text-white',
      icon: summary?.salesTodayChange >= 0 ? TrendingUp : TrendingDown,
    },
    {
      label: 'Invoices today',
      value: summary?.invoicesToday ?? '—',
      sub: summary ? `Avg. ticket ${fmt(summary.avgTicket)}` : 'Loading…',
      bg: 'bg-marigold',
      textColor: 'text-ink',
      icon: FileText,
    },
    {
      label: 'Low stock alerts',
      value: summary?.lowStockCount ?? '—',
      sub: 'Across all locations',
      bg: 'bg-cherry',
      textColor: 'text-white',
      icon: ShoppingCart,
    },
  ];

  return (
    <div className="p-7 max-w-5xl mx-auto">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`${card.bg} ${card.textColor} rounded-xl p-5`}
          >
            <p className="text-xs font-medium opacity-85 mb-2">{card.label}</p>
            <p className="font-mono text-3xl font-bold tracking-tight leading-none mb-1.5">
              {isLoading ? <span className="animate-pulse">…</span> : card.value}
            </p>
            <p className="text-xs opacity-90">{isLoading ? '…' : card.sub}</p>
          </div>
        ))}
      </div>

      {/* Main panels */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4 mb-6">
        {/* Recent Invoices */}
        <div className="card">
          <div className="card-head">
            <h3 className="text-sm font-bold">Recent invoices</h3>
            <button onClick={() => navigate('/invoices')} className="text-xs text-teal-dark font-bold hover:underline">
              View all →
            </button>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Status</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {[...Array(4)].map((_, j) => (
                        <td key={j}><div className="h-4 bg-line rounded animate-pulse w-3/4" /></td>
                      ))}
                    </tr>
                  ))
                : summary?.recentInvoices.map((inv: any) => (
                    <tr
                      key={inv.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/invoices/${inv.id}`)}
                    >
                      <td className="font-mono text-sm">#{inv.invoiceNumber}</td>
                      <td className="font-medium text-sm">{inv.customerName ?? 'Walk-in'}</td>
                      <td><StatusBadge status={inv.status} /></td>
                      <td className="font-mono text-sm text-right">{fmt(inv.grandTotal)}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {/* Low Stock */}
        <div className="card">
          <div className="card-head">
            <h3 className="text-sm font-bold">Low stock</h3>
            <button onClick={() => navigate('/inventory')} className="text-xs text-teal-dark font-bold hover:underline">
              View all →
            </button>
          </div>
          <div>
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex justify-between items-center px-5 py-3 border-b border-paper-alt">
                    <div className="h-4 bg-line rounded animate-pulse w-1/2" />
                    <div className="h-5 bg-line rounded-full animate-pulse w-12" />
                  </div>
                ))
              : summary?.lowStockAlerts.length === 0
              ? <p className="text-center text-ink-soft text-sm py-8">No low stock items 🎉</p>
              : summary?.lowStockAlerts.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-5 py-3 border-b border-paper-alt last:border-b-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{item.productName}</p>
                      <p className="text-[11px] text-ink-soft">{item.locationName}</p>
                    </div>
                    <span className="font-mono text-xs font-bold text-white bg-cherry px-2.5 py-0.5 rounded-full">
                      {item.quantityOnHand} left
                    </span>
                  </div>
                ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <button onClick={() => navigate('/pos')} className="btn-primary">
          <ShoppingCart size={14} />
          New sale
        </button>
        <button onClick={() => navigate('/products/new')} className="btn-secondary">
          <Plus size={14} />
          Add product
        </button>
        <button onClick={() => navigate('/purchase-orders/new')} className="btn-secondary">
          <FileText size={14} />
          New purchase order
        </button>
      </div>
    </div>
  );
};
