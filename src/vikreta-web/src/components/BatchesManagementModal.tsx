import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X, Clock, Plus, Search,
  Trash2, CheckCircle2, AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { stockApi, productsApi } from '../api/client';
import { useLocationStore } from '../stores/locationStore';

interface BatchesManagementModalProps {
  onClose: () => void;
  initialProductId?: string;
}

export const BatchesManagementModal: React.FC<BatchesManagementModalProps> = ({
  onClose,
  initialProductId,
}) => {
  const queryClient = useQueryClient();
  const { activeLocation } = useLocationStore();
  const [tab, setTab] = useState<'list' | 'new'>('list');
  const [search, setSearch] = useState('');
  const [filterExpiring, setFilterExpiring] = useState<'all' | 'expiring' | 'expired'>('all');

  // Write-off state
  const [writeOffBatch, setWriteOffBatch] = useState<any | null>(null);
  const [writeOffQty, setWriteOffQty] = useState('');
  const [writeOffReason, setWriteOffReason] = useState('Expired / Spoiled stock write-off');

  // New Batch Form State
  const [form, setForm] = useState({
    productId: initialProductId || '',
    batchNumber: '',
    manufacturingDate: '',
    expiryDate: '',
    quantityOnHand: 10,
    unitCost: 0,
  });

  // Queries
  const { data: batchesData, isLoading } = useQuery({
    queryKey: ['stock-batches', activeLocation?.id, filterExpiring],
    queryFn: () =>
      stockApi.listBatches({
        locationId: activeLocation?.id,
        expiringWithinDays: filterExpiring === 'expiring' ? 30 : undefined,
      }),
  });

  const { data: productsData } = useQuery({
    queryKey: ['products-list-batches'],
    queryFn: () => productsApi.list({ pageSize: 250 }),
  });

  const batches: any[] = batchesData?.data ?? [];
  const products: any[] = productsData?.data?.items ?? [];

  // Filter batches
  const filteredBatches = useMemo(() => {
    return batches.filter((b: any) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        b.batchNumber.toLowerCase().includes(q) ||
        b.productName.toLowerCase().includes(q) ||
        b.productSku.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (filterExpiring === 'expired') return b.isExpired;
      if (filterExpiring === 'expiring') return !b.isExpired && b.daysUntilExpiry <= 30;
      return true;
    });
  }, [batches, search, filterExpiring]);

  // Mutations
  const createBatchMutation = useMutation({
    mutationFn: () => {
      if (!form.productId) throw new Error('Product is required');
      if (!form.batchNumber.trim()) throw new Error('Batch number is required');
      if (!form.expiryDate) throw new Error('Expiry date is required');
      if (form.quantityOnHand <= 0) throw new Error('Quantity must be positive');

      return stockApi.createBatch({
        locationId: activeLocation?.id,
        productId: form.productId,
        batchNumber: form.batchNumber.trim().toUpperCase(),
        manufacturingDate: form.manufacturingDate ? form.manufacturingDate : null,
        expiryDate: form.expiryDate,
        quantity: Math.floor(Number(form.quantityOnHand)),
        unitCost: Number(form.unitCost),
      });
    },
    onSuccess: () => {
      toast.success('Batch registered successfully!');
      queryClient.invalidateQueries({ queryKey: ['stock-batches'] });
      queryClient.invalidateQueries({ queryKey: ['stock-batches-summary'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      setTab('list');
      setForm({
        productId: '',
        batchNumber: '',
        manufacturingDate: '',
        expiryDate: '',
        quantityOnHand: 10,
        unitCost: 0,
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || 'Failed to create batch.');
    },
  });

  const writeOffMutation = useMutation({
    mutationFn: () => {
      if (!writeOffBatch) throw new Error('No batch selected');
      const qty = parseInt(writeOffQty, 10);
      if (isNaN(qty) || qty <= 0) throw new Error('Valid quantity is required');

      return stockApi.writeOffBatch(writeOffBatch.id, {
        quantity: qty,
        reason: writeOffReason,
        notes: writeOffReason,
      });
    },
    onSuccess: () => {
      toast.success('Batch stock written off / disposed.');
      queryClient.invalidateQueries({ queryKey: ['stock-batches'] });
      queryClient.invalidateQueries({ queryKey: ['stock-batches-summary'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      setWriteOffBatch(null);
      setWriteOffQty('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || 'Failed to write off batch.');
    },
  });

  const expiredCount = batches.filter((b: any) => b.isExpired).length;
  const expiringSoonCount = batches.filter((b: any) => !b.isExpired && b.daysUntilExpiry <= 30).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border-2 border-ink rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-ink bg-paper-alt flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 border-2 border-ink flex items-center justify-center text-amber-900 shadow-sm">
              <Clock size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-ink">Batch & Expiry Date Management</h2>
                <span className="text-xs px-2 py-0.5 bg-ink text-white font-mono rounded">
                  FMCG / Food
                </span>
              </div>
              <p className="text-xs text-ink-soft">
                Location: <span className="font-semibold text-ink">{activeLocation?.name ?? 'All Stores'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-ink-soft hover:text-ink p-1.5 rounded-lg hover:bg-paper-alt transition-colors"
            id="close-batch-modal-btn"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab & Alerts Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b-2 border-line bg-paper-alt/50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab('list')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border-2 transition-all ${
                tab === 'list' ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-line hover:border-ink'
              }`}
            >
              Active Batches ({batches.length})
            </button>
            <button
              onClick={() => setTab('new')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border-2 transition-all flex items-center gap-1.5 ${
                tab === 'new' ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-line hover:border-ink'
              }`}
            >
              <Plus size={14} /> New Batch
            </button>
          </div>

          {/* Quick Alert Badges */}
          <div className="flex items-center gap-2">
            {expiredCount > 0 && (
              <button
                onClick={() => {
                  setTab('list');
                  setFilterExpiring('expired');
                }}
                className="px-2.5 py-1 rounded-lg border border-cherry/40 bg-cherry-light text-cherry text-xs font-bold flex items-center gap-1 hover:brightness-95"
              >
                <AlertCircle size={13} />
                <span>{expiredCount} Expired</span>
              </button>
            )}
            {expiringSoonCount > 0 && (
              <button
                onClick={() => {
                  setTab('list');
                  setFilterExpiring('expiring');
                }}
                className="px-2.5 py-1 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-xs font-bold flex items-center gap-1 hover:brightness-95"
              >
                <Clock size={13} />
                <span>{expiringSoonCount} Expiring Soon (30d)</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: Batch List */}
        {tab === 'list' && (
          <div className="flex-1 flex flex-col overflow-hidden p-6">
            {/* Search and Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search batch #, product name, or SKU…"
                  className="input pl-9 text-xs py-2 w-full"
                />
              </div>

              <div className="flex items-center gap-1.5">
                {(['all', 'expiring', 'expired'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilterExpiring(f)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg border transition-colors ${
                      filterExpiring === f
                        ? 'bg-ink text-white border-ink'
                        : 'bg-white text-ink-soft border-line hover:border-ink'
                    }`}
                  >
                    {f === 'all' ? 'All Batches' : f === 'expiring' ? 'Expiring Soon' : 'Expired'}
                  </button>
                ))}
              </div>
            </div>

            {/* Batches Table */}
            <div className="flex-1 overflow-y-auto border-2 border-line rounded-2xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-paper-alt border-b-2 border-line text-ink-soft text-xs sticky top-0 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Batch Number</th>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">Mfg Date</th>
                    <th className="py-3 px-4">Expiry Date</th>
                    <th className="py-3 px-4 text-right">Qty On Hand</th>
                    <th className="py-3 px-4">Expiry Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredBatches.map((b: any) => {
                    const isExp = b.isExpired;
                    const isSoon = !isExp && b.daysUntilExpiry <= 30;

                    return (
                      <tr key={b.id} className="hover:bg-paper-alt/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-ink">
                          {b.batchNumber}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-ink text-xs">{b.productName}</p>
                          <p className="font-mono text-[11px] text-ink-soft">{b.productSku}</p>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-ink-soft">
                          {b.manufacturingDate
                            ? new Date(b.manufacturingDate).toLocaleDateString('en-IN')
                            : '—'}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs font-bold">
                          {new Date(b.expiryDate).toLocaleDateString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-sm">
                          {b.quantityOnHand}
                        </td>
                        <td className="py-3 px-4">
                          {isExp ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-cherry-light text-cherry border border-cherry/30">
                              <AlertCircle size={12} /> EXPIRED
                            </span>
                          ) : isSoon ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                              <Clock size={12} /> {b.daysUntilExpiry} days left
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-light text-teal-dark border border-teal/30">
                              <CheckCircle2 size={12} /> {b.daysUntilExpiry} days left
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setWriteOffBatch(b);
                              setWriteOffQty(String(b.quantityOnHand));
                            }}
                            className="btn-ghost text-xs py-1 px-2 text-cherry hover:bg-rose-50 rounded"
                            title="Write off / dispose stock from batch"
                          >
                            <Trash2 size={13} />
                            <span>Dispose</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredBatches.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-ink-soft text-sm">
                        {isLoading ? 'Loading batches…' : 'No batches found. Click "New Batch" to create one.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: New Batch Form */}
        {tab === 'new' && (
          <div className="flex-1 overflow-y-auto p-6 max-w-xl mx-auto w-full">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createBatchMutation.mutate();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-ink mb-1">Select Product *</label>
                <select
                  value={form.productId}
                  onChange={(e) => setForm({ ...form, productId: e.target.value })}
                  className="input text-sm w-full"
                  required
                >
                  <option value="">-- Choose Product --</option>
                  {products.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">Batch Number *</label>
                  <input
                    type="text"
                    value={form.batchNumber}
                    onChange={(e) => setForm({ ...form, batchNumber: e.target.value })}
                    placeholder="e.g. BATCH-2026-09"
                    className="input uppercase font-mono text-sm w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">Quantity Received *</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.quantityOnHand}
                    onChange={(e) => setForm({ ...form, quantityOnHand: Number(e.target.value) })}
                    className="input font-mono text-sm w-full"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">Manufacturing Date</label>
                  <input
                    type="date"
                    value={form.manufacturingDate}
                    onChange={(e) => setForm({ ...form, manufacturingDate: e.target.value })}
                    className="input text-sm w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">Expiry Date *</label>
                  <input
                    type="date"
                    value={form.expiryDate}
                    onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                    className="input text-sm w-full font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">Unit Cost (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.unitCost}
                  onChange={(e) => setForm({ ...form, unitCost: Number(e.target.value) })}
                  className="input font-mono text-sm w-full"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setTab('list')}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createBatchMutation.isPending}
                  className="btn-primary text-sm"
                >
                  {createBatchMutation.isPending ? 'Registering…' : 'Register Batch'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Write-off / Disposal Dialog */}
        {writeOffBatch && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="bg-white border-2 border-ink rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-bold text-sm text-cherry flex items-center gap-1.5">
                  <Trash2 size={16} /> Write Off / Dispose Stock
                </span>
                <button onClick={() => setWriteOffBatch(null)} className="text-ink-soft hover:text-ink">
                  <X size={16} />
                </button>
              </div>

              <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-900">
                <p className="font-bold">{writeOffBatch.productName}</p>
                <p className="font-mono text-[11px] mt-0.5">Batch: {writeOffBatch.batchNumber}</p>
                <p className="mt-1">Available to dispose: <strong>{writeOffBatch.quantityOnHand} units</strong></p>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">Quantity to Dispose</label>
                <input
                  type="number"
                  min="1"
                  max={writeOffBatch.quantityOnHand}
                  value={writeOffQty}
                  onChange={(e) => setWriteOffQty(e.target.value)}
                  className="input font-mono text-sm w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">Disposal Reason</label>
                <input
                  type="text"
                  value={writeOffReason}
                  onChange={(e) => setWriteOffReason(e.target.value)}
                  placeholder="e.g. Expired stock or broken seal"
                  className="input text-xs w-full"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setWriteOffBatch(null)}
                  className="btn-secondary text-xs flex-1"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => writeOffMutation.mutate()}
                  disabled={writeOffMutation.isPending}
                  className="btn-danger text-xs flex-1 justify-center"
                >
                  {writeOffMutation.isPending ? 'Processing…' : 'Confirm Disposal'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
