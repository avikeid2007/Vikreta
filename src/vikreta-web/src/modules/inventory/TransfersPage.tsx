import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { transfersApi } from '../../api/client';
import { DataTable, type Column } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';

export const TransfersPage: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ['transfers'], queryFn: () => transfersApi.list() });
  const items = data?.data ?? [];

  const columns: Column<any>[] = [
    { key: 'fromLocationName', header: 'From', render: t => <span className="text-sm font-medium">{t.fromLocationName}</span> },
    { key: 'toLocationName', header: 'To', render: t => <span className="text-sm font-medium">{t.toLocationName}</span> },
    { key: 'linesCount', header: 'Items', render: t => <span className="font-mono text-sm">{t.lines?.length ?? 0}</span> },
    {
      key: 'createdAt',
      header: 'Created',
      render: t => <span className="text-sm text-ink-soft">{new Date(t.createdAt).toLocaleDateString()}</span>,
    },
    { key: 'status', header: 'Status', render: t => <StatusBadge status={t.status} /> },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">Stock Transfers</h1>
        <button onClick={() => navigate('/inventory/transfers/new')} className="btn-primary" id="new-transfer-btn">
          <Plus size={14} /> New Transfer
        </button>
      </div>
      <div className="card">
        <DataTable columns={columns} data={items} keyField="id" loading={isLoading} emptyMessage="No transfers yet." />
      </div>
    </div>
  );
};
