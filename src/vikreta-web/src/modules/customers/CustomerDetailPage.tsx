import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { customersApi } from '../../api/client';
import { DataTable, type Column } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';

const fmt = (n: number) => `₹${n.toFixed(2)}`;

export const CustomerDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  if (id === 'new') {
    return <Navigate to="/customers?new=1" replace />;
  }

  const { data: custData } = useQuery({ queryKey: ['customer', id], queryFn: () => customersApi.get(id!), enabled: Boolean(id) && id !== 'new' });
  const { data: invData } = useQuery({ queryKey: ['customer-invoices', id], queryFn: () => customersApi.getInvoices(id!) });

  const customer = custData?.data;
  const invoices = invData?.data?.items ?? [];

  const columns: Column<any>[] = [
    { key: 'invoiceNumber', header: 'Invoice', render: i => <span className="font-mono text-sm">#{i.invoiceNumber}</span> },
    { key: 'issuedAt', header: 'Date', render: i => <span className="text-sm text-ink-soft">{new Date(i.issuedAt).toLocaleDateString()}</span> },
    { key: 'status', header: 'Status', render: i => <StatusBadge status={i.status} /> },
    { key: 'grandTotal', header: 'Total', render: i => <span className="font-mono text-sm font-semibold">{fmt(i.grandTotal)}</span>, className: 'text-right' },
  ];

  if (!customer) return <div className="p-8 text-center text-ink-soft">Loading…</div>;

  return (
    <div className="p-6 max-w-3xl">
      <button onClick={() => navigate('/customers')} className="flex items-center gap-1 text-sm text-ink-soft hover:text-ink mb-4">
        <ChevronLeft size={14} /> Back to Customers
      </button>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
        <div className="card md:col-span-2">
          <div className="card-head"><h3 className="text-sm font-bold">Profile</h3></div>
          <div className="px-5 py-4 space-y-2">
            <p className="text-xl font-bold">{customer.name}</p>
            {customer.phone && <p className="text-sm font-mono">{customer.phone}</p>}
            {customer.email && <p className="text-sm text-ink-soft">{customer.email}</p>}
            {customer.address && <p className="text-sm text-ink-soft">📍 {customer.address}</p>}
            <p className="text-xs text-ink-soft">Customer since {new Date(customer.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><h3 className="text-sm font-bold">Store Credit</h3></div>
          <div className="px-5 py-4 text-center">
            <p className="font-mono text-3xl font-bold text-teal-dark">{fmt(customer.storeCreditBalance)}</p>
            <p className="text-xs text-ink-soft mt-1">Available balance</p>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><h3 className="text-sm font-bold">⭐ Loyalty Points</h3></div>
          <div className="px-5 py-4 text-center">
            <p className="font-mono text-3xl font-bold text-marigold-dark">{customer.loyaltyPoints ?? 0}</p>
            <p className="text-xs text-ink-soft mt-1">Redeemable in POS</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h3 className="text-sm font-bold">Purchase History</h3></div>
        <DataTable columns={columns} data={invoices} keyField="id" onRowClick={i => navigate(`/invoices/${i.id}`)} emptyMessage="No purchases yet." />
      </div>
    </div>
  );
};
