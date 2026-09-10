import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Barcode } from 'lucide-react';
import { productsApi } from '../../api/client';
import { DataTable, type Column } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';
import { BarcodeGeneratorModal } from '../../components/BarcodeGeneratorModal';

const fmt = (n: number) => `₹${n.toFixed(2)}`;

export const ProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [barcodeProduct, setBarcodeProduct] = useState<any | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['products', search, page],
    queryFn: () => productsApi.list({ search, page, pageSize: 25 }),
  });

  const items = data?.data?.items ?? [];
  const total = data?.data?.totalCount ?? 0;

  const columns: Column<any>[] = [
    {
      key: 'sku',
      header: 'SKU',
      render: (p) => <span className="font-mono text-xs">{p.sku}</span>,
    },
    {
      key: 'name',
      header: 'Product',
      render: (p) => (
        <p className="font-medium text-sm">{p.name}</p>
      ),
    },
    {
      key: 'categoryName',
      header: 'Category',
      render: (p) =>
        p.categoryName ? (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded"
            style={{ backgroundColor: (p.categoryColorHex ?? '#1D7874') + '22', color: p.categoryColorHex ?? '#1D7874' }}
          >
            {p.categoryName}
          </span>
        ) : (
          <span className="text-ink-soft text-xs">–</span>
        ),
    },
    {
      key: 'defaultPrice',
      header: 'Price',
      render: (p) => <span className="font-mono text-sm">{fmt(p.defaultPrice)}</span>,
    },
    {
      key: 'defaultCost',
      header: 'Cost',
      render: (p) => <span className="font-mono text-sm text-ink-soft">{fmt(p.defaultCost)}</span>,
    },
    {
      key: 'taxRate',
      header: 'Tax',
      render: (p) => <span className="font-mono text-xs">{(p.taxRate * 100).toFixed(0)}%</span>,
    },
    {
      key: 'tracksInventory',
      header: 'Inventory',
      render: (p) => (
        <span className={`badge ${p.tracksInventory ? 'badge-paid' : 'badge-draft'}`}>
          {p.tracksInventory ? 'TRACKED' : 'UNTRACKED'}
        </span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (p) => <StatusBadge status={p.isActive ? 'paid' : 'void'} />,
    },
    {
      key: 'actions',
      header: 'Labels',
      render: (p) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setBarcodeProduct(p);
          }}
          className="btn-ghost text-xs py-1 px-2 gap-1"
          title="Generate & Print Barcodes"
        >
          <Barcode size={14} />
          <span>Barcodes</span>
        </button>
      ),
    },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold">Products</h1>
          <p className="text-sm text-ink-soft mt-0.5">Manage your product catalog</p>
        </div>
        <button onClick={() => navigate('/products/new')} className="btn-primary" id="new-product-btn">
          <Plus size={14} />
          New Product
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, SKU, or barcode…"
            className="input-soft pl-9"
            id="product-search"
          />
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <DataTable
          columns={columns}
          data={items}
          keyField="id"
          loading={isLoading}
          onRowClick={(p) => navigate(`/products/${p.id}`)}
          totalCount={total}
          page={page}
          pageSize={25}
          onPageChange={setPage}
          emptyMessage="No products found. Create your first product."
        />
      </div>

      {barcodeProduct && (
        <BarcodeGeneratorModal
          product={barcodeProduct}
          onClose={() => setBarcodeProduct(null)}
        />
      )}
    </div>
  );
};
