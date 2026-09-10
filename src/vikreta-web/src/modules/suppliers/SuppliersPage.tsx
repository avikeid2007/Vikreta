import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Search, Pencil } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { suppliersApi } from '../../api/client';
import { DataTable, type Column } from '../../components/DataTable';

interface SupplierFormState {
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

const initialForm: SupplierFormState = {
  name: '',
  contactName: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
};

export const SuppliersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null);
  const [form, setForm] = useState<SupplierFormState>(initialForm);

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => suppliersApi.list(),
  });

  const rawItems = (data?.data ?? []) as any[];
  const items = search.trim()
    ? rawItems.filter(s =>
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.contactName?.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase()) ||
        s.phone?.includes(search) ||
        s.address?.toLowerCase().includes(search.toLowerCase())
      )
    : rawItems;

  const openNew = () => {
    setEditingSupplier(null);
    setForm(initialForm);
    setIsModalOpen(true);
  };

  const openEdit = (supplier: any) => {
    setEditingSupplier(supplier);
    setForm({
      name: supplier.name || '',
      contactName: supplier.contactName || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      notes: supplier.notes || '',
    });
    setIsModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      if (editingSupplier) {
        return suppliersApi.update(editingSupplier.id, {
          ...form,
          isActive: editingSupplier.isActive ?? true,
        });
      }
      return suppliersApi.create(form);
    },
    onSuccess: () => {
      toast.success(editingSupplier ? 'Supplier updated!' : 'Supplier created!');
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setIsModalOpen(false);
      setForm(initialForm);
      setEditingSupplier(null);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || 'Failed to save supplier.';
      toast.error(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Supplier name is required');
      return;
    }
    saveMutation.mutate();
  };

  const columns: Column<any>[] = [
    { key: 'name', header: 'Supplier', render: s => <span className="text-sm font-semibold text-ink">{s.name}</span> },
    { key: 'contactName', header: 'Contact Person', render: s => <span className="text-sm">{s.contactName || '—'}</span> },
    { key: 'phone', header: 'Phone', render: s => <span className="font-mono text-sm">{s.phone || '—'}</span> },
    { key: 'email', header: 'Email', render: s => <span className="text-sm text-ink-soft">{s.email || '—'}</span> },
    {
      key: 'address',
      header: 'Address',
      render: s => (
        <span className="text-sm text-ink-soft max-w-[200px] truncate block" title={s.address || ''}>
          {s.address || '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: s => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            openEdit(s);
          }}
          className="btn-ghost p-1 text-ink-soft hover:text-ink"
          title="Edit supplier"
        >
          <Pencil size={14} />
        </button>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">Suppliers</h1>
        <button onClick={openNew} className="btn-primary" id="new-supplier-btn">
          <Plus size={14} /> New Supplier
        </button>
      </div>

      <div className="relative max-w-sm mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, contact, phone, email, address…"
          className="input-soft pl-9"
          id="supplier-search"
        />
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={items}
          keyField="id"
          loading={isLoading}
          onRowClick={openEdit}
          emptyMessage="No suppliers yet."
        />
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="relative card w-full max-w-lg z-10 animate-in fade-in slide-in-from-bottom-4 shadow-xl">
            <div className="card-head">
              <h2 className="text-base font-bold">
                {editingSupplier ? 'Edit Supplier' : 'New Supplier'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="btn-ghost p-1 rounded">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-ink mb-1">Company / Supplier Name *</label>
                  <input
                    autoFocus
                    type="text"
                    required
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Apex Wholesalers Ltd"
                    className="input"
                    id="supplier-name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={form.contactName}
                    onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
                    placeholder="e.g. Vikram Verma"
                    className="input"
                    id="supplier-contact"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="e.g. +91 98111 22233"
                    className="input font-mono"
                    id="supplier-phone"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-ink mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="e.g. orders@apexwholesalers.com"
                    className="input"
                    id="supplier-email"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-ink mb-1">Address</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                    placeholder="e.g. Warehouse 4B, Okhla Industrial Area, New Delhi"
                    className="input"
                    id="supplier-address"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-ink mb-1">Notes / Terms</label>
                  <textarea
                    rows={2}
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Payment terms, delivery schedules, etc."
                    className="input resize-none"
                    id="supplier-notes"
                  />
                </div>
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
                  disabled={saveMutation.isPending}
                  className="btn-primary"
                  id="save-supplier-btn"
                >
                  {saveMutation.isPending ? 'Saving…' : (editingSupplier ? 'Update Supplier' : 'Create Supplier')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
