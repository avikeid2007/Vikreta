import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { reportsApi } from '../../api/client';
import { DateRangePicker } from '../../components/FormControls';

const today = new Date().toISOString().split('T')[0];
const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
const fmt = (n: number) => `₹${n.toFixed(2)}`;

export const SalesReportPage: React.FC = () => {
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);

  const { data, isLoading } = useQuery({
    queryKey: ['report-sales', from, to],
    queryFn: () => reportsApi.sales({ from, to }),
  });

  const rows = data?.data ?? [];
  const totalRevenue = rows.reduce((s: number, r: any) => s + r.revenue, 0);
  const totalInvoices = rows.reduce((s: number, r: any) => s + r.invoiceCount, 0);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">Sales Report</h1>
      </div>

      <div className="mb-4"><DateRangePicker from={from} to={to} onFromChange={setFrom} onToChange={setTo} /></div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="card p-5 text-center">
          <p className="text-xs text-ink-soft mb-1">Total Revenue</p>
          <p className="font-mono text-2xl font-bold text-teal-dark">{fmt(totalRevenue)}</p>
        </div>
        <div className="card p-5 text-center">
          <p className="text-xs text-ink-soft mb-1">Total Invoices</p>
          <p className="font-mono text-2xl font-bold">{totalInvoices}</p>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-head"><h3 className="text-sm font-bold">Daily Revenue</h3></div>
        <div className="p-4">
          {isLoading ? <div className="h-48 flex items-center justify-center text-ink-soft text-sm">Loading chart…</div> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4D7BC" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} tickFormatter={d => new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => fmt(v)} />
                <Bar dataKey="revenue" fill="#1D7874" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h3 className="text-sm font-bold">Breakdown by Location</h3></div>
        <table className="data-table">
          <thead><tr><th>Date</th><th>Location</th><th className="text-right">Invoices</th><th className="text-right">Revenue</th><th className="text-right">Tax</th></tr></thead>
          <tbody>
            {rows.map((r: any, i: number) => (
              <tr key={i}>
                <td className="font-mono text-xs">{new Date(r.date).toLocaleDateString()}</td>
                <td className="text-sm">{r.locationName}</td>
                <td className="text-right font-mono text-sm">{r.invoiceCount}</td>
                <td className="text-right font-mono text-sm font-semibold">{fmt(r.revenue)}</td>
                <td className="text-right font-mono text-xs text-ink-soft">{fmt(r.taxCollected)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
