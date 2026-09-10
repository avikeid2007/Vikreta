import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ChevronLeft } from 'lucide-react';
import { stockApi, productsApi } from '../../api/client';
import { useLocationStore } from '../../stores/locationStore';

const REASONS = ['CountCorrection', 'DamageLoss', 'Donation', 'Found', 'OpeningStock', 'Other'];

export const AdjustmentPage: React.FC = () => {
  const { activeLocation } = useLocationStore();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    productId: '',
    variantId: null as string | null,
    sign: '+',
    quantity: 0,
    reason: 'CountCorrection',
    notes: '',
    reorderPoint: 5,
    reorderQuantity: 20,
  });

  const { data: productsData } = useQuery({
    queryKey: ['products', 'all'],
    queryFn: () => productsApi.list({ pageSize: 200 }),
  });
  const products = productsData?.data?.items ?? [];

  const { data: stockData } = useQuery({
    queryKey: ['stock', activeLocation?.id],
    queryFn: () => stockApi.list(activeLocation?.id),
    enabled: Boolean(activeLocation?.id),
  });
  const stockItems: any[] = stockData?.data ?? [];

  const handleProductChange = (productId: string) => {
    const stockItem = stockItems.find((s: any) => s.productId === productId);
    setForm(f => ({
      ...f,
      productId,
      reorderPoint: stockItem ? stockItem.reorderPoint : f.reorderPoint,
      reorderQuantity: stockItem ? stockItem.reorderQuantity : f.reorderQuantity,
    }));
  };

  const mutation = useMutation({
    mutationFn: () =>
      stockApi.adjust({
        productId: form.productId,
        variantId: form.variantId,
        locationId: activeLocation?.id,
        quantityChange: form.sign === '+' ? form.quantity : -form.quantity,
        reason: form.reason,
        notes: form.notes,
        reorderPoint: form.reorderPoint,
        reorderQuantity: form.reorderQuantity,
      }),
    onSuccess: () => {
      toast.success('Stock and reorder threshold adjusted!');
      qc.invalidateQueries({ queryKey: ['stock'] });
      navigate('/inventory');
    },
    onError: () => toast.error('Failed to adjust stock.'),
  });

  return (
    <div className="p-6 max-w-lg">
      <button onClick={() => navigate('/inventory')} className="flex items-center gap-1 text-sm text-ink-soft hover:text-ink mb-4">
        <ChevronLeft size={14} /> Back to Stock
      </button>
      <h1 className="text-xl font-bold mb-5">Stock Adjustment</h1>

      <div className="card">
        <div className="card-head"><h3 className="text-sm font-bold">Adjustment Details</h3></div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-soft mb-1">Product *</label>
            <select
              value={form.productId}
              onChange={e => handleProductChange(e.target.value)}
              className="input"
              id="adjust-product"
            >
              <option value="">Select product…</option>
              {products.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-soft mb-1">Adjustment *</label>
            <div className="flex items-center gap-2">
              <select value={form.sign} onChange={e => setForm(f => ({ ...f, sign: e.target.value }))} className="input w-24" id="adjust-sign">
                <option value="+">+ Add</option>
                <option value="-">− Remove</option>
              </select>
              <input
                type="number"
                min="1"
                value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: parseInt(e.target.value) || 0 }))}
                className="input flex-1 font-mono"
                id="adjust-qty"
                placeholder="0"
              />
              <span className="text-sm text-ink-soft">units</span>
            </div>
          </div>

          {/* Reorder Settings (Threshold) */}
          <div className="p-3.5 rounded-xl border border-teal/40 bg-teal-light/20 space-y-3">
            <h4 className="text-xs font-bold text-teal-dark uppercase tracking-wider">
              Reorder Settings (Threshold)
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">Reorder At *</label>
                <input
                  type="number"
                  min="0"
                  value={form.reorderPoint}
                  onChange={e => setForm(f => ({ ...f, reorderPoint: Math.max(0, parseInt(e.target.value) || 0) }))}
                  className="input font-mono text-sm font-bold bg-white border-teal/50"
                  id="adjust-reorder-point"
                />
                <p className="text-[11px] text-ink-soft mt-1">Triggers low stock alert when on-hand is ≤ this value.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-ink mb-1">Reorder Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={form.reorderQuantity}
                  onChange={e => setForm(f => ({ ...f, reorderQuantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                  className="input font-mono text-sm bg-white"
                  id="adjust-reorder-qty"
                />
                <p className="text-[11px] text-ink-soft mt-1">Default restock order pack size.</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-soft mb-1">Reason *</label>
            <select value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} className="input" id="adjust-reason">
              {REASONS.map(r => <option key={r} value={r}>{r.replace(/([A-Z])/g, ' $1').trim()}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-soft mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input resize-none" rows={2} id="adjust-notes" />
          </div>

          <button
            onClick={() => mutation.mutate()}
            disabled={!form.productId || form.quantity <= 0 || mutation.isPending}
            className={form.sign === '+' ? 'btn-teal w-full justify-center' : 'btn-danger w-full justify-center'}
            id="submit-adjustment-btn"
          >
            {mutation.isPending ? 'Saving…' : `${form.sign === '+' ? 'Add' : 'Remove'} ${form.quantity} units`}
          </button>
        </div>
      </div>
    </div>
  );
};
