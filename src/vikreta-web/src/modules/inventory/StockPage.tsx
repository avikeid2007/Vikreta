import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Download, SlidersHorizontal } from 'lucide-react';
import { stockApi } from '../../api/client';
import { useLocationStore } from '../../stores/locationStore';
import { DataTable, type Column } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';

export const StockPage: React.FC = () => {
  const { activeLocation } = useLocationStore();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['stock', activeLocation?.id],
    queryFn: () => stockApi.list(activeLocation?.id),
    enabled: !!activeLocation,
  });

  const items = data?.data ?? [];

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
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold">Stock Levels</h1>
          <p className="text-sm text-ink-soft mt-0.5">{activeLocation?.name}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/inventory/adjust')} className="btn-secondary" id="adjust-stock-btn">
            <SlidersHorizontal size={14} /> Adjust
          </button>
          <button onClick={() => navigate('/inventory/transfers/new')} className="btn-primary" id="new-transfer-btn">
            New Transfer
          </button>
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={items}
          keyField="id"
          loading={isLoading}
          emptyMessage="No stock records. Add products and set opening stock."
        />
      </div>
    </div>
  );
};
