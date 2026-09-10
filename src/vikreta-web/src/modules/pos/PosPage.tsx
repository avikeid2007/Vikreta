import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { X, Printer } from 'lucide-react';
import { productsApi, invoicesApi } from '../../api/client';
import { useCartStore } from '../../stores/cartStore';
import { useLocationStore } from '../../stores/locationStore';
import { QuantityStepper } from '../../components/FormControls';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);

type PaymentMethod = 'Cash' | 'Card' | 'Other';

export const PosPage: React.FC = () => {
  const { activeLocation } = useLocationStore();
  const cart = useCartStore();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [charged, setCharged] = useState(false);
  const scanRef = useRef<HTMLInputElement>(null);

  // Focus scan box when typing
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key.length === 1) scanRef.current?.focus();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const { data: productsData } = useQuery({
    queryKey: ['products', 'pos'],
    queryFn: () => productsApi.list({ pageSize: 200 }),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => import('../../api/client').then(m => m.categoriesApi.list()),
  });

  const products = productsData?.data?.items ?? [];
  const categories = categoriesData?.data ?? [];

  const filtered = products.filter((p: any) => {
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = !activeCategory || p.categoryId === activeCategory;
    return matchesSearch && matchesCat;
  });

  const addToCart = (product: any) => {
    cart.addItem({
      productId: product.id,
      variantId: null,
      productName: product.name,
      variantAttribute: null,
      categoryColor: product.categoryColorHex ?? '#1D7874',
      categoryName: product.categoryName ?? '',
      unitPrice: product.defaultPrice,
      taxRate: product.taxRate,
    });
    toast.success(`${product.name} added`, { duration: 1000 });
  };

  const chargeMutation = useMutation({
    mutationFn: () =>
      invoicesApi.create({
        locationId: activeLocation?.id,
        customerId: cart.customerId,
        notes: '',
        lines: cart.lines.map(l => ({
          productId: l.productId,
          variantId: l.variantId,
          quantity: l.quantity,
          unitPriceOverride: l.unitPrice,
          lineDiscount: l.lineDiscount,
        })),
      }).then(res =>
        invoicesApi.addPayment(res.data.id, {
          amount: cart.grandTotal(),
          method: paymentMethod,
          referenceNumber: '',
        })
      ),
    onSuccess: () => {
      toast.success('Sale complete!');
      cart.clear();
      setCharged(true);
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setTimeout(() => setCharged(false), 3000);
    },
    onError: () => toast.error('Failed to process sale.'),
  });

  return (
    <div className="flex h-[calc(100vh-57px)] bg-paper-alt overflow-hidden">
      {/* ── Left: Product picker ──────────────────────────────────── */}
      <div className="flex flex-col flex-1 p-5 overflow-hidden min-w-0">
        {/* Scan / search */}
        <div className="mb-3">
          <input
            ref={scanRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="▤  Scan barcode or search products…"
            className="input w-full"
            id="pos-search"
          />
        </div>

        {/* Category filter */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveCategory(null)}
            className={`cat-pill flex-shrink-0 ${!activeCategory
              ? 'bg-ink text-white border-ink'
              : 'bg-white text-ink border-ink hover:bg-paper-alt'}`}
          >
            All
          </button>
          {categories.map((cat: any) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
              className={`cat-pill flex-shrink-0 border-2 transition-all`}
              style={{
                borderColor: cat.colorHex,
                color: activeCategory === cat.id ? 'white' : cat.colorHex,
                backgroundColor: activeCategory === cat.id ? cat.colorHex : 'white',
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product grid */}
        <div className="flex-1 grid grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto content-start">
          {filtered.map((product: any) => (
            <button
              key={product.id}
              onClick={() => addToCart(product)}
              className="bg-white border-2 border-ink rounded-xl p-3.5 text-left
                         cursor-pointer hover:shadow-card hover:-translate-y-0.5 transition-all
                         min-h-[96px] flex flex-col justify-between relative overflow-hidden"
              id={`product-${product.id}`}
            >
              {/* Left accent strip */}
              <div
                className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl"
                style={{ backgroundColor: product.categoryColorHex ?? '#1D7874' }}
              />
              <p className="text-[13px] font-medium leading-tight pl-2.5 line-clamp-2">{product.name}</p>
              <p
                className="font-mono text-sm font-bold mt-2 pl-2.5"
                style={{ color: product.categoryColorHex ?? '#1D7874' }}
              >
                {fmt(product.defaultPrice)}
              </p>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-4 text-center text-ink-soft text-sm py-12">
              No products found.
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Receipt / Cart ─────────────────────────────────── */}
      <div className="bg-ink flex items-stretch p-4 flex-shrink-0 w-80 xl:w-[340px]">
        <div className="bg-[#FFFDF7] w-full flex flex-col shadow-receipt overflow-hidden printable-area">
          {/* Serrated top edge */}
          <div className="receipt-edge-top flex-shrink-0" />

          {/* Receipt body */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <p className="text-center font-mono text-[11px] tracking-widest text-ink-soft uppercase mb-1">
              {activeLocation?.name ?? 'Store'} — Register 1
            </p>
            <p className="text-center font-bold text-base text-cherry mb-4">Current Sale</p>

            {charged && (
              <div className="p-2 mb-3 bg-teal text-white text-xs font-bold text-center rounded-lg animate-pulse">
                ✓ Sale completed successfully!
              </div>
            )}

            {/* Customer line */}
            <div className="flex justify-between items-center text-xs text-ink-soft mb-4">
              <span>{cart.customerName ?? 'Walk-in customer'}</span>
              <button className="text-teal-dark font-bold">+ Add customer</button>
            </div>

            <div className="border-t-2 border-dashed border-line my-3" />

            {/* Cart lines */}
            {cart.lines.length === 0 ? (
              <p className="text-center text-ink-soft text-xs py-6">Cart is empty</p>
            ) : (
              cart.lines.map((line) => (
                <div key={`${line.productId}-${line.variantId}`} className="flex justify-between items-start mb-3 group">
                  <div className="flex-1 min-w-0 mr-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: line.categoryColor }}
                      />
                      <span className="text-sm font-medium truncate">{line.productName}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 ml-3.5">
                      <QuantityStepper
                        value={line.quantity}
                        onChange={(q) => cart.updateQuantity(line.productId, line.variantId, q)}
                        min={1}
                      />
                      <span className="font-mono text-[11px] text-ink-soft">
                        × {fmt(line.unitPrice)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-1">
                    <span className="font-mono text-sm font-medium">
                      {fmt(line.unitPrice * line.quantity - line.lineDiscount)}
                    </span>
                    <button
                      onClick={() => cart.removeItem(line.productId, line.variantId)}
                      className="text-ink-soft hover:text-cherry transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}

            <div className="border-t-2 border-dashed border-line my-3" />

            {/* Totals */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-ink-soft">
                <span>Subtotal</span>
                <span className="font-mono">{fmt(cart.subtotal())}</span>
              </div>
              <div className="flex justify-between text-ink-soft">
                <span>Tax</span>
                <span className="font-mono">{fmt(cart.taxTotal())}</span>
              </div>
              <div className="flex justify-between font-bold text-xl pt-2">
                <span>Total</span>
                <span className="font-mono text-teal-dark">{fmt(cart.grandTotal())}</span>
              </div>
            </div>
          </div>

          {/* Serrated bottom edge */}
          <div className="receipt-edge-bottom flex-shrink-0" />

          {/* Payment footer */}
          <div className="px-5 pb-5 pt-2 bg-[#FFFDF7] border-t-2 border-dashed border-line">
            <div className="grid grid-cols-3 gap-2 mb-3">
              {(['Cash', 'Card', 'Other'] as PaymentMethod[]).map((method) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`py-2.5 text-xs font-bold rounded-lg border-2 transition-all
                    ${paymentMethod === method
                      ? 'bg-teal text-white border-teal'
                      : 'bg-white text-ink border-ink hover:bg-paper-alt'}`}
                >
                  {method}
                </button>
              ))}
            </div>

            <button
              onClick={() => chargeMutation.mutate()}
              disabled={cart.lines.length === 0 || chargeMutation.isPending || !activeLocation}
              className="w-full bg-marigold border-2 border-ink rounded-lg py-4
                         font-mono text-base font-bold text-ink
                         hover:bg-marigold-dark transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
              id="charge-btn"
            >
              {chargeMutation.isPending ? 'Processing…' : `Charge ${fmt(cart.grandTotal())}`}
            </button>

            {cart.lines.length > 0 && (
              <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="text-xs font-bold text-ink-soft hover:text-ink flex items-center gap-1.5 transition-colors"
                >
                  <Printer size={13} /> Print
                </button>
                <button
                  onClick={() => { cart.clear(); toast.success('Sale voided.'); }}
                  className="text-xs font-bold text-cherry hover:underline"
                >
                  Void sale
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
