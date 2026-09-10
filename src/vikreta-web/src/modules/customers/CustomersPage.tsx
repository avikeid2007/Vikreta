import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { customersApi } from '../../api/client';
import { DataTable, type Column } from '../../components/DataTable';

const fmt = (n: number) => `₹${n.toFixed(2)}`;

export const CustomersPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' });

  useEffect(() => {
    if (searchParams.get('new') === '1' || searchParams.get('new') === 'true') {
      setIsModalOpen(true);
      searchParams.delete('new');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search, page],
    queryFn: () => customersApi.list({ search, page, pageSize: 25 }),
  });

  const items = data?.data?.items ?? [];
  const total = data?.data?.totalCount ?? 0;

  const createMutation = useMutation({
    mutationFn: () => customersApi.create(form),
    onSuccess: () => {
      toast.success('Customer created successfully!');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsModalOpen(false);
      setForm({ name: '', phone: '', email: '', address: '' });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || 'Failed to create customer.';
      toast.error(msg);
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Customer name is required');
      return;
    }
    createMutation.mutate();
  };

  const columns: Column<any>[] = [
    { key: 'name', header: 'Name', render: c => <span className="text-sm font-medium">{c.name}</span> },
    { key: 'phone', header: 'Phone', render: c => <span className="font-mono text-sm">{c.phone || '—'}</span> },
    { key: 'email', header: 'Email', render: c => <span className="text-sm text-ink-soft">{c.email || '—'}</span> },
    {
      key: 'address',
      header: 'Address',
      render: c => (
        <span className="text-sm text-ink-soft max-w-[200px] truncate block" title={c.address || ''}>
          {c.address || '—'}
        </span>
      ),
    },
    {
      key: 'storeCreditBalance',
      header: 'Store Credit',
      render: c => (
        <span className={`font-mono text-sm font-semibold ${c.storeCreditBalance > 0 ? 'text-teal-dark' : 'text-ink-soft'}`}>
          {fmt(c.storeCreditBalance)}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">Customers</h1>
        <button
          onClick={() => {
            setForm({ name: '', phone: '', email: '', address: '' });
            setIsModalOpen(true);
          }}
          className="btn-primary"
          id="new-customer-btn"
        >
          <Plus size={14} /> New Customer
        </button>
      </div>

      <div className="relative max-w-sm mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name, phone, email, address…"
          className="input-soft pl-9"
          id="customer-search"
        />
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={items}
          keyField="id"
          loading={isLoading}
          onRowClick={c => navigate(`/customers/${c.id}`)}
          totalCount={total}
          page={page}
          pageSize={25}
          onPageChange={setPage}
          emptyMessage="No customers yet."
        />
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative card w-full max-w-md z-10 animate-in fade-in slide-in-from-bottom-4 shadow-xl">
            <div className="card-head">
              <h2 className="text-base font-bold">New Customer</h2>
              <button onClick={() => setIsModalOpen(false)} className="btn-ghost p-1 rounded">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">Full Name *</label>
                <input
                  autoFocus
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Rahul Sharma"
                  className="input"
                  id="customer-name"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-ink mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="e.g. +91 98765 43210"
                  className="input font-mono"
                  id="customer-phone"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-ink mb-1">Email Address</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="e.g. rahul@example.com"
                  className="input"
                  id="customer-email"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-ink mb-1">Address</label>
                <textarea
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Street, City, State, PIN…"
                  className="input resize-none"
                  rows={2}
                  id="customer-address"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="btn-primary"
                  id="save-customer-btn"
                >
                  {createMutation.isPending ? 'Saving…' : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
