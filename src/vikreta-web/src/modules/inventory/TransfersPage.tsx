import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Trash2, PackagePlus, Eye, ArrowRight, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { transfersApi, locationsApi } from '../../api/client';
import { DataTable, type Column } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';
import { ProductPicker } from '../../components/ProductPicker';
import { useLocationStore } from '../../stores/locationStore';

interface TransferLineItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
}

export const TransfersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { activeLocation } = useLocationStore();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<any | null>(null);
  const [showProductPicker, setShowProductPicker] = useState(false);

  // New transfer form state
  const [fromLocationId, setFromLocationId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<TransferLineItem[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['transfers'],
    queryFn: () => transfersApi.list(),
  });
  const items = (data?.data ?? []) as any[];

  const { data: locationsData } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locationsApi.list(),
  });
  const locations = (Array.isArray(locationsData) ? locationsData : (locationsData?.data ?? [])) as any[];

  const openCreateModal = () => {
    const fromLoc = activeLocation?.id || (locations[0]?.id ?? '');
    const toLoc = locations.find(l => l.id !== fromLoc)?.id ?? '';
    setFromLocationId(fromLoc);
    setToLocationId(toLoc);
    setNotes('');
    setLines([]);
    setShowProductPicker(false);
    setIsCreateOpen(true);
  };

  const handleSelectProduct = (product: any) => {
    setLines(prev => {
      const existing = prev.find(l => l.productId === product.id);
      if (existing) {
        return prev.map(l =>
          l.productId === product.id ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: 1,
        },
      ];
    });
    setShowProductPicker(false);
  };

  const handleUpdateQty = (index: number, qty: number) => {
    setLines(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], quantity: qty };
      return updated;
    });
  };

  const handleRemoveLine = (index: number) => {
    setLines(prev => prev.filter((_, i) => i !== index));
  };

  const createMutation = useMutation({
    mutationFn: () => {
      return transfersApi.create({
        fromLocationId,
        toLocationId,
        notes,
        lines: lines.map(l => ({
          productId: l.productId,
          variantId: null,
          quantity: l.quantity,
        })),
      });
    },
    onSuccess: () => {
      toast.success('Stock transfer initiated successfully!');
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      setIsCreateOpen(false);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || 'Failed to initiate transfer.';
      toast.error(msg);
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromLocationId || !toLocationId) {
      toast.error('Source and destination locations are required');
      return;
    }
    if (fromLocationId === toLocationId) {
      toast.error('Source and destination locations must be different');
      return;
    }
    if (lines.length === 0) {
      toast.error('Please add at least one product to transfer');
      return;
    }
    if (lines.some(l => l.quantity <= 0)) {
      toast.error('Transfer quantities must be greater than zero');
      return;
    }
    createMutation.mutate();
  };

  const receiveMutation = useMutation({
    mutationFn: (transfer: any) => {
      const receiveLines = transfer.lines.map((l: any) => ({
        lineId: l.id,
        quantityReceived: l.quantity,
      }));
      return transfersApi.receive(transfer.id, { lines: receiveLines });
    },
    onSuccess: () => {
      toast.success('Transfer received into destination inventory!');
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      setSelectedTransfer(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to receive transfer.');
    },
  });

  const columns: Column<any>[] = [
    {
      key: 'route',
      header: 'Transfer Route',
      render: t => (
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-ink">{t.fromLocationName}</span>
          <ArrowRight size={13} className="text-ink-soft shrink-0" />
          <span className="text-sm font-semibold text-ink">{t.toLocationName}</span>
        </div>
      ),
    },
    { key: 'linesCount', header: 'Items', render: t => <span className="font-mono text-sm">{t.lines?.length ?? 0}</span> },
    {
      key: 'createdAt',
      header: 'Initiated',
      render: t => <span className="text-sm text-ink-soft">{new Date(t.createdAt).toLocaleDateString()}</span>,
    },
    { key: 'status', header: 'Status', render: t => <StatusBadge status={t.status} /> },
    {
      key: 'action',
      header: '',
      className: 'text-right',
      render: t => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedTransfer(t);
          }}
          className="btn-ghost p-1 text-ink-soft hover:text-ink"
          title="View Transfer"
        >
          <Eye size={15} />
        </button>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold">Stock Transfers</h1>
          <p className="text-xs text-ink-soft mt-0.5">Move inventory between store locations</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary" id="new-transfer-btn">
          <Plus size={14} /> New Transfer
        </button>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={items}
          keyField="id"
          loading={isLoading}
          onRowClick={t => setSelectedTransfer(t)}
          emptyMessage="No transfers yet."
        />
      </div>

      {/* CREATE TRANSFER MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setIsCreateOpen(false)} />
          <div className="relative card w-full max-w-2xl max-h-[90vh] flex flex-col z-10 animate-in fade-in slide-in-from-bottom-4 shadow-xl">
            <div className="card-head">
              <h2 className="text-base font-bold">New Stock Transfer</h2>
              <button onClick={() => setIsCreateOpen(false)} className="btn-ghost p-1 rounded">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">From Location (Source) *</label>
                  <select
                    value={fromLocationId}
                    onChange={e => setFromLocationId(e.target.value)}
                    className="input"
                    id="transfer-from-select"
                    required
                  >
                    <option value="">Select source…</option>
                    {locations.map(l => (
                      <option key={l.id} value={l.id} disabled={l.id === toLocationId}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">To Location (Destination) *</label>
                  <select
                    value={toLocationId}
                    onChange={e => setToLocationId(e.target.value)}
                    className="input"
                    id="transfer-to-select"
                    required
                  >
                    <option value="">Select destination…</option>
                    {locations.map(l => (
                      <option key={l.id} value={l.id} disabled={l.id === fromLocationId}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-ink mb-1">Notes / Reason</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="e.g. Stock balancing for weekend peak"
                    className="input"
                    id="transfer-notes"
                  />
                </div>
              </div>

              {/* Items */}
              <div className="border-t-2 border-line pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-ink">Products to Transfer ({lines.length})</h3>
                  <button
                    type="button"
                    onClick={() => setShowProductPicker(p => !p)}
                    className="btn-secondary text-xs py-1"
                    id="transfer-add-item-btn"
                  >
                    <PackagePlus size={14} /> Add Product
                  </button>
                </div>

                {showProductPicker && (
                  <div className="mb-4">
                    <ProductPicker
                      onSelect={handleSelectProduct}
                      onClose={() => setShowProductPicker(false)}
                      placeholder="Search product to transfer…"
                    />
                  </div>
                )}

                {lines.length === 0 ? (
                  <div className="p-6 text-center border-2 border-dashed border-ink/20 rounded-lg text-sm text-ink-soft">
                    No items selected. Click &quot;Add Product&quot; to choose products.
                  </div>
                ) : (
                  <div className="border-2 border-ink rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-paper-alt border-b-2 border-ink font-bold text-ink">
                        <tr>
                          <th className="p-2.5">Product</th>
                          <th className="p-2.5 w-32">Quantity</th>
                          <th className="p-2.5 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line bg-paper">
                        {lines.map((line, idx) => (
                          <tr key={line.productId}>
                            <td className="p-2.5">
                              <p className="font-semibold text-ink">{line.productName}</p>
                              <p className="text-[11px] font-mono text-ink-soft">{line.sku}</p>
                            </td>
                            <td className="p-2.5">
                              <input
                                type="number"
                                min="1"
                                value={line.quantity}
                                onChange={e => handleUpdateQty(idx, parseInt(e.target.value) || 1)}
                                className="input py-1 px-2 text-center font-mono w-full"
                              />
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveLine(idx)}
                                className="text-ink-soft hover:text-cherry p-1"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t-2 border-line">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || lines.length === 0}
                  className="btn-primary"
                  id="save-transfer-btn"
                >
                  {createMutation.isPending ? 'Initiating…' : 'Initiate Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setSelectedTransfer(null)} />
          <div className="relative card w-full max-w-lg z-10 animate-in fade-in slide-in-from-bottom-4 shadow-xl">
            <div className="card-head">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  <span>Transfer Details</span>
                  <StatusBadge status={selectedTransfer.status} />
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-ink-soft mt-0.5">
                  <span className="font-medium text-ink">{selectedTransfer.fromLocationName}</span>
                  <ArrowRight size={11} />
                  <span className="font-medium text-ink">{selectedTransfer.toLocationName}</span>
                </div>
              </div>
              <button onClick={() => setSelectedTransfer(null)} className="btn-ghost p-1 rounded">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {selectedTransfer.notes && (
                <div className="bg-paper p-3 rounded border border-line text-xs">
                  <span className="font-bold text-ink">Notes: </span>
                  <span className="text-ink-soft">{selectedTransfer.notes}</span>
                </div>
              )}

              <div className="border-2 border-ink rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-paper-alt border-b-2 border-ink font-bold text-ink">
                    <tr>
                      <th className="p-2.5">Product</th>
                      <th className="p-2.5 text-right">Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line bg-paper">
                    {selectedTransfer.lines?.map((line: any) => (
                      <tr key={line.id}>
                        <td className="p-2.5 font-medium">{line.productName || line.product?.name}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-ink">{line.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-3 border-t-2 border-line">
                <span className="text-xs text-ink-soft">
                  Created {new Date(selectedTransfer.createdAt).toLocaleString()}
                </span>
                {selectedTransfer.status === 'Pending' && (
                  <button
                    onClick={() => receiveMutation.mutate(selectedTransfer)}
                    disabled={receiveMutation.isPending}
                    className="btn-primary text-xs bg-teal-dark hover:bg-teal"
                    id="receive-transfer-btn"
                  >
                    <CheckCircle size={13} /> {receiveMutation.isPending ? 'Receiving…' : 'Receive Transfer'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
