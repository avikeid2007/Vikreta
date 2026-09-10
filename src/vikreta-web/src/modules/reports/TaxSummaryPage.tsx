import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Printer, Download, RefreshCw, Calendar, MapPin, Percent, DollarSign, Receipt, PieChart } from 'lucide-react';
import toast from 'react-hot-toast';
import { reportsApi, locationsApi } from '../../api/client';

const today = new Date().toISOString().split('T')[0];
const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);

function exportCsv(rows: any[], from: string, to: string) {
  const header = ['Tax Rate (%)', 'Taxable Amount (INR)', 'Tax Collected (INR)', 'Total with Tax (INR)'];
  const lines = rows.map((r: any) => {
    const ratePct = (r.taxRate * 100).toFixed(1);
    const gross = r.taxableAmount + r.taxCollected;
    return [
      `"${ratePct}%"`,
      r.taxableAmount.toFixed(2),
      r.taxCollected.toFixed(2),
      gross.toFixed(2),
    ].join(',');
  });

  const totalTaxable = rows.reduce((s: number, r: any) => s + r.taxableAmount, 0);
  const totalTax = rows.reduce((s: number, r: any) => s + r.taxCollected, 0);
  const totalGross = totalTaxable + totalTax;
  const totalLine = `\n"Total",${totalTaxable.toFixed(2)},${totalTax.toFixed(2)},${totalGross.toFixed(2)}`;

  const csvContent = [header.join(','), ...lines].join('\n') + totalLine;
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tax_summary_${from}_to_${to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success('Tax summary report exported to CSV');
}

export const TaxSummaryPage: React.FC = () => {
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [locationId, setLocationId] = useState('');

  const { data: locData } = useQuery({ queryKey: ['locations'], queryFn: () => locationsApi.list() });
  const locations: any[] = locData?.data ?? [];

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['report-tax', from, to, locationId],
    queryFn: () => reportsApi.taxSummary({ from, to, locationId: locationId || undefined }),
  });

  const rows: any[] = data?.data ?? [];
  const totalTaxable = rows.reduce((s: number, r: any) => s + r.taxableAmount, 0);
  const totalTax = rows.reduce((s: number, r: any) => s + r.taxCollected, 0);
  const totalGross = totalTaxable + totalTax;
  const effectiveRate = totalTaxable > 0 ? ((totalTax / totalTaxable) * 100).toFixed(1) : '0.0';

  const chartData = rows.map((r: any) => ({
    rateLabel: `${(r.taxRate * 100).toFixed(0)}%`,
    taxableAmount: r.taxableAmount,
    taxCollected: r.taxCollected,
  }));

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
    : 'All Locations';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 no-print">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tax Summary Report</h1>
          <p className="text-xs text-ink-soft mt-0.5">GST and sales tax breakdown across tax rate slabs</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              refetch();
              toast.success('Tax summary refreshed');
            }}
            disabled={isFetching}
            className="btn-secondary flex items-center gap-1.5"
            title="Refresh Report Data"
            id="tax-refresh-btn"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => exportCsv(rows, from, to)}
            className="btn-secondary flex items-center gap-1.5"
            disabled={!rows.length || isLoading}
            id="tax-export-csv-btn"
          >
            <Download size={14} /> Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="btn-secondary flex items-center gap-1.5"
            id="tax-print-btn"
          >
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      {/* Print-only Header */}
      <div className="print-only print-header mb-4">
        <h2 className="text-2xl font-bold">Tax Summary Report</h2>
        <p className="text-sm">Period: <strong>{from}</strong> to <strong>{to}</strong></p>
        <p className="text-xs text-gray-500">Location: {activeLocationName}</p>
        <p className="text-xs text-gray-500">Generated: {new Date().toLocaleString('en-IN')}</p>
      </div>

      {/* Filter and Presets Bar */}
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
                id="tax-from"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-ink-soft">To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="input py-1.5 px-2.5 text-sm w-auto"
                id="tax-to"
              />
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-ink-soft" />
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="input py-1.5 px-2.5 text-sm w-auto"
                id="tax-location"
              >
                <option value="">All Locations</option>
                {locations.map((l: any) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-ink-soft font-semibold mr-1">Quick:</span>
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
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-5 text-center bg-white">
          <div className="inline-flex p-2 rounded-lg bg-rose-50 text-cherry mb-2">
            <Percent size={18} />
          </div>
          <p className="text-xs text-ink-soft font-medium mb-1">Total Tax Collected</p>
          <p className="font-mono text-2xl font-bold text-cherry">{fmt(totalTax)}</p>
          <p className="text-[11px] text-ink-soft mt-1">Payable to tax authority</p>
        </div>
        <div className="card p-5 text-center bg-white">
          <div className="inline-flex p-2 rounded-lg bg-teal-light text-teal-dark mb-2">
            <DollarSign size={18} />
          </div>
          <p className="text-xs text-ink-soft font-medium mb-1">Taxable Sales (Net)</p>
          <p className="font-mono text-2xl font-bold text-teal-dark">{fmt(totalTaxable)}</p>
          <p className="text-[11px] text-ink-soft mt-1">Excluding taxes</p>
        </div>
        <div className="card p-5 text-center bg-white">
          <div className="inline-flex p-2 rounded-lg bg-amber-50 text-marigold-dark mb-2">
            <Receipt size={18} />
          </div>
          <p className="text-xs text-ink-soft font-medium mb-1">Gross Invoiced</p>
          <p className="font-mono text-2xl font-bold text-ink">{fmt(totalGross)}</p>
          <p className="text-[11px] text-ink-soft mt-1">Taxable + Tax total</p>
        </div>
        <div className="card p-5 text-center bg-white">
          <div className="inline-flex p-2 rounded-lg bg-purple-50 text-purple-700 mb-2">
            <PieChart size={18} />
          </div>
          <p className="text-xs text-ink-soft font-medium mb-1">Effective Tax Rate</p>
          <p className="font-mono text-2xl font-bold text-purple-700">{effectiveRate}%</p>
          <p className="text-[11px] text-ink-soft mt-1">Blended rate on taxable</p>
        </div>
      </div>

      {/* Chart */}
      <div className="card mb-6 bg-white">
        <div className="card-head flex items-center justify-between">
          <h3 className="text-sm font-bold">Tax Slabs Distribution</h3>
          <span className="text-xs text-ink-soft font-mono">{rows.length} active tax slabs</span>
        </div>
        <div className="p-5">
          {isLoading ? (
            <div className="h-56 flex items-center justify-center text-ink-soft text-sm">
              <RefreshCw size={18} className="animate-spin mr-2" /> Loading chart…
            </div>
          ) : rows.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-ink-soft text-sm">
              No tax data found for the selected period.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4D7BC" vertical={false} />
                <XAxis dataKey="rateLabel" tick={{ fontSize: 12, fontWeight: 'bold' }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
                />
                <Tooltip formatter={(v: any) => fmt(Number(v))} />
                <Legend />
                <Bar dataKey="taxableAmount" name="Taxable Amount" fill="#1D7874" radius={[4, 4, 0, 0]} />
                <Bar dataKey="taxCollected" name="Tax Collected" fill="#C8443C" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card bg-white">
        <div className="card-head flex items-center justify-between">
          <h3 className="text-sm font-bold">Tax Slab Breakdown</h3>
          <span className="text-xs text-ink-soft font-mono">Rate-wise aggregates</span>
        </div>
        {rows.length === 0 && !isLoading ? (
          <div className="p-10 text-center text-ink-soft text-sm">
            No tax records found for the selected period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tax Slab</th>
                  <th className="text-right">Taxable Amount</th>
                  <th className="text-right">Tax Collected</th>
                  <th className="text-right">Gross Total</th>
                  <th className="text-right w-44">Tax Contribution</th>
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
                    {rows.map((r: any) => {
                      const ratePct = r.taxRate * 100;
                      const gross = r.taxableAmount + r.taxCollected;
                      const sharePct = totalTax > 0 ? (r.taxCollected / totalTax) * 100 : 0;
                      return (
                        <tr key={r.taxRate} className="hover:bg-paper-alt/40 transition-colors">
                          <td>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full font-mono text-xs font-bold bg-paper-alt text-ink border border-ink/20">
                              {ratePct === 0 ? '0% (Exempt)' : `${ratePct.toFixed(0)}% Slab`}
                            </span>
                          </td>
                          <td className="text-right font-mono text-sm">{fmt(r.taxableAmount)}</td>
                          <td className="text-right font-mono text-sm font-bold text-cherry">{fmt(r.taxCollected)}</td>
                          <td className="text-right font-mono text-sm font-semibold text-ink">{fmt(gross)}</td>
                          <td className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-20 bg-line rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-cherry h-full rounded-full"
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
                      <td className="text-xs font-bold uppercase tracking-wider py-3">
                        Total ({rows.length} slabs)
                      </td>
                      <td className="text-right font-mono text-sm text-teal-dark">{fmt(totalTaxable)}</td>
                      <td className="text-right font-mono text-base font-bold text-cherry">{fmt(totalTax)}</td>
                      <td className="text-right font-mono text-base font-bold text-ink">{fmt(totalGross)}</td>
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
