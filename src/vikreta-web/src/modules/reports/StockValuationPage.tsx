import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer, Download, MapPin, Package, RefreshCw, Search, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { reportsApi, locationsApi } from '../../api/client';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);

function exportCsv(rows: any[], locationName: string) {
  const header = ['Product Name', 'SKU', 'Location', 'Qty On Hand', 'Unit Cost (INR)', 'Total Value (INR)'];
  const lines = rows.map((r: any) => [
    `"${(r.productName || '').replace(/"/g, '""')}"`,
    `"${(r.sku || '').replace(/"/g, '""')}"`,
    `"${(r.locationName || '').replace(/"/g, '""')}"`,
    r.quantityOnHand,
    r.unitCost.toFixed(2),
    r.totalValue.toFixed(2),
  ].join(','));

  const totalUnits = rows.reduce((s: number, r: any) => s + r.quantityOnHand, 0);
  const totalValue = rows.reduce((s: number, r: any) => s + r.totalValue, 0);
  const totalLine = `\n"Total","","",${totalUnits},"",${totalValue.toFixed(2)}`;

  const csvContent = [header.join(','), ...lines].join('\n') + totalLine;
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const locSlug = locationName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  a.download = `stock_valuation_${locSlug}_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success('Stock valuation exported to CSV');
}

export const StockValuationPage: React.FC = () => {
  const [locationId, setLocationId] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in-stock' | 'low' | 'out'>('all');

  const { data: locData } = useQuery({ queryKey: ['locations'], queryFn: () => locationsApi.list() });
  const locations: any[] = locData?.data ?? [];

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['report-stock-val', locationId],
    queryFn: () => reportsApi.stockValuation({ locationId: locationId || undefined }),
  });

  const rawRows: any[] = data?.data ?? [];

  // Filter by search text and status
  const rows = useMemo(() => {
    return rawRows.filter((r: any) => {
      const matchesSearch =
        !search.trim() ||
        (r.productName || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.sku || '').toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === 'out') return r.quantityOnHand === 0;
      if (statusFilter === 'low') return r.quantityOnHand > 0 && r.quantityOnHand <= 5;
      if (statusFilter === 'in-stock') return r.quantityOnHand > 5;
      return true;
    });
  }, [rawRows, search, statusFilter]);

  const totalValue = rawRows.reduce((s: number, r: any) => s + r.totalValue, 0);
  const totalUnits = rawRows.reduce((s: number, r: any) => s + r.quantityOnHand, 0);
  const zeroStock = rawRows.filter((r: any) => r.quantityOnHand === 0).length;
  const lowStock = rawRows.filter((r: any) => r.quantityOnHand > 0 && r.quantityOnHand <= 5).length;

  const activeLocationName = locationId ? (locations.find((l) => l.id === locationId)?.name ?? 'Selected Location') : 'All Locations';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 no-print">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stock Valuation</h1>
          <p className="text-xs text-ink-soft mt-0.5">Track current inventory holdings, quantities, unit costs, and total valuation</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              refetch();
              toast.success('Stock data refreshed');
            }}
            disabled={isFetching}
            className="btn-secondary flex items-center gap-1.5"
            title="Refresh Stock Data"
            id="stock-refresh-btn"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => exportCsv(rows, activeLocationName)}
            className="btn-secondary flex items-center gap-1.5"
            disabled={!rows.length || isLoading}
            id="stock-export-csv-btn"
          >
            <Download size={14} /> Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="btn-secondary flex items-center gap-1.5"
            id="stock-print-btn"
          >
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      {/* Print-only Header */}
      <div className="print-only print-header mb-4">
        <h2 className="text-2xl font-bold">Stock Valuation Report</h2>
        <p className="text-sm">Location: <strong>{activeLocationName}</strong></p>
        <p className="text-xs text-gray-500">Generated: {new Date().toLocaleString('en-IN')}</p>
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-4 mb-6 no-print bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Search Input */}
            <div className="relative min-w-[240px] flex-1 max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by product name or SKU…"
                className="input pl-8 py-1.5 text-sm"
                id="stock-search-input"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-ink-soft hover:text-ink"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Location selector */}
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-ink-soft" />
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="input py-1.5 px-2.5 text-sm w-auto"
                id="stock-location"
              >
                <option value="">All Locations</option>
                {locations.map((l: any) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Stock Level Filter Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 text-xs font-bold rounded-lg border-2 transition-all ${
                statusFilter === 'all'
                  ? 'bg-ink text-white border-ink'
                  : 'border-line text-ink hover:border-ink hover:bg-paper'
              }`}
            >
              All ({rawRows.length})
            </button>
            <button
              onClick={() => setStatusFilter('in-stock')}
              className={`px-3 py-1 text-xs font-bold rounded-lg border-2 transition-all ${
                statusFilter === 'in-stock'
                  ? 'bg-teal text-white border-teal'
                  : 'border-line text-teal-dark hover:border-teal hover:bg-teal-light/20'
              }`}
            >
              In Stock ({rawRows.filter((r) => r.quantityOnHand > 5).length})
            </button>
            <button
              onClick={() => setStatusFilter('low')}
              className={`px-3 py-1 text-xs font-bold rounded-lg border-2 transition-all ${
                statusFilter === 'low'
                  ? 'bg-marigold text-ink border-marigold'
                  : 'border-line text-marigold-dark hover:border-marigold hover:bg-amber-50'
              }`}
            >
              Low Stock ({lowStock})
            </button>
            <button
              onClick={() => setStatusFilter('out')}
              className={`px-3 py-1 text-xs font-bold rounded-lg border-2 transition-all ${
                statusFilter === 'out'
                  ? 'bg-cherry text-white border-cherry'
                  : 'border-line text-cherry hover:border-cherry hover:bg-rose-50'
              }`}
            >
              Out of Stock ({zeroStock})
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-5 text-center bg-white">
          <div className="inline-flex p-2 rounded-lg bg-teal-light text-teal-dark mb-2">
            <Package size={18} />
          </div>
          <p className="text-xs text-ink-soft font-medium mb-1">Total Valuation</p>
          <p className="font-mono text-2xl font-bold text-teal-dark">{fmt(totalValue)}</p>
          <p className="text-[11px] text-ink-soft mt-1">Cost basis value</p>
        </div>
        <div className="card p-5 text-center bg-white">
          <div className="inline-flex p-2 rounded-lg bg-blue-50 text-blue-700 mb-2">
            <CheckCircle size={18} />
          </div>
          <p className="text-xs text-ink-soft font-medium mb-1">Total Units on Hand</p>
          <p className="font-mono text-2xl font-bold text-ink">{totalUnits.toLocaleString()}</p>
          <p className="text-[11px] text-ink-soft mt-1">Across all items</p>
        </div>
        <div className="card p-5 text-center bg-white">
          <div className="inline-flex p-2 rounded-lg bg-amber-50 text-marigold-dark mb-2">
            <AlertTriangle size={18} />
          </div>
          <p className="text-xs text-ink-soft font-medium mb-1">Low Stock SKUs</p>
          <p className="font-mono text-2xl font-bold text-marigold-dark">{lowStock}</p>
          <p className="text-[11px] text-ink-soft mt-1">5 or fewer units</p>
        </div>
        <div className="card p-5 text-center bg-white">
          <div className="inline-flex p-2 rounded-lg bg-rose-50 text-cherry mb-2">
            <XCircle size={18} />
          </div>
          <p className="text-xs text-ink-soft font-medium mb-1">Out of Stock</p>
          <p className={`font-mono text-2xl font-bold ${zeroStock > 0 ? 'text-cherry' : 'text-teal-dark'}`}>
            {zeroStock}
          </p>
          <p className="text-[11px] text-ink-soft mt-1">0 units remaining</p>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="card bg-white">
        <div className="card-head flex items-center justify-between">
          <h3 className="text-sm font-bold">Inventory Breakdown</h3>
          <span className="text-xs text-ink-soft font-mono">
            Showing {rows.length} of {rawRows.length} items
          </span>
        </div>
        {rows.length === 0 && !isLoading ? (
          <div className="p-10 text-center text-ink-soft text-sm">
            {search || statusFilter !== 'all'
              ? 'No products match your current search and filters.'
              : 'No stock records found for this location.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Location</th>
                  <th className="text-right">Qty On Hand</th>
                  <th className="text-right">Unit Cost</th>
                  <th className="text-right">Total Value</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6} className="py-3 px-4">
                        <div className="h-4 bg-line rounded animate-pulse w-full" />
                      </td>
                    </tr>
                  ))
                ) : (
                  <>
                    {rows.map((r: any, idx: number) => {
                      const isZero = r.quantityOnHand === 0;
                      const isLow = r.quantityOnHand > 0 && r.quantityOnHand <= 5;
                      return (
                        <tr key={idx} className="hover:bg-paper-alt/40 transition-colors">
                          <td className="text-sm font-medium">{r.productName}</td>
                          <td className="font-mono text-xs text-ink-soft">{r.sku}</td>
                          <td className="text-sm">{r.locationName}</td>
                          <td className="text-right font-mono text-sm">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                                isZero
                                  ? 'bg-rose-100 text-cherry'
                                  : isLow
                                  ? 'bg-amber-100 text-marigold-dark'
                                  : 'bg-teal-light text-teal-dark'
                              }`}
                            >
                              {r.quantityOnHand}
                            </span>
                          </td>
                          <td className="text-right font-mono text-sm">{fmt(r.unitCost)}</td>
                          <td className="text-right font-mono text-sm font-bold text-teal-dark">{fmt(r.totalValue)}</td>
                        </tr>
                      );
                    })}
                    <tr className="border-t-2 border-ink font-bold bg-paper-alt/60">
                      <td colSpan={3} className="text-xs font-bold uppercase tracking-wider py-3">
                        Total ({rows.length} items)
                      </td>
                      <td className="text-right font-mono text-sm">
                        {rows.reduce((s: number, r: any) => s + r.quantityOnHand, 0).toLocaleString()}
                      </td>
                      <td className="text-right font-mono text-xs text-ink-soft">—</td>
                      <td className="text-right font-mono text-base font-bold text-teal-dark">
                        {fmt(rows.reduce((s: number, r: any) => s + r.totalValue, 0))}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
