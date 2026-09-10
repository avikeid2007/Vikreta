import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { X, Printer, UserPlus, Search, UserCheck, GripVertical, QrCode } from 'lucide-react';
import { productsApi, invoicesApi, customersApi } from '../../api/client';
import { useCartStore } from '../../stores/cartStore';
import { useLocationStore } from '../../stores/locationStore';
import { QuantityStepper } from '../../components/FormControls';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);

type PaymentMethod = 'Cash' | 'UPI' | 'Card' | 'Other';
type CustomerModalTab = 'find' | 'new';

const DEFAULT_INVOICE_WIDTH = 360;
const MIN_INVOICE_WIDTH = 280;

// ── Customer Modal ────────────────────────────────────────────────────────────

interface CustomerModalProps {
  onClose: () => void;
  onSelect: (id: string, name: string) => void;
}

const CustomerModal: React.FC<CustomerModalProps> = ({ onClose, onSelect }) => {
  const [tab, setTab] = useState<CustomerModalTab>('find');
  const [search, setSearch] = useState('');

  // Find existing customer
  const { data: searchData, isFetching } = useQuery({
    queryKey: ['customers', 'search', search],
    queryFn: () => customersApi.list({ search, pageSize: 20 }),
    enabled: tab === 'find',
  });
  const customers: any[] = searchData?.data?.items ?? searchData?.data ?? [];

  // New customer form
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' });
  const createMutation = useMutation({
    mutationFn: () => customersApi.create({ name: form.name, phone: form.phone, email: form.email, address: form.address }),
    onSuccess: (res) => {
      const c = res.data;
      toast.success(`Customer "${c.name}" created!`);
      onSelect(c.id, c.name);
    },
    onError: () => toast.error('Failed to create customer.'),
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white border-2 border-ink rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b-2 border-ink bg-paper-alt">
          <div className="flex items-center gap-2">
            <UserPlus size={18} className="text-teal-dark" />
            <span className="font-bold text-base">Add Customer</span>
          </div>
          <button onClick={onClose} className="text-ink-soft hover:text-ink transition-colors" id="customer-modal-close">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b-2 border-ink">
          <button
            onClick={() => setTab('find')}
            className={`flex-1 py-2.5 text-sm font-bold transition-colors ${
              tab === 'find' ? 'bg-ink text-white' : 'bg-white text-ink hover:bg-paper-alt'
            }`}
            id="customer-tab-find"
          >
            Find Existing
          </button>
          <button
            onClick={() => setTab('new')}
            className={`flex-1 py-2.5 text-sm font-bold transition-colors border-l-2 border-ink ${
              tab === 'new' ? 'bg-ink text-white' : 'bg-white text-ink hover:bg-paper-alt'
            }`}
            id="customer-tab-new"
          >
            New Customer
          </button>
        </div>

        {/* Tab content */}
        <div className="p-5">
          {tab === 'find' ? (
            <div>
              {/* Search input */}
              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, phone, email, address…"
                  className="input pl-9"
                  autoFocus
                  id="customer-search-input"
                />
              </div>

              {/* Results */}
              <div className="max-h-64 overflow-y-auto space-y-1">
                {isFetching && (
                  <p className="text-center text-ink-soft text-xs py-4">Searching…</p>
                )}
                {!isFetching && customers.length === 0 && search && (
                  <p className="text-center text-ink-soft text-xs py-4">No customers found.</p>
                )}
                {!isFetching && customers.length === 0 && !search && (
                  <p className="text-center text-ink-soft text-xs py-4">Type to search customers.</p>
                )}
                {customers.map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => onSelect(c.id, c.name)}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-teal-light border border-line transition-colors group"
                    id={`customer-result-${c.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold group-hover:text-teal-dark">{c.name}</p>
                        <p className="text-xs text-ink-soft">{c.phone ?? c.email ?? 'No contact info'}</p>
                      </div>
                      {c.creditBalance != null && (
                        <span className="font-mono text-xs text-ink-soft">{fmt(c.creditBalance)}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1">Full Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="input"
                  placeholder="e.g. Priya Sharma"
                  id="new-customer-name"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Phone Number</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="input"
                  placeholder="e.g. +91 98765 43210"
                  id="new-customer-phone"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="input"
                  placeholder="e.g. priya@example.com"
                  id="new-customer-email"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Address</label>
                <input
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  className="input"
                  placeholder="Street, City"
                  id="new-customer-address"
                />
              </div>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!form.name.trim() || createMutation.isPending}
                className="btn-teal w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                id="new-customer-submit"
              >
                {createMutation.isPending ? 'Saving…' : 'Create & Select Customer'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── POS Page ─────────────────────────────────────────────────────────────────

export const PosPage: React.FC = () => {
  const { activeLocation } = useLocationStore();
  const cart = useCartStore();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [upiRef, setUpiRef] = useState('');
  const [charged, setCharged] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const scanRef = useRef<HTMLInputElement>(null);

  // Readjustable panels state
  const [invoiceWidth, setInvoiceWidth] = useState<number>(() => {
    const saved = localStorage.getItem('pos_invoice_panel_width');
    const parsed = saved ? parseInt(saved, 10) : DEFAULT_INVOICE_WIDTH;
    return isNaN(parsed) ? DEFAULT_INVOICE_WIDTH : Math.max(MIN_INVOICE_WIDTH, Math.min(parsed, 750));
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(DEFAULT_INVOICE_WIDTH);

  const startDrag = useCallback((clientX: number) => {
    setIsDragging(true);
    dragStartXRef.current = clientX;
    startWidthRef.current = invoiceWidth;
  }, [invoiceWidth]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    startDrag(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      startDrag(e.touches[0].clientX);
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => {
      const deltaX = dragStartXRef.current - e.clientX;
      const maxAllowed = Math.min(window.innerWidth * 0.65, 750);
      const newWidth = Math.max(MIN_INVOICE_WIDTH, Math.min(startWidthRef.current + deltaX, maxAllowed));
      setInvoiceWidth(newWidth);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const deltaX = dragStartXRef.current - e.touches[0].clientX;
        const maxAllowed = Math.min(window.innerWidth * 0.65, 750);
        const newWidth = Math.max(MIN_INVOICE_WIDTH, Math.min(startWidthRef.current + deltaX, maxAllowed));
        setInvoiceWidth(newWidth);
      }
    };

    const onStop = () => {
      setIsDragging(false);
      localStorage.setItem('pos_invoice_panel_width', String(invoiceWidth));
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onStop);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onStop);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onStop);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onStop);
    };
  }, [isDragging, invoiceWidth]);

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

  const handleSelectCustomer = (id: string, name: string) => {
    cart.setCustomer(id, name);
    setShowCustomerModal(false);
    toast.success(`Customer set: ${name}`);
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
          referenceNumber: paymentMethod === 'UPI' ? upiRef : '',
        })
      ),
    onSuccess: () => {
      toast.success('Sale complete!');
      cart.clear();
      setUpiRef('');
      setCharged(true);
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setTimeout(() => setCharged(false), 3000);
    },
    onError: () => toast.error('Failed to process sale.'),
  });

  return (
    <>
      {showCustomerModal && (
        <CustomerModal
          onClose={() => setShowCustomerModal(false)}
          onSelect={handleSelectCustomer}
        />
      )}

      <div className={`flex h-[calc(100vh-57px)] bg-paper-alt overflow-hidden ${isDragging ? 'select-none' : ''}`}>
        {/* ── Left: Product picker (Item Selection Side) ─────────────── */}
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
                className="cat-pill flex-shrink-0 border-2 transition-all"
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
          <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 overflow-y-auto content-start pr-1">
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
              <div className="col-span-full text-center text-ink-soft text-sm py-12">
                No products found.
              </div>
            )}
          </div>
        </div>

        {/* ── Readjustable Splitter Handle ───────────────────────────── */}
        <div
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onDoubleClick={() => {
            setInvoiceWidth(DEFAULT_INVOICE_WIDTH);
            localStorage.setItem('pos_invoice_panel_width', String(DEFAULT_INVOICE_WIDTH));
            toast.success('Reset panel size', { duration: 1000 });
          }}
          className={`w-3.5 relative flex items-center justify-center cursor-col-resize group flex-shrink-0 transition-colors z-10 ${
            isDragging ? 'bg-teal' : 'bg-line hover:bg-teal/40'
          }`}
          title="Drag to readjust panels • Double-click to reset"
          id="pos-panel-resizer"
        >
          <div className={`w-1.5 h-10 rounded-full flex items-center justify-center transition-all ${
            isDragging ? 'bg-white' : 'bg-ink-soft/40 group-hover:bg-teal-dark group-hover:scale-110'
          }`}>
            <GripVertical size={10} className={isDragging ? 'text-teal-dark' : 'text-ink-soft group-hover:text-white'} />
          </div>
        </div>

        {/* ── Right: Receipt / Bill Invoice Side ─────────────────────── */}
        <div
          className="bg-ink flex items-stretch p-3 flex-shrink-0"
          style={{ width: `${invoiceWidth}px` }}
        >
          <div className="bg-[#FFFDF7] w-full flex flex-col shadow-receipt overflow-hidden printable-area rounded-sm">
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
                {cart.customerId ? (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <UserCheck size={12} className="text-teal-dark flex-shrink-0" />
                    <span className="font-semibold text-teal-dark truncate">{cart.customerName}</span>
                    <button
                      onClick={() => cart.setCustomer(null, null)}
                      className="text-ink-soft hover:text-cherry transition-colors flex-shrink-0"
                      title="Remove customer"
                      id="clear-customer-btn"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ) : (
                  <span>Walk-in customer</span>
                )}
                <button
                  className="text-teal-dark font-bold hover:text-teal transition-colors flex-shrink-0 ml-2"
                  onClick={() => setShowCustomerModal(true)}
                  id="add-customer-btn"
                >
                  {cart.customerId ? 'Change' : '+ Add customer'}
                </button>
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
                        title="Remove item"
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
              {/* Payment Methods including UPI */}
              <div className="grid grid-cols-4 gap-1.5 mb-3">
                {(['Cash', 'UPI', 'Card', 'Other'] as PaymentMethod[]).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-2 px-1 text-xs font-bold rounded-lg border-2 transition-all flex flex-col items-center justify-center
                      ${paymentMethod === method
                        ? 'bg-teal text-white border-teal shadow-sm scale-[1.02]'
                        : 'bg-white text-ink border-ink hover:bg-paper-alt'}`}
                    id={`pos-pay-method-${method.toLowerCase()}`}
                  >
                    <span>{method}</span>
                  </button>
                ))}
              </div>

              {/* UPI Reference / Info if UPI selected */}
              {paymentMethod === 'UPI' && (
                <div className="mb-3 p-2.5 bg-teal-light/50 border-2 border-teal/40 rounded-lg">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-teal-dark flex items-center gap-1">
                      <QrCode size={13} /> UPI Payment
                    </span>
                    <span className="text-[10px] text-ink-soft">GPay / PhonePe / Paytm</span>
                  </div>
                  <input
                    type="text"
                    value={upiRef}
                    onChange={(e) => setUpiRef(e.target.value)}
                    placeholder="UPI Ref / UTR No. (optional)"
                    className="input py-1 px-2 text-xs font-mono w-full bg-white"
                    id="pos-upi-ref-input"
                  />
                </div>
              )}

              {/* Pay Button (renamed from Charge to Pay) */}
              <button
                onClick={() => chargeMutation.mutate()}
                disabled={cart.lines.length === 0 || chargeMutation.isPending || !activeLocation}
                className="w-full bg-marigold border-2 border-ink rounded-lg py-4
                           font-mono text-base font-bold text-ink
                           hover:bg-marigold-dark transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                id="pay-btn"
              >
                {chargeMutation.isPending ? 'Processing…' : `Pay ${fmt(cart.grandTotal())}`}
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
    </>
  );
};
