import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Printer, Download, TrendingUp, RefreshCw, Calendar, MapPin, Award, ShoppingBag, DollarSign, Trophy, Medal, Package, Store } from 'lucide-react';
import toast from 'react-hot-toast';
import { reportsApi, locationsApi } from '../../api/client';
import { useLocationStore } from '../../stores/locationStore';

const today = new Date().toISOString().split('T')[0];
const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);

function exportCsv(rows: any[], from: string, to: string) {
  const header = ['Rank', 'Product Name', 'SKU', 'Units Sold', 'Revenue (INR)', 'Revenue Share (%)'];
  const totalRev = rows.reduce((s: number, r: any) => s + r.revenue, 0);

  const lines = rows.map((r: any) => {
    const pct = totalRev > 0 ? ((r.revenue / totalRev) * 100).toFixed(1) : '0.0';
    return [
      r.rank,
      `"${(r.productName || '').replace(/"/g, '""')}"`,
      `"${(r.sku || '').replace(/"/g, '""')}"`,
      r.unitsSold,
      r.revenue.toFixed(2),
      `${pct}%`,
    ].join(',');
  });

  const totalUnits = rows.reduce((s: number, r: any) => s + r.unitsSold, 0);
  const totalLine = `\n"Total","","",${totalUnits},${totalRev.toFixed(2)},"100.0%"`;

  const csvContent = [header.join(','), ...lines].join('\n') + totalLine;
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `top_products_${from}_to_${to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success('Top products report exported to CSV');
}

export const TopProductsPage: React.FC = () => {
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [locationId, setLocationId] = useState('');
  const [topLimit, setTopLimit] = useState<number>(10);

  const { locations: storeLocations } = useLocationStore();
  const { data: locData } = useQuery({ queryKey: ['locations'], queryFn: () => locationsApi.list() });
  const rawLocations = Array.isArray(locData) ? locData : (locData?.data ?? []);
  const locations: any[] = rawLocations.length > 0 ? rawLocations : (storeLocations ?? []);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['report-top-products', from, to, locationId, topLimit],
    queryFn: () => reportsApi.topProducts({ from, to, locationId: locationId || undefined, top: topLimit }),
  });

  const rows: any[] = data?.data ?? [];
  const totalRevenue = rows.reduce((s: number, r: any) => s + r.revenue, 0);
  const totalUnits = rows.reduce((s: number, r: any) => s + r.unitsSold, 0);
  const bestSeller = rows.length > 0 ? rows[0] : null;
  const avgUnits = rows.length > 0 ? (totalUnits / rows.length).toFixed(1) : '0';

  const setPreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    if (days === 0) {
      setFrom(end.toISOString().split('T')[0]);
      setTo(end.toISOString().split('T')[0]);
    } else if (days === -1) {
      const firstDay = new Date(end.getFullYear(), end.getMonth(), 1);
      setFrom(firstDay.toISOString().split('T')[0]);
      setTo(end.toISOString().split('T')[0]);
    } else {
      start.setDate(start.getDate() - days);
      setFrom(start.toISOString().split('T')[0]);
      setTo(end.toISOString().split('T')[0]);
    }
  };

  const activeLocationName = locationId
    ? (locations.find((l) => l.id === locationId)?.name ?? 'Selected Location')
    : 'All Stores';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 no-print">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight">Top Selling Products</h1>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-teal-light text-teal-dark border border-teal/30">
              {activeLocationName}
            </span>
          </div>
          <p className="text-xs text-ink-soft">Rank best-performing products by total revenue and unit sales across your stores</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              refetch();
              toast.success('Top products data refreshed');
            }}
            disabled={isFetching}
            className="btn-secondary flex items-center gap-1.5"
            title="Refresh Data"
            id="top-products-refresh-btn"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => exportCsv(rows, from, to)}
            className="btn-secondary flex items-center gap-1.5"
            disabled={!rows.length || isLoading}
            id="top-products-export-csv-btn"
          >
            <Download size={14} /> Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="btn-secondary flex items-center gap-1.5"
            id="top-products-print-btn"
          >
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      {/* Print-only Header */}
      <div className="print-only print-header mb-4">
        <h2 className="text-2xl font-bold">Top Products Report</h2>
        <p className="text-sm">Period: <strong>{from}</strong> to <strong>{to}</strong> | Limit: Top {topLimit}</p>
        <p className="text-xs text-gray-500">Store Filter: {activeLocationName}</p>
        <p className="text-xs text-gray-500">Generated: {new Date().toLocaleString('en-IN')}</p>
      </div>

      {/* Filters and Limit Bar */}
      <div className="card p-4 mb-6 no-print bg-white space-y-3">
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
                id="top-from"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-ink-soft">To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="input py-1.5 px-2.5 text-sm w-auto"
                id="top-to"
              />
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-ink-soft" />
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="input py-1.5 px-2.5 text-sm w-auto font-medium"
                id="top-location"
              >
                <option value="">All Locations ({locations.length} Stores)</option>
                {locations.map((l: any) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick presets & limit buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1">
              <span className="text-xs text-ink-soft font-semibold mr-1">Period:</span>
              {[
                { label: 'Today', days: 0 },
                { label: '7 Days', days: 7 },
                { label: '30 Days', days: 30 },
                { label: 'This Month', days: -1 },
              ].map((p) => (
                <button
                  key={p.label}
                  onClick={() => setPreset(p.days)}
                  className="px-2.5 py-1 text-xs font-bold border-2 border-line rounded-lg hover:border-teal hover:text-teal-dark transition-all"
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 border-l-2 border-line pl-3">
              <span className="text-xs text-ink-soft font-semibold mr-1">Limit:</span>
              {[5, 10, 20, 50].map((limit) => (
                <button
                  key={limit}
                  onClick={() => setTopLimit(limit)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border-2 transition-all ${
                    topLimit === limit
                      ? 'bg-marigold text-ink border-ink font-mono'
                      : 'border-line text-ink hover:border-ink hover:bg-paper font-mono'
                  }`}
                >
                  Top {limit}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Store Quick Switcher Pills */}
        {locations.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-line/60">
            <span className="text-xs text-ink-soft font-bold flex items-center gap-1.5 mr-1">
              <Store size={13} className="text-teal-dark" /> Store Filter:
            </span>
            <button
              type="button"
              onClick={() => setLocationId('')}
              className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 ${
                !locationId
                  ? 'bg-teal text-white border-teal shadow-xs'
                  : 'bg-paper-alt/50 border-line text-ink hover:border-teal/50 hover:bg-paper'
              }`}
            >
              <span>🌐</span> All Stores (Combined)
            </button>
            {locations.map((loc: any) => (
              <button
                key={loc.id}
                type="button"
                onClick={() => setLocationId(loc.id)}
                className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 ${
                  locationId === loc.id
                    ? 'bg-teal text-white border-teal shadow-xs'
                    : 'bg-paper-alt/50 border-line text-ink hover:border-teal/50 hover:bg-paper'
                }`}
              >
                <span>🏪</span> {loc.name}
                {locationId === loc.id && (
                  <span className="ml-1 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-5 text-center bg-white">
          <div className="inline-flex p-2 rounded-lg bg-teal-light text-teal-dark mb-2">
            <DollarSign size={18} />
          </div>
          <p className="text-xs text-ink-soft font-medium mb-1">Top Products Revenue</p>
          <p className="font-mono text-2xl font-bold text-teal-dark">{fmt(totalRevenue)}</p>
          <p className="text-[11px] text-ink-soft mt-1">From top {rows.length} products</p>
        </div>
        <div className="card p-5 text-center bg-white">
          <div className="inline-flex p-2 rounded-lg bg-indigo-50 text-indigo-700 mb-2">
            <ShoppingBag size={18} />
          </div>
          <p className="text-xs text-ink-soft font-medium mb-1">Total Units Sold</p>
          <p className="font-mono text-2xl font-bold text-ink">{totalUnits.toLocaleString()}</p>
          <p className="text-[11px] text-ink-soft mt-1">Units aggregate</p>
        </div>
        <div className="card p-5 text-center bg-white">
          <div className="inline-flex p-2 rounded-lg bg-amber-50 text-marigold-dark mb-2">
            <Award size={18} />
          </div>
          <p className="text-xs text-ink-soft font-medium mb-1">#1 Best Seller ({activeLocationName})</p>
          <p className="text-base font-bold text-ink truncate px-1" title={bestSeller?.productName ?? '—'}>
            {bestSeller ? bestSeller.productName : '—'}
          </p>
          <p className="text-[11px] text-marigold-dark font-mono font-semibold mt-1">
            {bestSeller ? `${bestSeller.unitsSold} units (${fmt(bestSeller.revenue)})` : 'No sales yet'}
          </p>
        </div>
        <div className="card p-5 text-center bg-white">
          <div className="inline-flex p-2 rounded-lg bg-purple-50 text-purple-700 mb-2">
            <TrendingUp size={18} />
          </div>
          <p className="text-xs text-ink-soft font-medium mb-1">Avg. Units / Product</p>
          <p className="font-mono text-2xl font-bold text-ink">{avgUnits}</p>
          <p className="text-[11px] text-ink-soft mt-1">Velocity across top list</p>
        </div>
      </div>

      {/* Chart Section */}
      <div className="card mb-6 bg-white">
        <div className="card-head flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold">Revenue by Top Product</h3>
            <p className="text-[11px] text-ink-soft">{activeLocationName} · Ranked by sales</p>
          </div>
          <span className="text-xs text-ink-soft font-mono bg-paper-alt px-2.5 py-1 rounded-md border border-line">
            Top {rows.length} items
          </span>
        </div>
        <div className="p-5">
          {isLoading ? (
            <div className="h-56 flex items-center justify-center text-ink-soft text-sm">
              <RefreshCw size={18} className="animate-spin mr-2" /> Loading chart…
            </div>
          ) : rows.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-ink-soft text-sm">
              No sales data found for this period.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={rows.slice(0, 10)}
                margin={{ top: 10, right: 10, left: 10, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E4D7BC" vertical={false} />
                <XAxis
                  dataKey="productName"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  tickFormatter={(n) => (n.length > 14 ? `${n.substring(0, 12)}…` : n)}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
                />
                <Tooltip
                  formatter={(v: any) => [fmt(Number(v)), 'Revenue']}
                  labelFormatter={(name) => `Product: ${name}`}
                />
                <Bar dataKey="revenue" name="Revenue" fill="#E8A33D" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Products Table */}
      <div className="card bg-white">
        <div className="card-head flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold">Ranking & Share Breakdown</h3>
            <p className="text-[11px] text-ink-soft">
              Scope: <strong>{activeLocationName}</strong> ({from} to {to})
            </p>
          </div>
          <span className="text-xs text-ink-soft font-mono bg-paper-alt px-2.5 py-1 rounded-md border border-line">
            {rows.length} products
          </span>
        </div>
        {rows.length === 0 && !isLoading ? (
          <div className="p-10 text-center text-ink-soft text-sm">
            No sales records found for this period at {activeLocationName}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-24">Rank</th>
                  <th>Product</th>
                  <th>SKU</th>
                  <th className="text-right">Units Sold</th>
                  <th className="text-right">Revenue</th>
                  <th className="text-right w-44">Revenue Share</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6} className="py-3 px-4">
                        <div className="h-4 bg-line rounded animate-pulse w-full" />
                      </td>
                    </tr>
                  ))
                ) : (
                  <>
                    {rows.map((r: any) => {
                      const sharePct = totalRevenue > 0 ? (r.revenue / totalRevenue) * 100 : 0;
                      return (
                        <tr key={r.productId} className="hover:bg-paper-alt/40 transition-colors">
                          <td className="py-2.5">
                            {r.rank === 1 ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-900 shadow-2xs">
                                <Trophy size={13} className="text-amber-500 fill-amber-400 flex-shrink-0" />
                                <span className="font-mono text-xs font-black">#1</span>
                              </span>
                            ) : r.rank === 2 ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-300 text-slate-700 shadow-2xs">
                                <Medal size={13} className="text-slate-400 fill-slate-300 flex-shrink-0" />
                                <span className="font-mono text-xs font-black">#2</span>
                              </span>
                            ) : r.rank === 3 ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 border border-orange-300 text-orange-900 shadow-2xs">
                                <Medal size={13} className="text-amber-700 fill-amber-500/40 flex-shrink-0" />
                                <span className="font-mono text-xs font-black">#3</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-paper-alt border border-line text-ink-soft font-mono font-bold text-xs">
                                #{r.rank}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5">
                            <div className="flex items-center gap-2.5">
                              <span className="w-7 h-7 rounded-md bg-paper-alt border border-line flex items-center justify-center text-ink-soft flex-shrink-0">
                                <Package size={14} />
                              </span>
                              <span className="font-semibold text-sm text-ink truncate">{r.productName}</span>
                            </div>
                          </td>
                          <td className="font-mono text-xs text-ink-soft">{r.sku}</td>
                          <td className="text-right font-mono text-sm font-semibold">{r.unitsSold}</td>
                          <td className="text-right font-mono text-sm font-bold text-teal-dark">{fmt(r.revenue)}</td>
                          <td className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-20 bg-line rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-marigold h-full rounded-full"
                                  style={{ width: `${Math.min(100, Math.max(2, sharePct))}%` }}
                                />
                              </div>
                              <span className="font-mono text-xs font-semibold text-ink-soft w-11 text-right">
                                {sharePct.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="border-t-2 border-ink font-bold bg-paper-alt/60">
                      <td colSpan={3} className="text-xs font-bold uppercase tracking-wider py-3">
                        Total Top Products ({rows.length})
                      </td>
                      <td className="text-right font-mono text-sm">{totalUnits.toLocaleString()}</td>
                      <td className="text-right font-mono text-base font-bold text-teal-dark">{fmt(totalRevenue)}</td>
                      <td className="text-right font-mono text-xs text-ink-soft">100.0%</td>
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
