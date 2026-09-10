import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { locationsApi } from '../../api/client';
import { DataTable, type Column } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';

export const AdminLocationsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    address: '',
    timeZone: 'Asia/Kolkata',
  });

  const { data, isLoading } = useQuery({ queryKey: ['locations'], queryFn: () => locationsApi.list() });
  const items = Array.isArray(data) ? data : (data?.data ?? []);

  const createMutation = useMutation({
    mutationFn: () => locationsApi.create(form),
    onSuccess: () => {
      toast.success('Location created successfully!');
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setIsModalOpen(false);
      setForm({ name: '', address: '', timeZone: 'Asia/Kolkata' });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to create location.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Location name is required');
      return;
    }
    createMutation.mutate();
  };

  const columns: Column<any>[] = [
    { key: 'name', header: 'Name', render: l => <span className="text-sm font-semibold text-ink">{l.name}</span> },
    { key: 'address', header: 'Address', render: l => <span className="text-sm text-ink-soft">{l.address || '—'}</span> },
    { key: 'timeZone', header: 'Timezone', render: l => <span className="font-mono text-xs">{l.timeZone}</span> },
    { key: 'isActive', header: 'Status', render: l => <StatusBadge status={l.isActive ? 'paid' : 'void'} /> },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold">Locations</h1>
          <p className="text-xs text-ink-soft mt-0.5">Manage store outlets, warehouses, and branches</p>
        </div>
        <button
          onClick={() => {
            setForm({ name: '', address: '', timeZone: 'Asia/Kolkata' });
            setIsModalOpen(true);
          }}
          className="btn-primary"
          id="new-location-btn"
        >
          <Plus size={14} /> New Location
        </button>
      </div>

      <div className="card">
        <DataTable columns={columns} data={items} keyField="id" loading={isLoading} emptyMessage="No locations." />
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative card w-full max-w-md z-10 animate-in fade-in slide-in-from-bottom-4 shadow-xl">
            <div className="card-head">
              <h2 className="text-base font-bold">New Location</h2>
              <button onClick={() => setIsModalOpen(false)} className="btn-ghost p-1 rounded">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">Location / Store Name *</label>
                <input
                  autoFocus
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Connaught Place Branch"
                  className="input"
                  id="location-name"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">Physical Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="e.g. B-Block, Inner Circle, New Delhi"
                  className="input"
                  id="location-address"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">Timezone</label>
                <select
                  value={form.timeZone}
                  onChange={e => setForm(f => ({ ...f, timeZone: e.target.value }))}
                  className="input"
                  id="location-timezone"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                </select>
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
                  id="save-location-btn"
                >
                  {createMutation.isPending ? 'Saving…' : 'Create Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
