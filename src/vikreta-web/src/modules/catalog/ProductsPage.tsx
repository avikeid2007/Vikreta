import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Barcode, X } from 'lucide-react';
import { productsApi, categoriesApi } from '../../api/client';
import { DataTable, type Column } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';
import { BarcodeGeneratorModal } from '../../components/BarcodeGeneratorModal';

const fmt = (n: number) => `₹${n.toFixed(2)}`;

export const ProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [page, setPage] = useState(1);
  const [barcodeProduct, setBarcodeProduct] = useState<any | null>(null);

  // Auto-search: update debounced search parameter as user types
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
  });

  const categories = categoriesData?.data ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ['products', search, categoryId, page],
    queryFn: () =>
      productsApi.list({
        search: search || undefined,
        categoryId: categoryId || undefined,
        page,
        pageSize: 25,
      }),
  });

  const items = data?.data?.items ?? [];
  const total = data?.data?.totalCount ?? 0;

  const handleClearSearch = () => {
    setSearchInput('');
    setSearch('');
    setPage(1);
  };

  const handleClearAllFilters = () => {
    setSearchInput('');
    setSearch('');
    setCategoryId('');
    setPage(1);
  };

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

  const hasActiveFilters = Boolean(search || categoryId);
  const selectedCategoryObj = categories.find((c: any) => c.id.toLowerCase() === categoryId.toLowerCase());

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

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-stretch sm:items-center">
        {/* Auto Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Auto search by name, SKU, or barcode…"
            className="input-soft pl-9 pr-8 w-full"
            id="product-search"
            autoComplete="off"
          />
          {searchInput && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink p-0.5 rounded cursor-pointer transition-colors"
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Category Dropdown Filter */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setPage(1);
              }}
              className="input-soft text-xs py-2 pr-8 pl-3 cursor-pointer min-w-[190px] font-medium"
              id="product-category-filter"
            >
              <option value="">All Categories ({categories.length})</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleClearAllFilters}
              className="btn-ghost text-xs px-2 py-1.5 gap-1 text-ink-soft hover:text-ink border border-line"
              title="Reset all filters"
            >
              <X size={13} />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Filter Summary */}
      {hasActiveFilters && (
        <div className="mb-3 flex items-center justify-between bg-paper-alt px-3 py-1.5 rounded-lg border border-line text-xs text-ink-soft">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span>
              Showing <strong className="text-ink">{items.length}</strong> of <strong className="text-ink">{total}</strong> product{total === 1 ? '' : 's'}
            </span>
            {search && (
              <span className="inline-flex items-center gap-1 bg-paper px-2 py-0.5 rounded border border-line text-ink font-medium">
                Keyword: &quot;{search}&quot;
                <button onClick={handleClearSearch} className="hover:text-red-500 ml-0.5">
                  <X size={11} />
                </button>
              </span>
            )}
            {selectedCategoryObj && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-medium"
                style={{
                  backgroundColor: (selectedCategoryObj.colorHex ?? '#1D7874') + '22',
                  color: selectedCategoryObj.colorHex ?? '#1D7874',
                }}
              >
                Category: {selectedCategoryObj.name}
                <button onClick={() => setCategoryId('')} className="hover:opacity-75 ml-0.5">
                  <X size={11} />
                </button>
              </span>
            )}
          </div>
          <button
            onClick={handleClearAllFilters}
            className="text-copper hover:underline font-medium text-xs ml-2 flex-shrink-0"
          >
            Clear all
          </button>
        </div>
      )}

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
          emptyMessage={
            hasActiveFilters
              ? `No products found matching your filters. Try adjusting your search or category.`
              : 'No products found. Create your first product.'
          }
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
