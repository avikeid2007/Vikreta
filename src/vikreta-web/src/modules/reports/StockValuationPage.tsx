import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../../api/client';
import { DataTable, type Column } from '../../components/DataTable';

const fmt = (n: number) => `₹${n.toFixed(2)}`;

export const StockValuationPage: React.FC = () => {
  const { data, isLoading } = useQuery({ queryKey: ['report-stock-val'], queryFn: () => reportsApi.stockValuation() });
  const rows = data?.data ?? [];
  const totalValue = rows.reduce((s: number, r: any) => s + r.totalValue, 0);

  const columns: Column<any>[] = [
    { key: 'productName', header: 'Product', render: r => <span className="text-sm font-medium">{r.productName}</span> },
    { key: 'sku', header: 'SKU', render: r => <span className="font-mono text-xs">{r.sku}</span> },
    { key: 'locationName', header: 'Location', render: r => <span className="text-sm">{r.locationName}</span> },
    { key: 'quantityOnHand', header: 'Qty', render: r => <span className="font-mono text-sm">{r.quantityOnHand}</span> },
    { key: 'unitCost', header: 'Unit Cost', render: r => <span className="font-mono text-sm">{fmt(r.unitCost)}</span> },
    { key: 'totalValue', header: 'Total Value', render: r => <span className="font-mono text-sm font-semibold">{fmt(r.totalValue)}</span>, className: 'text-right' },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">Stock Valuation</h1>
        <div className="card px-5 py-3">
          <p className="text-xs text-ink-soft">Total Inventory Value</p>
          <p className="font-mono text-xl font-bold text-teal-dark">{fmt(totalValue)}</p>
        </div>
      </div>
      <div className="card">
        <DataTable columns={columns} data={rows} keyField="id" loading={isLoading} emptyMessage="No stock to value." />
      </div>
    </div>
  );
};
