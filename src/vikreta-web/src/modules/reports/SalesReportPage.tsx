import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Printer, Download, TrendingUp, Receipt, MapPin, RefreshCw, Calendar, IndianRupee, Percent } from 'lucide-react';
import toast from 'react-hot-toast';
import { reportsApi, locationsApi } from '../../api/client';

const today = new Date().toISOString().split('T')[0];
const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);

function exportCsv(rows: any[], from: string, to: string) {
  const header = ['Date', 'Location', 'Invoices', 'Revenue (INR)', 'Tax Collected (INR)'];
  const dataLines = rows.map((r: any) => [
    `"${r.date ? new Date(r.date).toLocaleDateString('en-IN') : ''}"`,
    `"${(r.locationName || '').replace(/"/g, '""')}"`,
    r.invoiceCount,
    r.revenue.toFixed(2),
    r.taxCollected.toFixed(2),
  ].join(','));

  const totalRevenue = rows.reduce((s: number, r: any) => s + r.revenue, 0);
  const totalInvoices = rows.reduce((s: number, r: any) => s + r.invoiceCount, 0);
  const totalTax = rows.reduce((s: number, r: any) => s + r.taxCollected, 0);
  const totalLine = `\n"Total","",${totalInvoices},${totalRevenue.toFixed(2)},${totalTax.toFixed(2)}`;

  const csvContent = [header.join(','), ...dataLines].join('\n') + totalLine;
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sales_report_${from}_to_${to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success('Sales report exported to CSV');
}

export const SalesReportPage: React.FC = () => {
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [locationId, setLocationId] = useState('');

  const { data: locData } = useQuery({ queryKey: ['locations'], queryFn: () => locationsApi.list() });
  const locations: any[] = Array.isArray(locData) ? locData : (locData?.data ?? []);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['report-sales', from, to, locationId],
    queryFn: () => reportsApi.sales({ from, to, locationId: locationId || undefined }),
  });

  const rows: any[] = data?.data ?? [];
  const totalRevenue = rows.reduce((s: number, r: any) => s + r.revenue, 0);
  const totalInvoices = rows.reduce((s: number, r: any) => s + r.invoiceCount, 0);
  const totalTax = rows.reduce((s: number, r: any) => s + r.taxCollected, 0);
  const avgTicket = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;

  // Aggregate by date for clean BarChart rendering
  const chartData = useMemo(() => {
    const dailyMap = new Map<string, { date: string; revenue: number; invoiceCount: number }>();
    rows.forEach((r: any) => {
      const d = r.date ? r.date.split('T')[0] : '';
      if (!d) return;
      const existing = dailyMap.get(d);
      if (existing) {
        existing.revenue += r.revenue;
        existing.invoiceCount += r.invoiceCount;
      } else {
        dailyMap.set(d, { date: d, revenue: r.revenue, invoiceCount: r.invoiceCount });
      }
    });
    return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [rows]);

  const setPreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    if (days === 0) {
      // Today
      setFrom(end.toISOString().split('T')[0]);
      setTo(end.toISOString().split('T')[0]);
    } else if (days === 1) {
      // Yesterday
      const yest = new Date(Date.now() - 86400000);
      setFrom(yest.toISOString().split('T')[0]);
      setTo(yest.toISOString().split('T')[0]);
    } else if (days === -1) {
      // This Month
      const firstDay = new Date(end.getFullYear(), end.getMonth(), 1);
      setFrom(firstDay.toISOString().split('T')[0]);
      setTo(end.toISOString().split('T')[0]);
    } else {
      start.setDate(start.getDate() - days);
      setFrom(start.toISOString().split('T')[0]);
      setTo(end.toISOString().split('T')[0]);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 no-print">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sales Report</h1>
          <p className="text-xs text-ink-soft mt-0.5">Analyze daily sales, invoice count, and tax revenue</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              refetch();
              toast.success('Sales data refreshed');
            }}
            disabled={isFetching}
            className="btn-secondary flex items-center gap-1.5"
            title="Refresh Report Data"
            id="sales-refresh-btn"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => exportCsv(rows, from, to)}
            className="btn-secondary flex items-center gap-1.5"
            disabled={!rows.length || isLoading}
            id="sales-export-csv-btn"
          >
            <Download size={14} /> Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="btn-secondary flex items-center gap-1.5"
            id="sales-print-btn"
          >
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      {/* Print-only Header */}
      <div className="print-only print-header mb-4">
        <h2 className="text-2xl font-bold">Sales Report</h2>
        <p className="text-sm">Period: <strong>{from}</strong> to <strong>{to}</strong></p>
        <p className="text-xs text-gray-500">Location: {locationId ? locations.find(l => l.id === locationId)?.name : 'All Locations'}</p>
        <p className="text-xs text-gray-500">Generated: {new Date().toLocaleString('en-IN')}</p>
      </div>

      {/* Filters & Presets bar */}
      <div className="card p-4 mb-6 no-print bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-ink-soft" />
              <label className="text-xs font-bold text-ink-soft">From</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="input py-1.5 px-2.5 text-sm w-auto"
                id="sales-from"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-ink-soft">To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="input py-1.5 px-2.5 text-sm w-auto"
                id="sales-to"
              />
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-ink-soft" />
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="input py-1.5 px-2.5 text-sm w-auto"
                id="sales-location"
              >
                <option value="">All Locations</option>
                {locations.map((l: any) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick preset buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-ink-soft font-semibold mr-1">Quick:</span>
            {[
              { label: 'Today', days: 0 },
              { label: 'Yesterday', days: 1 },
              { label: '7 Days', days: 7 },
              { label: '30 Days', days: 30 },
              { label: 'This Month', days: -1 },
            ].map((preset) => (
              <button
                key={preset.label}
                onClick={() => setPreset(preset.days)}
                className="px-2.5 py-1 text-xs font-bold border-2 border-line rounded-lg hover:border-teal hover:text-teal-dark hover:bg-teal-light/20 transition-all active:scale-95"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-5 text-center bg-white">
          <div className="inline-flex p-2 rounded-lg bg-teal-light text-teal-dark mb-2">
            <TrendingUp size={18} />
          </div>
          <p className="text-xs text-ink-soft font-medium mb-1">Total Revenue</p>
          <p className="font-mono text-2xl font-bold text-teal-dark">{fmt(totalRevenue)}</p>
          <p className="text-[11px] text-ink-soft mt-1">{rows.length} sales days</p>
        </div>
        <div className="card p-5 text-center bg-white">
          <div className="inline-flex p-2 rounded-lg bg-amber-50 text-marigold-dark mb-2">
            <Receipt size={18} />
          </div>
          <p className="text-xs text-ink-soft font-medium mb-1">Total Invoices</p>
          <p className="font-mono text-2xl font-bold text-ink">{totalInvoices}</p>
          <p className="text-[11px] text-ink-soft mt-1">Completed sales</p>
        </div>
        <div className="card p-5 text-center bg-white">
          <div className="inline-flex p-2 rounded-lg bg-indigo-50 text-indigo-700 mb-2">
            <IndianRupee size={18} />
          </div>
          <p className="text-xs text-ink-soft font-medium mb-1">Avg. Ticket Size</p>
          <p className="font-mono text-2xl font-bold text-marigold-dark">{fmt(avgTicket)}</p>
          <p className="text-[11px] text-ink-soft mt-1">Per invoice average</p>
        </div>
        <div className="card p-5 text-center bg-white">
          <div className="inline-flex p-2 rounded-lg bg-rose-50 text-cherry mb-2">
            <Percent size={18} />
          </div>
          <p className="text-xs text-ink-soft font-medium mb-1">Tax Collected</p>
          <p className="font-mono text-2xl font-bold text-cherry">{fmt(totalTax)}</p>
          <p className="text-[11px] text-ink-soft mt-1">GST / VAT total</p>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="card mb-6 bg-white">
        <div className="card-head flex items-center justify-between">
          <h3 className="text-sm font-bold">Daily Revenue Trend</h3>
          <span className="text-xs text-ink-soft font-mono">{rows.length} data points</span>
        </div>
        <div className="p-5">
          {isLoading ? (
            <div className="h-56 flex items-center justify-center text-ink-soft text-sm">
              <RefreshCw size={18} className="animate-spin mr-2" /> Loading chart…
            </div>
          ) : rows.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-ink-soft text-sm">
              No sales recorded for the selected period.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4D7BC" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(d) => new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`}
                />
                <Tooltip
                  formatter={(v: any) => [fmt(Number(v)), 'Revenue']}
                  labelFormatter={(d: any) => (d ? new Date(d).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : '')}
                />
                <Bar dataKey="revenue" name="Revenue" fill="#1D7874" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Breakdown Table */}
      <div className="card bg-white">
        <div className="card-head flex items-center justify-between">
          <h3 className="text-sm font-bold">Detailed Breakdown</h3>
          <span className="text-xs text-ink-soft font-medium">Sorted chronologically</span>
        </div>
        {rows.length === 0 && !isLoading ? (
          <div className="p-10 text-center text-ink-soft text-sm">
            No sales data found for the selected period. Try adjusting your date range or location filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Location</th>
                  <th className="text-right">Invoices</th>
                  <th className="text-right">Revenue</th>
                  <th className="text-right">Tax Collected</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={5} className="py-3 px-4">
                        <div className="h-4 bg-line rounded animate-pulse w-full" />
                      </td>
                    </tr>
                  ))
                ) : (
                  <>
                    {rows.map((r: any, i: number) => (
                      <tr key={i} className="hover:bg-paper-alt/40 transition-colors">
                        <td className="font-mono text-xs font-semibold">{new Date(r.date).toLocaleDateString('en-IN')}</td>
                        <td className="text-sm">{r.locationName}</td>
                        <td className="text-right font-mono text-sm">{r.invoiceCount}</td>
                        <td className="text-right font-mono text-sm font-bold text-teal-dark">{fmt(r.revenue)}</td>
                        <td className="text-right font-mono text-xs text-ink-soft">{fmt(r.taxCollected)}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-ink font-bold bg-paper-alt/60">
                      <td colSpan={2} className="text-xs font-bold uppercase tracking-wider py-3">
                        Total ({rows.length} days)
                      </td>
                      <td className="text-right font-mono text-sm">{totalInvoices}</td>
                      <td className="text-right font-mono text-base font-bold text-teal-dark">{fmt(totalRevenue)}</td>
                      <td className="text-right font-mono text-sm">{fmt(totalTax)}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
