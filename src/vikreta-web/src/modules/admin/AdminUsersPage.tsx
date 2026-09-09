import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { adminApi } from '../../api/client';
import { DataTable, type Column } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';

export const AdminUsersPage: React.FC = () => {
  const { data, isLoading } = useQuery({ queryKey: ['admin-users'], queryFn: () => adminApi.listUsers() });
  const items = data?.data ?? [];

  const columns: Column<any>[] = [
    {
      key: 'name', header: 'Name',
      render: u => <span className="text-sm font-medium">{u.firstName} {u.lastName}</span>,
    },
    { key: 'email', header: 'Email', render: u => <span className="text-sm text-ink-soft">{u.email}</span> },
    { key: 'role', header: 'Role', render: u => <StatusBadge status={u.role} /> },
    {
      key: 'locationId', header: 'Access',
      render: u => <span className="text-sm">{u.locationId ? 'Single location' : 'All locations'}</span>,
    },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">Users & Roles</h1>
        <button className="btn-primary" id="new-user-btn"><Plus size={14} /> New User</button>
      </div>
      <div className="card">
        <DataTable columns={columns} data={items} keyField="id" loading={isLoading} emptyMessage="No users." />
      </div>
    </div>
  );
};
