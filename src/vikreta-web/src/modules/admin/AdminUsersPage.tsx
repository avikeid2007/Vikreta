import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { adminApi, locationsApi } from '../../api/client';
import { DataTable, type Column } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';

export const AdminUsersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'Cashier',
    locationId: '',
  });

  const { data, isLoading } = useQuery({ queryKey: ['admin-users'], queryFn: () => adminApi.listUsers() });
  const items = data?.data ?? [];

  const { data: locData } = useQuery({ queryKey: ['locations'], queryFn: () => locationsApi.list() });
  const locations = (Array.isArray(locData) ? locData : (locData?.data ?? [])) as any[];

  const createMutation = useMutation({
    mutationFn: () => {
      return adminApi.createUser({
        ...form,
        locationId: form.locationId || null,
      });
    },
    onSuccess: () => {
      toast.success('User created successfully!');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setIsModalOpen(false);
      setForm({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'Cashier',
        locationId: '',
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to create user.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error('First and last name are required');
      return;
    }
    if (!form.email.trim()) {
      toast.error('Email is required');
      return;
    }
    if (!form.password || form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    createMutation.mutate();
  };

  const columns: Column<any>[] = [
    {
      key: 'name',
      header: 'Name',
      render: u => <span className="text-sm font-medium">{u.firstName} {u.lastName}</span>,
    },
    { key: 'email', header: 'Email', render: u => <span className="text-sm text-ink-soft">{u.email}</span> },
    { key: 'role', header: 'Role', render: u => <StatusBadge status={u.role} /> },
    {
      key: 'locationId',
      header: 'Access',
      render: u => {
        const loc = locations.find(l => l.id === u.locationId);
        return <span className="text-sm">{loc ? loc.name : 'All locations'}</span>;
      },
    },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold">Users & Roles</h1>
          <p className="text-xs text-ink-soft mt-0.5">Staff members, roles, and store access</p>
        </div>
        <button
          onClick={() => {
            setForm({
              firstName: '',
              lastName: '',
              email: '',
              password: '',
              role: 'Cashier',
              locationId: '',
            });
            setIsModalOpen(true);
          }}
          className="btn-primary"
          id="new-user-btn"
        >
          <Plus size={14} /> New User
        </button>
      </div>

      <div className="card">
        <DataTable columns={columns} data={items} keyField="id" loading={isLoading} emptyMessage="No users." />
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative card w-full max-w-md z-10 animate-in fade-in slide-in-from-bottom-4 shadow-xl">
            <div className="card-head">
              <h2 className="text-base font-bold">New User Account</h2>
              <button onClick={() => setIsModalOpen(false)} className="btn-ghost p-1 rounded">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">First Name *</label>
                  <input
                    autoFocus
                    type="text"
                    required
                    value={form.firstName}
                    onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                    placeholder="e.g. Priya"
                    className="input"
                    id="user-firstname"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={form.lastName}
                    onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                    placeholder="e.g. Patel"
                    className="input"
                    id="user-lastname"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="e.g. priya@store.com"
                  className="input"
                  id="user-email"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">Initial Password *</label>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Min 6 characters"
                  className="input"
                  id="user-password"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">Role *</label>
                  <select
                    value={form.role}
                    onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                    className="input"
                    id="user-role"
                  >
                    <option value="Cashier">Cashier</option>
                    <option value="Manager">Manager</option>
                    <option value="Owner">Owner</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">Location Access</label>
                  <select
                    value={form.locationId}
                    onChange={e => setForm(f => ({ ...f, locationId: e.target.value }))}
                    className="input"
                    id="user-location"
                  >
                    <option value="">All Locations</option>
                    {locations.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
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
                  disabled={createMutation.isPending}
                  className="btn-primary"
                  id="save-user-btn"
                >
                  {createMutation.isPending ? 'Saving…' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
