import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { suppliersApi } from '../../api/client';
import { DataTable, type Column } from '../../components/DataTable';

export const SuppliersPage: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ['suppliers'], queryFn: () => suppliersApi.list() });
  const items = data?.data ?? [];

  const columns: Column<any>[] = [
    { key: 'name', header: 'Supplier', render: s => <span className="text-sm font-medium">{s.name}</span> },
    { key: 'contactName', header: 'Contact', render: s => <span className="text-sm">{s.contactName || '—'}</span> },
    { key: 'phone', header: 'Phone', render: s => <span className="font-mono text-sm">{s.phone || '—'}</span> },
    { key: 'email', header: 'Email', render: s => <span className="text-sm text-ink-soft">{s.email || '—'}</span> },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">Suppliers</h1>
        <button className="btn-primary" id="new-supplier-btn"><Plus size={14} /> New Supplier</button>
      </div>
      <div className="card">
        <DataTable columns={columns} data={items} keyField="id" loading={isLoading} emptyMessage="No suppliers yet." />
      </div>
    </div>
  );
};
