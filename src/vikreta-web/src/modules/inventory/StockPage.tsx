import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { SlidersHorizontal, Printer, Zap, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { stockApi, purchaseOrdersApi } from '../../api/client';
import { useLocationStore } from '../../stores/locationStore';
import { DataTable, type Column } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';
import { BatchesManagementModal } from '../../components/BatchesManagementModal';
import { AdjustStockModal } from '../../components/AdjustStockModal';

export const StockPage: React.FC = () => {
  const { activeLocation } = useLocationStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [batchesModalOpen, setBatchesModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedAdjustItem, setSelectedAdjustItem] = useState<any | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['stock', activeLocation?.id],
    queryFn: () => stockApi.list(activeLocation?.id),
    enabled: !!activeLocation,
  });

  const { data: batchesData } = useQuery({
    queryKey: ['stock-batches-summary', activeLocation?.id],
    queryFn: () => stockApi.listBatches({ locationId: activeLocation?.id }),
    enabled: !!activeLocation,
  });

  const items = data?.data ?? [];
  const batches = batchesData?.data ?? [];
  const expiringCount = batches.filter((b: any) => b.isExpired || b.daysUntilExpiry <= 30).length;

  const lowStockItems = items.filter((s: any) => s.quantityOnHand <= s.reorderPoint);

  const autoPoMutation = useMutation({
    mutationFn: () => purchaseOrdersApi.generateFromLowStock({ locationId: activeLocation?.id }),
    onSuccess: (res) => {
      const { purchaseOrders, totalItemsOrdered } = res.data;
      if (!purchaseOrders || purchaseOrders.length === 0) {
        toast('No purchase orders needed; products have adequate stock or no suppliers assigned.', { icon: 'ℹ️' });
        return;
      }
      toast.success(`Generated ${purchaseOrders.length} PO(s) covering ${totalItemsOrdered} item(s)!`);
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      if (purchaseOrders.length === 1) {
        navigate(`/purchase-orders/${purchaseOrders[0].id}`);
      } else {
        navigate('/purchase-orders');
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to auto-generate PO.');
    },
  });

  const handleOneClickPo = () => {
    if (lowStockItems.length === 0) {
      toast.success('All stock items are currently at or above reorder points!');
      return;
    }
    if (
      window.confirm(
        `Auto-generate Purchase Orders for all ${lowStockItems.length} low-stock item(s) to their default suppliers?`
      )
    ) {
      autoPoMutation.mutate();
    }
  };

  // ── Stock Page Hotkeys ───────────────────────────────────────────────────
  useEffect(() => {
    const handleStockKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputFocused =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl instanceof HTMLSelectElement;

      if (isInputFocused) return;

      // Alt+O: 1-Click PO
      if (e.altKey && (e.key === 'o' || e.key === 'O')) {
        e.preventDefault();
        handleOneClickPo();
        return;
      }

      // Alt+B: Batches & Expiry
      if (e.altKey && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        setBatchesModalOpen((prev) => !prev);
        return;
      }

      // Alt+A: Adjust Stock
      if (e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        setSelectedAdjustItem(null);
        setAdjustModalOpen((prev) => !prev);
        return;
      }
    };

    window.addEventListener('keydown', handleStockKeyDown);
    return () => window.removeEventListener('keydown', handleStockKeyDown);
  }, [lowStockItems, autoPoMutation]);

  const columns: Column<any>[] = [
    {
      key: 'productName',
      header: 'Product',
      render: (s) => (
        <div>
          <p className="font-medium text-sm">{s.productName}</p>
          <p className="font-mono text-[11px] text-ink-soft">{s.productSku}</p>
        </div>
      ),
    },
    { key: 'locationName', header: 'Location', render: s => <span className="text-sm">{s.locationName}</span> },
    {
      key: 'quantityOnHand',
      header: 'On Hand',
      render: (s) => (
        <span className={`font-mono text-sm font-bold ${s.quantityOnHand <= 0 ? 'text-cherry' : s.quantityOnHand <= s.reorderPoint ? 'text-marigold-dark' : 'text-teal-dark'}`}>
          {s.quantityOnHand}
        </span>
      ),
    },
    { key: 'reorderPoint', header: 'Reorder At', render: s => <span className="font-mono text-xs text-ink-soft">{s.reorderPoint}</span> },
    { key: 'stockStatus', header: 'Status', render: s => <StatusBadge status={s.stockStatus} /> },
    {
      key: 'actions',
      header: 'Action',
      className: 'text-right no-print w-24',
      render: (s) => (
        <button
          onClick={() => {
            setSelectedAdjustItem(s);
            setAdjustModalOpen(true);
          }}
          className="btn-secondary text-xs py-1 px-2.5 inline-flex items-center gap-1 hover:border-teal hover:text-teal-dark font-medium"
          title="Adjust Stock or Set Reorder Threshold"
        >
          <SlidersHorizontal size={12} /> Adjust
        </button>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">Stock Levels</h1>
            {lowStockItems.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-cherry-light text-cherry font-bold border border-cherry/30">
                {lowStockItems.length} Low Stock
              </span>
            )}
          </div>
          <p className="text-sm text-ink-soft mt-0.5">{activeLocation?.name}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* One-Click PO Button */}
          <button
            onClick={handleOneClickPo}
            disabled={autoPoMutation.isPending}
            className="btn-primary no-print bg-marigold hover:bg-marigold-dark text-ink border-ink flex items-center gap-1.5 shadow-sm"
            id="one-click-po-btn"
            title="Auto-generate Purchase Orders for all items below reorder point [Alt+O]"
          >
            <Zap size={14} className="fill-ink" />
            <span>
              {autoPoMutation.isPending
                ? 'Generating PO…'
                : `1-Click PO (${lowStockItems.length} Low)`}
            </span>
            <kbd className="text-[10px] font-mono font-bold bg-ink/10 px-1 py-0.5 rounded border border-ink/20 ml-0.5">
              Alt+O
            </kbd>
          </button>

          {/* Batches & Expiry Date Management */}
          <button
            onClick={() => setBatchesModalOpen(true)}
            className="btn-secondary no-print flex items-center gap-1.5 relative"
            id="batches-expiry-btn"
            title="Manage FMCG batch numbers and track expiry dates [Alt+B]"
          >
            <Clock size={14} className="text-teal-dark" />
            <span>Batches & Expiry</span>
            <kbd className="text-[10px] font-mono font-bold bg-paper-alt px-1 py-0.5 rounded border border-line ml-0.5 text-ink-soft">
              Alt+B
            </kbd>
            {expiringCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-cherry text-white text-[10px] font-bold">
                {expiringCount}
              </span>
            )}
          </button>

          <button
            onClick={() => window.print()}
            className="btn-secondary no-print"
            id="print-stock-btn"
          >
            <Printer size={14} /> Print
          </button>
          <button
            onClick={() => {
              setSelectedAdjustItem(null);
              setAdjustModalOpen(true);
            }}
            className="btn-secondary no-print flex items-center gap-1.5"
            id="adjust-stock-btn"
            title="Adjust stock and set reorder point [Alt+A]"
          >
            <SlidersHorizontal size={14} />
            <span>Adjust</span>
            <kbd className="text-[10px] font-mono font-bold bg-paper-alt px-1 py-0.5 rounded border border-line ml-0.5 text-ink-soft">
              Alt+A
            </kbd>
          </button>
          <button onClick={() => navigate('/inventory/transfers/new')} className="btn-secondary no-print" id="new-transfer-btn">
            New Transfer
          </button>
        </div>
      </div>

      {/* Low stock alert banner */}
      {lowStockItems.length > 0 && (
        <div className="mb-4 p-3.5 bg-amber-50 border-2 border-amber-300 rounded-xl flex items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-200 text-amber-900 flex items-center justify-center flex-shrink-0 font-bold">
              !
            </div>
            <div>
              <p className="text-xs font-bold text-amber-950">
                {lowStockItems.length} item(s) are at or below reorder threshold
              </p>
              <p className="text-[11px] text-amber-800">
                Generate purchase orders in one click to restock from your registered default suppliers.
              </p>
            </div>
          </div>
          <button
            onClick={handleOneClickPo}
            disabled={autoPoMutation.isPending}
            className="btn-primary text-xs py-1.5 px-3 bg-amber-600 hover:bg-amber-700 border-amber-800 text-white flex-shrink-0"
          >
            Generate PO Now
          </button>
        </div>
      )}

      {/* Print-only report header */}
      <div className="print-header print-only">
        <p className="text-lg font-bold">{activeLocation?.name ?? 'Store'}</p>
        <p className="text-base">Stock Level Report</p>
        <p className="text-sm text-gray-500">Generated: {new Date().toLocaleString()}</p>
        <hr className="my-2" />
      </div>

      <div className="card print-stock">
        <DataTable
          columns={columns}
          data={items}
          keyField="id"
          loading={isLoading}
          emptyMessage="No stock records. Add products and set opening stock."
        />
      </div>

      {batchesModalOpen && (
        <BatchesManagementModal onClose={() => setBatchesModalOpen(false)} />
      )}

      {adjustModalOpen && (
        <AdjustStockModal
          initialItem={selectedAdjustItem}
          onClose={() => {
            setAdjustModalOpen(false);
            setSelectedAdjustItem(null);
          }}
        />
      )}
    </div>
  );
};
