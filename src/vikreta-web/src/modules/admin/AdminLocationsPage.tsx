import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { locationsApi } from '../../api/client';
import { DataTable, type Column } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';

export const AdminLocationsPage: React.FC = () => {
  const { data, isLoading } = useQuery({ queryKey: ['locations'], queryFn: () => locationsApi.list() });
  const items = data?.data ?? [];

  const columns: Column<any>[] = [
    { key: 'name', header: 'Name', render: l => <span className="text-sm font-medium">{l.name}</span> },
    { key: 'address', header: 'Address', render: l => <span className="text-sm text-ink-soft">{l.address}</span> },
    { key: 'timeZone', header: 'Timezone', render: l => <span className="font-mono text-xs">{l.timeZone}</span> },
    { key: 'isActive', header: 'Status', render: l => <StatusBadge status={l.isActive ? 'paid' : 'void'} /> },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">Locations</h1>
        <button className="btn-primary" id="new-location-btn"><Plus size={14} /> New Location</button>
      </div>
      <div className="card">
        <DataTable columns={columns} data={items} keyField="id" loading={isLoading} emptyMessage="No locations." />
      </div>
    </div>
  );
};
