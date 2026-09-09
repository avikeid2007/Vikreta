import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { customersApi } from '../../api/client';
import { DataTable, type Column } from '../../components/DataTable';

const fmt = (n: number) => `₹${n.toFixed(2)}`;

export const CustomersPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search, page],
    queryFn: () => customersApi.list({ search, page, pageSize: 25 }),
  });

  const items = data?.data?.items ?? [];
  const total = data?.data?.totalCount ?? 0;

  const columns: Column<any>[] = [
    { key: 'name', header: 'Name', render: c => <span className="text-sm font-medium">{c.name}</span> },
    { key: 'phone', header: 'Phone', render: c => <span className="font-mono text-sm">{c.phone || '—'}</span> },
    { key: 'email', header: 'Email', render: c => <span className="text-sm text-ink-soft">{c.email || '—'}</span> },
    {
      key: 'storeCreditBalance',
      header: 'Store Credit',
      render: c => <span className={`font-mono text-sm font-semibold ${c.storeCreditBalance > 0 ? 'text-teal-dark' : 'text-ink-soft'}`}>
        {fmt(c.storeCreditBalance)}
      </span>,
    },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">Customers</h1>
        <button onClick={() => navigate('/customers/new')} className="btn-primary" id="new-customer-btn">
          <Plus size={14} /> New Customer
        </button>
      </div>
      <div className="relative max-w-sm mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name, phone, email…" className="input-soft pl-9" id="customer-search" />
      </div>
      <div className="card">
        <DataTable columns={columns} data={items} keyField="id" loading={isLoading} onRowClick={c => navigate(`/customers/${c.id}`)} totalCount={total} page={page} pageSize={25} onPageChange={setPage} emptyMessage="No customers yet." />
      </div>
    </div>
  );
};
