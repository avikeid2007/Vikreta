import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, SlidersHorizontal, AlertTriangle, CheckCircle2, ArrowRight, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { stockApi } from '../api/client';
import { useLocationStore } from '../stores/locationStore';

interface AdjustStockModalProps {
  initialItem?: any | null;
  onClose: () => void;
}

const REASONS = [
  { value: 'CountCorrection', label: 'Cycle / Count Correction' },
  { value: 'DamageLoss', label: 'Damaged / Expired / Spoiled' },
  { value: 'Found', label: 'Found Inventory' },
  { value: 'OpeningStock', label: 'Initial Opening Stock' },
  { value: 'Donation', label: 'Donation / Sample' },
  { value: 'Other', label: 'Other Adjustment' },
];

export const AdjustStockModal: React.FC<AdjustStockModalProps> = ({ initialItem, onClose }) => {
  const { activeLocation } = useLocationStore();
  const qc = useQueryClient();

  const { data: stockData } = useQuery({
    queryKey: ['stock', activeLocation?.id],
    queryFn: () => stockApi.list(activeLocation?.id),
    enabled: !initialItem && Boolean(activeLocation?.id),
  });

  const stockItems: any[] = stockData?.data ?? [];

  const [selectedProductId, setSelectedProductId] = useState<string>(initialItem?.productId ?? '');
  const [activeItem, setActiveItem] = useState<any | null>(initialItem ?? null);

  // Adjustment fields
  const [mode, setMode] = useState<'delta' | 'exact'>('delta');
  const [deltaSign, setDeltaSign] = useState<'+' | '-'>('+');
  const [deltaQty, setDeltaQty] = useState<number>(0);
  const [exactCount, setExactCount] = useState<number>(initialItem?.quantityOnHand ?? 0);
  const [reason, setReason] = useState<string>('CountCorrection');
  const [notes, setNotes] = useState<string>('');

  // Reorder thresholds
  const [reorderPoint, setReorderPoint] = useState<number>(initialItem?.reorderPoint ?? 5);
  const [reorderQuantity, setReorderQuantity] = useState<number>(initialItem?.reorderQuantity ?? 20);

  // When selected product changes
  useEffect(() => {
    if (selectedProductId) {
      const found = initialItem?.productId === selectedProductId
        ? initialItem
        : stockItems.find((s: any) => s.productId === selectedProductId);
      if (found) {
        setActiveItem(found);
        setExactCount(found.quantityOnHand);
        setReorderPoint(found.reorderPoint ?? 0);
        setReorderQuantity(found.reorderQuantity ?? 10);
      }
    }
  }, [selectedProductId, stockItems, initialItem]);

  const currentOnHand = activeItem ? Number(activeItem.quantityOnHand) : 0;

  // Compute quantity change
  const netQuantityChange = mode === 'delta'
    ? (deltaSign === '+' ? deltaQty : -deltaQty)
    : (exactCount - currentOnHand);

  const projectedOnHand = currentOnHand + netQuantityChange;

  const mutation = useMutation({
    mutationFn: () =>
      stockApi.adjust({
        productId: selectedProductId,
        locationId: activeLocation?.id,
        quantityChange: netQuantityChange,
        reason: netQuantityChange === 0 ? 'CountCorrection' : reason,
        notes: notes.trim(),
        reorderPoint: Number(reorderPoint),
        reorderQuantity: Number(reorderQuantity),
      }),
    onSuccess: () => {
      toast.success('Stock level & reorder threshold updated!');
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['report-stock-val'] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to update stock adjustment.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      toast.error('Please select a product.');
      return;
    }
    if (projectedOnHand < 0) {
      toast.error('Adjusted stock cannot result in negative inventory.');
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-ink/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div className="card w-full max-w-lg bg-white shadow-2xl overflow-hidden border border-line">
        {/* Header */}
        <div className="px-5 py-4 border-b border-line flex items-center justify-between bg-paper">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-teal-light text-teal-dark">
              <SlidersHorizontal size={18} />
            </span>
            <div>
              <h2 className="text-base font-bold text-ink">Adjust Stock & Reorder Point</h2>
              <p className="text-xs text-ink-soft">
                Location: <strong className="text-ink">{activeLocation?.name ?? 'Store'}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-ink-soft hover:text-ink p-1 rounded-lg hover:bg-paper-alt transition-colors"
            id="close-adjust-modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Product Selection */}
          <div>
            <label className="block text-xs font-bold text-ink mb-1">Product *</label>
            {initialItem ? (
              <div className="p-3 bg-paper-alt rounded-lg border border-line flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-md bg-white border border-line flex items-center justify-center text-ink-soft">
                    <Package size={16} />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-ink">{initialItem.productName}</p>
                    <p className="font-mono text-xs text-ink-soft">SKU: {initialItem.productSku}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs font-semibold text-ink-soft">Current Stock</p>
                  <p className="font-mono text-sm font-bold text-ink">{initialItem.quantityOnHand} units</p>
                </div>
              </div>
            ) : (
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="input text-sm font-medium"
                id="adjust-modal-product"
                required
              >
                <option value="">Select a product to adjust…</option>
                {stockItems.map((item: any) => (
                  <option key={item.productId} value={item.productId}>
                    {item.productName} ({item.productSku}) — Stock: {item.quantityOnHand} | Reorder At: {item.reorderPoint}
                  </option>
                ))}
              </select>
            )}
          </div>

          {activeItem && (
            <>
              {/* Current vs New Projected Stock Banner */}
              <div className="p-3.5 rounded-xl border border-line bg-paper flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">Current Stock</span>
                  <p className="font-mono text-xl font-bold text-ink">{currentOnHand} <span className="text-xs font-normal text-ink-soft">units</span></p>
                </div>
                <ArrowRight size={18} className="text-ink-soft" />
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">New Projected</span>
                  <p className={`font-mono text-xl font-black ${projectedOnHand < 0 ? 'text-cherry' : projectedOnHand <= reorderPoint ? 'text-marigold-dark' : 'text-teal-dark'}`}>
                    {projectedOnHand} <span className="text-xs font-normal text-ink-soft">units</span>
                  </p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">Threshold</span>
                  <p className="font-mono text-sm font-bold text-ink-soft">At ≤ {reorderPoint}</p>
                </div>
              </div>

              {/* Threshold Status Feedback */}
              {projectedOnHand <= reorderPoint ? (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-950 flex items-center gap-2 text-xs">
                  <AlertTriangle size={14} className="text-marigold-dark flex-shrink-0" />
                  <span>
                    <strong>Low Stock Condition:</strong> Projected stock ({projectedOnHand}) will be at or below the Reorder At threshold ({reorderPoint}).
                  </span>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-teal-light/50 border border-teal/30 text-teal-dark flex items-center gap-2 text-xs">
                  <CheckCircle2 size={14} className="text-teal flex-shrink-0" />
                  <span>Projected stock is healthy and above reorder threshold ({reorderPoint}).</span>
                </div>
              )}

              {/* Stock Quantity Adjustment */}
              <div className="p-4 rounded-xl border border-line bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-ink">Quantity Adjustment</label>
                  <div className="flex items-center gap-1 bg-paper-alt p-0.5 rounded-lg border border-line">
                    <button
                      type="button"
                      onClick={() => setMode('delta')}
                      className={`px-2 py-0.5 text-xs font-bold rounded-md transition-all ${
                        mode === 'delta' ? 'bg-white shadow-2xs text-ink' : 'text-ink-soft hover:text-ink'
                      }`}
                    >
                      +/- Units
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('exact')}
                      className={`px-2 py-0.5 text-xs font-bold rounded-md transition-all ${
                        mode === 'exact' ? 'bg-white shadow-2xs text-ink' : 'text-ink-soft hover:text-ink'
                      }`}
                    >
                      Set Exact
                    </button>
                  </div>
                </div>

                {mode === 'delta' ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={deltaSign}
                      onChange={(e) => setDeltaSign(e.target.value as '+' | '-')}
                      className="input w-28 text-sm font-bold"
                    >
                      <option value="+">+ Add (Stock In)</option>
                      <option value="-">− Deduct (Stock Out)</option>
                    </select>
                    <input
                      type="number"
                      min="0"
                      value={deltaQty === 0 ? '' : deltaQty}
                      onChange={(e) => setDeltaQty(Math.max(0, parseInt(e.target.value) || 0))}
                      className="input flex-1 font-mono text-sm font-bold"
                      placeholder="0 (leave 0 if only changing Reorder At)"
                      id="adjust-modal-qty"
                    />
                    <span className="text-xs text-ink-soft font-medium">units</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-ink-soft font-semibold">New Total Count:</span>
                    <input
                      type="number"
                      min="0"
                      value={exactCount}
                      onChange={(e) => setExactCount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="input flex-1 font-mono text-sm font-bold"
                      id="adjust-modal-exact-qty"
                    />
                    <span className="text-xs text-ink-soft font-medium">units</span>
                  </div>
                )}

                {netQuantityChange !== 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-bold text-ink-soft mb-1">Reason *</label>
                      <select
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="input text-xs"
                      >
                        {REASONS.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-ink-soft mb-1">Notes (Optional)</label>
                      <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="e.g. Broken packaging, weekly audit"
                        className="input text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* REORDER AT (THRESHOLD) & QUANTITY SECTION */}
              <div className="p-4 rounded-xl border-2 border-teal/40 bg-teal-light/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-teal-dark" />
                    <h3 className="text-xs font-bold text-teal-dark uppercase tracking-wider">
                      Reorder Settings (Stock Triggers)
                    </h3>
                  </div>
                  <span className="text-[11px] text-teal-dark font-mono font-bold bg-white px-2 py-0.5 rounded border border-teal/30">
                    Location: {activeLocation?.name}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1 flex items-center justify-between">
                      <span>Reorder At (Threshold) *</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={reorderPoint}
                      onChange={(e) => setReorderPoint(Math.max(0, parseInt(e.target.value) || 0))}
                      className="input font-mono text-sm font-bold bg-white border-2 border-teal/60 focus:border-teal"
                      id="adjust-modal-reorder-point"
                      required
                    />
                    <p className="text-[11px] text-ink-soft mt-1">
                      Triggers low-stock alert when quantity is ≤ this value.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">
                      Reorder Pack Size
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={reorderQuantity}
                      onChange={(e) => setReorderQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="input font-mono text-sm bg-white"
                      id="adjust-modal-reorder-qty"
                    />
                    <p className="text-[11px] text-ink-soft mt-1">
                      Suggested order amount for 1-Click Purchase Orders.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-sm"
              id="cancel-adjust-btn"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedProductId || mutation.isPending}
              className="btn-primary text-sm flex items-center gap-1.5"
              id="save-adjust-btn"
            >
              <SlidersHorizontal size={14} />
              {mutation.isPending ? 'Saving…' : 'Save Adjustment & Reorder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
