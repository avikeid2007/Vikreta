import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../../api/client';
import { DataTable, type Column } from '../../components/DataTable';

const fmt = (n: number) => `₹${n.toFixed(2)}`;

export const TopProductsPage: React.FC = () => {
  const { data, isLoading } = useQuery({ queryKey: ['report-top-products'], queryFn: () => reportsApi.topProducts({ top: 20 }) });
  const rows = data?.data ?? [];

  const columns: Column<any>[] = [
    { key: 'rank', header: '#', render: r => <span className="font-mono font-bold text-lg text-ink-soft">{r.rank}</span> },
    { key: 'productName', header: 'Product', render: r => <span className="text-sm font-medium">{r.productName}</span> },
    { key: 'sku', header: 'SKU', render: r => <span className="font-mono text-xs">{r.sku}</span> },
    { key: 'unitsSold', header: 'Units Sold', render: r => <span className="font-mono text-sm font-semibold">{r.unitsSold}</span> },
    { key: 'revenue', header: 'Revenue', render: r => <span className="font-mono text-sm font-bold text-teal-dark">{fmt(r.revenue)}</span>, className: 'text-right' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-5">Top Products (Last 30 Days)</h1>
      <div className="card">
        <DataTable columns={columns} data={rows} keyField="productId" loading={isLoading} emptyMessage="No sales data." />
      </div>
    </div>
  );
};
