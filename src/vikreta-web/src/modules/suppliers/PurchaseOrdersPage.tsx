import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Trash2, Send, CheckCircle, PackagePlus, Eye } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { purchaseOrdersApi, suppliersApi, locationsApi } from '../../api/client';
import { DataTable, type Column } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';
import { ProductPicker } from '../../components/ProductPicker';
import { useLocationStore } from '../../stores/locationStore';

interface POLineItem {
  productId: string;
  productName: string;
  sku: string;
  quantityOrdered: number;
  unitCost: number;
}

const fmt = (n: number) => `₹${n.toFixed(2)}`;

export const PurchaseOrdersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { activeLocation } = useLocationStore();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);
  const [showProductPicker, setShowProductPicker] = useState(false);

  // New PO form state
  const [locationId, setLocationId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<POLineItem[]>([]);

  // Queries
  const { data: poData, isLoading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => purchaseOrdersApi.list(),
  });
  const items = (poData?.data ?? []) as any[];

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => suppliersApi.list(),
  });
  const suppliers = (suppliersData?.data ?? []) as any[];

  const { data: locationsData } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locationsApi.list(),
  });
  const locations = (Array.isArray(locationsData) ? locationsData : (locationsData?.data ?? [])) as any[];

  // Selected PO details query
  const { data: selectedPoData, isLoading: isLoadingPoDetail } = useQuery({
    queryKey: ['purchase-order', selectedPoId],
    queryFn: () => purchaseOrdersApi.get(selectedPoId!),
    enabled: Boolean(selectedPoId),
  });
  const currentPo = selectedPoData?.data;

  // Open Create Modal
  const openCreateModal = () => {
    setLocationId(activeLocation?.id || (locations[0]?.id ?? ''));
    setSupplierId(suppliers[0]?.id ?? '');
    setNotes('');
    setLines([]);
    setShowProductPicker(false);
    setIsCreateOpen(true);
  };

  // Add Product Line
  const handleSelectProduct = (product: any) => {
    setLines(prev => {
      const existing = prev.find(l => l.productId === product.id);
      if (existing) {
        return prev.map(l =>
          l.productId === product.id ? { ...l, quantityOrdered: l.quantityOrdered + 1 } : l
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantityOrdered: 1,
          unitCost: product.defaultCost || 0,
        },
      ];
    });
    setShowProductPicker(false);
  };

  const handleUpdateLine = (index: number, field: 'quantityOrdered' | 'unitCost', value: number) => {
    setLines(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemoveLine = (index: number) => {
    setLines(prev => prev.filter((_, i) => i !== index));
  };

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: () => {
      return purchaseOrdersApi.create({
        locationId,
        supplierId,
        notes,
        lines: lines.map(l => ({
          productId: l.productId,
          variantId: null,
          quantityOrdered: l.quantityOrdered,
          unitCost: l.unitCost,
        })),
      });
    },
    onSuccess: () => {
      toast.success('Purchase order created successfully!');
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      setIsCreateOpen(false);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || 'Failed to create purchase order.';
      toast.error(msg);
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      toast.error('Please select a supplier');
      return;
    }
    if (!locationId) {
      toast.error('Please select a destination location');
      return;
    }
    if (lines.length === 0) {
      toast.error('Please add at least one product item');
      return;
    }
    if (lines.some(l => l.quantityOrdered <= 0)) {
      toast.error('Quantities must be greater than zero');
      return;
    }
    createMutation.mutate();
  };

  // Submit PO Mutation
  const submitMutation = useMutation({
    mutationFn: (id: string) => purchaseOrdersApi.submit(id),
    onSuccess: () => {
      toast.success('Purchase order submitted to supplier!');
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order', selectedPoId] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to submit PO.');
    },
  });

  // Receive PO Mutation (Receive all remaining)
  const receiveMutation = useMutation({
    mutationFn: (po: any) => {
      const receiveLines = po.lines.map((l: any) => ({
        lineId: l.id,
        quantityReceived: l.quantityOrdered - l.quantityReceived,
      })).filter((l: any) => l.quantityReceived > 0);

      return purchaseOrdersApi.receive(po.id, { lines: receiveLines });
    },
    onSuccess: () => {
      toast.success('All items received and inventory updated!');
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order', selectedPoId] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to receive PO.');
    },
  });

  const totalPoAmount = lines.reduce((acc, l) => acc + (l.quantityOrdered * l.unitCost), 0);

  const columns: Column<any>[] = [
    { key: 'poNumber', header: 'PO #', render: p => <span className="font-mono text-sm font-bold text-ink">{p.poNumber}</span> },
    { key: 'supplierName', header: 'Supplier', render: p => <span className="text-sm font-medium">{p.supplierName}</span> },
    { key: 'locationName', header: 'Location', render: p => <span className="text-sm">{p.locationName}</span> },
    { key: 'totalLines', header: 'Items', render: p => <span className="font-mono text-sm">{p.totalLines}</span> },
    { key: 'createdAt', header: 'Created', render: p => <span className="text-sm text-ink-soft">{new Date(p.createdAt).toLocaleDateString()}</span> },
    { key: 'status', header: 'Status', render: p => <StatusBadge status={p.status} /> },
    {
      key: 'action',
      header: '',
      className: 'text-right',
      render: p => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedPoId(p.id);
          }}
          className="btn-ghost p-1 text-ink-soft hover:text-ink"
          title="View PO Details"
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
          <h1 className="text-xl font-bold">Purchase Orders</h1>
          <p className="text-xs text-ink-soft mt-0.5">Procurement and stock receipts from suppliers</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary" id="new-po-btn">
          <Plus size={14} /> New PO
        </button>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={items}
          keyField="id"
          loading={isLoading}
          onRowClick={p => setSelectedPoId(p.id)}
          emptyMessage="No purchase orders yet."
        />
      </div>

      {/* CREATE PO MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setIsCreateOpen(false)} />
          <div className="relative card w-full max-w-2xl max-h-[90vh] flex flex-col z-10 animate-in fade-in slide-in-from-bottom-4 shadow-xl">
            <div className="card-head">
              <h2 className="text-base font-bold">Create Purchase Order</h2>
              <button onClick={() => setIsCreateOpen(false)} className="btn-ghost p-1 rounded">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">Supplier *</label>
                  <select
                    value={supplierId}
                    onChange={e => setSupplierId(e.target.value)}
                    className="input"
                    id="po-supplier-select"
                    required
                  >
                    <option value="">Select a supplier…</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">Destination Location *</label>
                  <select
                    value={locationId}
                    onChange={e => setLocationId(e.target.value)}
                    className="input"
                    id="po-location-select"
                    required
                  >
                    <option value="">Select a location…</option>
                    {locations.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-ink mb-1">Notes / Internal Reference</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="e.g. Monthly replenishment batch #4"
                    className="input"
                    id="po-notes"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div className="border-t-2 border-line pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-ink">Ordered Products ({lines.length})</h3>
                  <button
                    type="button"
                    onClick={() => setShowProductPicker(p => !p)}
                    className="btn-secondary text-xs py-1"
                    id="po-add-item-btn"
                  >
                    <PackagePlus size={14} /> Add Product
                  </button>
                </div>

                {showProductPicker && (
                  <div className="mb-4">
                    <ProductPicker
                      onSelect={handleSelectProduct}
                      onClose={() => setShowProductPicker(false)}
                      placeholder="Search product to add to PO…"
                    />
                  </div>
                )}

                {lines.length === 0 ? (
                  <div className="p-6 text-center border-2 border-dashed border-ink/20 rounded-lg text-sm text-ink-soft">
                    No products added yet. Click &quot;Add Product&quot; to pick items from your catalog.
                  </div>
                ) : (
                  <div className="border-2 border-ink rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-paper-alt border-b-2 border-ink font-bold text-ink">
                        <tr>
                          <th className="p-2.5">Product</th>
                          <th className="p-2.5 w-24">Qty</th>
                          <th className="p-2.5 w-28">Unit Cost</th>
                          <th className="p-2.5 text-right w-28">Subtotal</th>
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
                                value={line.quantityOrdered}
                                onChange={e => handleUpdateLine(idx, 'quantityOrdered', parseInt(e.target.value) || 1)}
                                className="input py-1 px-2 text-center font-mono w-full"
                              />
                            </td>
                            <td className="p-2.5">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={line.unitCost}
                                onChange={e => handleUpdateLine(idx, 'unitCost', parseFloat(e.target.value) || 0)}
                                className="input py-1 px-2 text-right font-mono w-full"
                              />
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-ink">
                              {fmt(line.quantityOrdered * line.unitCost)}
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
                    <div className="bg-paper-alt px-4 py-2.5 flex justify-between items-center border-t-2 border-ink font-bold">
                      <span className="text-xs uppercase text-ink-soft">Estimated Total</span>
                      <span className="font-mono text-sm text-teal-dark">{fmt(totalPoAmount)}</span>
                    </div>
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
                  id="save-po-btn"
                >
                  {createMutation.isPending ? 'Creating…' : 'Create Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PO DETAIL & ACTIONS MODAL */}
      {selectedPoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setSelectedPoId(null)} />
          <div className="relative card w-full max-w-2xl max-h-[90vh] flex flex-col z-10 animate-in fade-in slide-in-from-bottom-4 shadow-xl">
            <div className="card-head">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  <span>PO #{currentPo?.poNumber}</span>
                  {currentPo && <StatusBadge status={currentPo.status} />}
                </h2>
                <p className="text-xs text-ink-soft mt-0.5">
                  Supplier: {currentPo?.supplierName} • Destination: {currentPo?.locationName}
                </p>
              </div>
              <button onClick={() => setSelectedPoId(null)} className="btn-ghost p-1 rounded">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {isLoadingPoDetail ? (
                <div className="py-8 text-center text-ink-soft">Loading order details…</div>
              ) : currentPo ? (
                <>
                  {currentPo.notes && (
                    <div className="bg-paper p-3 rounded border border-line text-xs">
                      <span className="font-bold text-ink">Notes: </span>
                      <span className="text-ink-soft">{currentPo.notes}</span>
                    </div>
                  )}

                  <div className="border-2 border-ink rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-paper-alt border-b-2 border-ink font-bold text-ink">
                        <tr>
                          <th className="p-2.5">Product</th>
                          <th className="p-2.5 text-center">Ordered</th>
                          <th className="p-2.5 text-center">Received</th>
                          <th className="p-2.5 text-right">Unit Cost</th>
                          <th className="p-2.5 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line bg-paper">
                        {currentPo.lines?.map((line: any) => (
                          <tr key={line.id}>
                            <td className="p-2.5 font-medium">{line.productName}</td>
                            <td className="p-2.5 text-center font-mono">{line.quantityOrdered}</td>
                            <td className="p-2.5 text-center font-mono font-bold text-teal-dark">
                              {line.quantityReceived}
                            </td>
                            <td className="p-2.5 text-right font-mono">{fmt(line.unitCost)}</td>
                            <td className="p-2.5 text-right font-mono font-bold">
                              {fmt(line.quantityOrdered * line.unitCost)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Actions based on Status */}
                  <div className="flex items-center justify-between pt-4 border-t-2 border-line">
                    <div className="text-xs text-ink-soft">
                      {currentPo.status === 'Draft' && 'Order is in draft. Submit it when sent to the supplier.'}
                      {(currentPo.status === 'Ordered' || currentPo.status === 'PartiallyReceived') &&
                        'When shipment arrives, mark items as received into inventory.'}
                      {currentPo.status === 'Received' && 'All ordered products have been fully received.'}
                    </div>

                    <div className="flex gap-2">
                      {currentPo.status === 'Draft' && (
                        <button
                          onClick={() => submitMutation.mutate(currentPo.id)}
                          disabled={submitMutation.isPending}
                          className="btn-primary text-xs"
                          id="submit-po-btn"
                        >
                          <Send size={13} /> {submitMutation.isPending ? 'Submitting…' : 'Submit PO'}
                        </button>
                      )}

                      {(currentPo.status === 'Ordered' || currentPo.status === 'PartiallyReceived') && (
                        <button
                          onClick={() => receiveMutation.mutate(currentPo)}
                          disabled={receiveMutation.isPending}
                          className="btn-primary text-xs bg-teal-dark hover:bg-teal"
                          id="receive-po-btn"
                        >
                          <CheckCircle size={13} /> {receiveMutation.isPending ? 'Receiving…' : 'Receive All Items'}
                        </button>
                      )}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
