import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ChevronLeft } from 'lucide-react';
import { invoicesApi } from '../../api/client';
import { StatusBadge } from '../../components/StatusBadge';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { MoneyInput } from '../../components/FormControls';

const fmt = (n: number) => `₹${n.toFixed(2)}`;

export const InvoiceDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [voidOpen, setVoidOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  const { data, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoicesApi.get(id!),
  });
  const invoice = data?.data;

  const voidMutation = useMutation({
    mutationFn: () => invoicesApi.void(id!),
    onSuccess: () => { toast.success('Invoice voided.'); qc.invalidateQueries({ queryKey: ['invoice', id] }); setVoidOpen(false); },
    onError: () => toast.error('Failed to void invoice.'),
  });

  const payMutation = useMutation({
    mutationFn: () => invoicesApi.addPayment(id!, { amount: paymentAmount, method: paymentMethod, referenceNumber: '' }),
    onSuccess: () => { toast.success('Payment added!'); qc.invalidateQueries({ queryKey: ['invoice', id] }); setPaymentAmount(0); },
    onError: () => toast.error('Failed to add payment.'),
  });

  if (isLoading) return <div className="p-8 text-center text-ink-soft">Loading…</div>;
  if (!invoice) return <div className="p-8 text-center text-cherry">Invoice not found.</div>;

  return (
    <div className="p-6 max-w-3xl">
      <button onClick={() => navigate('/invoices')} className="flex items-center gap-1 text-sm text-ink-soft hover:text-ink mb-4">
        <ChevronLeft size={14} /> Back to Invoices
      </button>

      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold font-mono">#{invoice.invoiceNumber}</h1>
          <p className="text-sm text-ink-soft">{new Date(invoice.issuedAt).toLocaleString()} · {invoice.locationName}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={invoice.status} />
          {invoice.status !== 'Void' && (
            <button onClick={() => setVoidOpen(true)} className="btn-danger" id="void-btn">
              Void Invoice
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Lines */}
        <div className="card md:col-span-2">
          <div className="card-head"><h3 className="text-sm font-bold">Line Items</h3></div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th><th className="text-right">Qty</th>
                <th className="text-right">Unit Price</th>
                <th className="text-right">Tax</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((l: any) => (
                <tr key={l.id}>
                  <td>
                    <p className="text-sm font-medium">{l.productNameSnapshot}</p>
                    {l.variantAttributeSnapshot && <p className="text-xs text-ink-soft">{l.variantAttributeSnapshot}</p>}
                  </td>
                  <td className="text-right font-mono text-sm">{l.quantity}</td>
                  <td className="text-right font-mono text-sm">{fmt(l.unitPriceSnapshot)}</td>
                  <td className="text-right font-mono text-xs text-ink-soft">{(l.taxRateSnapshot * 100).toFixed(0)}%</td>
                  <td className="text-right font-mono text-sm font-semibold">{fmt(l.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-line">
                <td colSpan={4} className="text-right text-xs text-ink-soft px-4 py-2">Subtotal</td>
                <td className="text-right font-mono px-4 py-2">{fmt(invoice.subtotal)}</td>
              </tr>
              <tr>
                <td colSpan={4} className="text-right text-xs text-ink-soft px-4 py-2">Tax</td>
                <td className="text-right font-mono px-4 py-2">{fmt(invoice.taxTotal)}</td>
              </tr>
              <tr className="font-bold text-base">
                <td colSpan={4} className="text-right px-4 py-3">Total</td>
                <td className="text-right font-mono px-4 py-3 text-teal-dark">{fmt(invoice.grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Payments */}
        <div className="card">
          <div className="card-head"><h3 className="text-sm font-bold">Payments</h3></div>
          <div>
            {invoice.payments.map((p: any) => (
              <div key={p.id} className="flex justify-between items-center px-4 py-3 border-b border-paper-alt last:border-b-0 text-sm">
                <div>
                  <p className="font-medium">{p.method}</p>
                  <p className="text-xs text-ink-soft">{new Date(p.paidAt).toLocaleString()}</p>
                </div>
                <span className="font-mono font-semibold">{fmt(p.amount)}</span>
              </div>
            ))}
            {invoice.payments.length === 0 && (
              <p className="text-center text-sm text-ink-soft py-6">No payments recorded.</p>
            )}
          </div>
        </div>

        {/* Add payment */}
        {invoice.status !== 'Void' && invoice.status !== 'Paid' && (
          <div className="card">
            <div className="card-head"><h3 className="text-sm font-bold">Add Payment</h3></div>
            <div className="px-4 py-4 space-y-3">
              <MoneyInput label="Amount" id="payment-amount" value={paymentAmount} onChange={setPaymentAmount} />
              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">Method</label>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="input" id="payment-method">
                  <option>Cash</option><option>Card</option><option>StoreCredit</option><option>Other</option>
                </select>
              </div>
              <button onClick={() => payMutation.mutate()} disabled={paymentAmount <= 0 || payMutation.isPending} className="btn-teal w-full justify-center" id="add-payment-btn">
                {payMutation.isPending ? 'Adding…' : 'Add Payment'}
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog isOpen={voidOpen} title="Void Invoice" message={`Void invoice #${invoice.invoiceNumber}? Stock will be reversed.`} confirmLabel="Void" variant="danger" onConfirm={() => voidMutation.mutate()} onCancel={() => setVoidOpen(false)} />
    </div>
  );
};
