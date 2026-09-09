import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../../api/client';
import { DataTable, type Column } from '../../components/DataTable';
import { DateRangePicker } from '../../components/FormControls';

const today = new Date().toISOString().split('T')[0];
const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
const fmt = (n: number) => `₹${n.toFixed(2)}`;

export const TaxSummaryPage: React.FC = () => {
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);

  const { data, isLoading } = useQuery({ queryKey: ['report-tax', from, to], queryFn: () => reportsApi.taxSummary({ from, to }) });
  const rows = data?.data ?? [];
  const totalTax = rows.reduce((s: number, r: any) => s + r.taxCollected, 0);

  const columns: Column<any>[] = [
    { key: 'taxRate', header: 'Tax Rate', render: r => <span className="font-mono text-sm">{(r.taxRate * 100).toFixed(0)}%</span> },
    { key: 'taxableAmount', header: 'Taxable Amount', render: r => <span className="font-mono text-sm">{fmt(r.taxableAmount)}</span> },
    { key: 'taxCollected', header: 'Tax Collected', render: r => <span className="font-mono text-sm font-bold text-teal-dark">{fmt(r.taxCollected)}</span>, className: 'text-right' },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">Tax Summary</h1>
        <div className="card px-5 py-3">
          <p className="text-xs text-ink-soft">Total Tax Collected</p>
          <p className="font-mono text-xl font-bold text-cherry">{fmt(totalTax)}</p>
        </div>
      </div>
      <div className="mb-4"><DateRangePicker from={from} to={to} onFromChange={setFrom} onToChange={setTo} /></div>
      <div className="card">
        <DataTable columns={columns} data={rows} keyField="taxRate" loading={isLoading} emptyMessage="No tax data." />
      </div>
    </div>
  );
};
