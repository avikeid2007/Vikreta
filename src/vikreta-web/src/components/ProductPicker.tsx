import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X, Package, Layers } from 'lucide-react';
import { productsApi } from '../api/client';

export interface ProductPickerProps {
  onSelect: (product: any, variant?: any) => void;
  onClose?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export const ProductPicker: React.FC<ProductPickerProps> = ({
  onSelect,
  onClose,
  placeholder = 'Search by name, SKU or barcode…',
  autoFocus = true,
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  const { data, isLoading } = useQuery({
    queryKey: ['products', 'picker', query],
    queryFn: () => productsApi.list({ search: query, pageSize: 30 }),
    staleTime: 10_000,
  });

  const products = data?.data?.items ?? [];

  const handleProductClick = (product: any) => {
    if (product.variants && product.variants.length > 0) {
      setSelectedProduct(product);
    } else {
      onSelect(product);
      if (onClose) onClose();
    }
  };

  const handleVariantClick = (product: any, variant: any) => {
    onSelect(product, variant);
    setSelectedProduct(null);
    if (onClose) onClose();
  };

  return (
    <div className={`flex flex-col bg-white border-2 border-ink rounded-xl shadow-[4px_4px_0px_#241F1C] overflow-hidden ${className}`}>
      {/* Header & Search */}
      <div className="p-3 bg-paper border-b-2 border-ink flex items-center gap-2">
        <Search size={16} className="text-ink-soft shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedProduct(null);
          }}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm font-medium focus:outline-none placeholder:text-ink-soft/60"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setSelectedProduct(null);
              inputRef.current?.focus();
            }}
            className="text-ink-soft hover:text-ink p-1"
          >
            <X size={14} />
          </button>
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="border-l-2 border-line pl-2 ml-1 text-ink-soft hover:text-ink"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Body / List */}
      <div className="max-h-72 overflow-y-auto divide-y divide-line">
        {isLoading ? (
          <div className="p-6 text-center text-xs text-ink-soft font-mono">Searching catalog…</div>
        ) : products.length === 0 ? (
          <div className="p-6 text-center text-xs text-ink-soft">
            No products found matching &ldquo;{query}&rdquo;
          </div>
        ) : selectedProduct ? (
          /* Variant Selector Sub-view */
          <div className="p-3 bg-paper/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-ink">
                Select Variant for &ldquo;{selectedProduct.name}&rdquo;:
              </span>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="text-xs text-teal-dark font-medium hover:underline"
              >
                Back to products
              </button>
            </div>
            <div className="space-y-1.5">
              {selectedProduct.variants.map((v: any) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => handleVariantClick(selectedProduct, v)}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg border-2 border-line bg-white hover:border-teal hover:bg-paper-alt text-left transition-colors"
                >
                  <div>
                    <div className="text-xs font-bold text-ink">{v.attributeSummary || v.variantSku}</div>
                    <div className="text-[10px] text-ink-soft font-mono">SKU: {v.variantSku}</div>
                  </div>
                  <div className="text-xs font-mono font-bold text-teal-dark">
                    ₹{(v.priceOverride ?? selectedProduct.defaultPrice).toFixed(2)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Product List View */
          products.map((p: any) => {
            const hasVariants = p.variants && p.variants.length > 0;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleProductClick(p)}
                className="w-full flex items-center justify-between p-3 hover:bg-paper/70 text-left transition-colors group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-paper-alt border border-line flex items-center justify-center shrink-0 text-ink-soft group-hover:text-ink group-hover:border-ink transition-colors">
                    {hasVariants ? <Layers size={14} /> : <Package size={14} />}
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-bold text-ink truncate">{p.name}</div>
                    <div className="text-[10px] text-ink-soft font-mono truncate">
                      SKU: {p.sku} {p.categoryName && `· ${p.categoryName}`}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 ml-3">
                  <div className="text-xs font-mono font-bold text-ink group-hover:text-teal-dark transition-colors">
                    ₹{p.defaultPrice.toFixed(2)}
                  </div>
                  {hasVariants ? (
                    <span className="inline-block text-[10px] text-teal-dark font-semibold">
                      {p.variants.length} variants →
                    </span>
                  ) : (
                    <span className="text-[10px] text-ink-soft">/{p.unitOfMeasure || 'unit'}</span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
