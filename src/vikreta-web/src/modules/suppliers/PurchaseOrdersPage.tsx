import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { purchaseOrdersApi } from '../../api/client';
import { DataTable, type Column } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';

export const PurchaseOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ['purchase-orders'], queryFn: () => purchaseOrdersApi.list() });
  const items = data?.data ?? [];

  const columns: Column<any>[] = [
    { key: 'poNumber', header: 'PO #', render: p => <span className="font-mono text-sm">{p.poNumber}</span> },
    { key: 'supplierName', header: 'Supplier', render: p => <span className="text-sm font-medium">{p.supplierName}</span> },
    { key: 'locationName', header: 'Location', render: p => <span className="text-sm">{p.locationName}</span> },
    { key: 'totalLines', header: 'Items', render: p => <span className="font-mono text-sm">{p.totalLines}</span> },
    { key: 'createdAt', header: 'Created', render: p => <span className="text-sm text-ink-soft">{new Date(p.createdAt).toLocaleDateString()}</span> },
    { key: 'status', header: 'Status', render: p => <StatusBadge status={p.status} /> },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">Purchase Orders</h1>
        <button className="btn-primary" id="new-po-btn"><Plus size={14} /> New PO</button>
      </div>
      <div className="card">
        <DataTable columns={columns} data={items} keyField="id" loading={isLoading} emptyMessage="No purchase orders yet." />
      </div>
    </div>
  );
};
