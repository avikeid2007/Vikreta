import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  X, Printer, UserPlus, Search, UserCheck, GripVertical,
  QrCode, Clock, Tag, MessageCircle, Maximize2, RotateCcw,
  DollarSign, AlertCircle, Edit2, Sparkles, Keyboard
} from 'lucide-react';
import { productsApi, invoicesApi, customersApi, adminApi } from '../../api/client';
import { useCartStore } from '../../stores/cartStore';
import { useLocationStore } from '../../stores/locationStore';
import { QuantityStepper } from '../../components/FormControls';
import { QRCodeSVG } from '../../components/QRCode';
import { formatWhatsAppReceipt, buildWhatsAppLink } from '../../utils/whatsappReceipt';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);

type PaymentMethod = 'Cash' | 'UPI' | 'Card' | 'Other';
type CustomerModalTab = 'find' | 'new';

const DEFAULT_INVOICE_WIDTH = 380;
const MIN_INVOICE_WIDTH = 300;

// ── Customer Modal ────────────────────────────────────────────────────────────

interface CustomerModalProps {
  onClose: () => void;
  onSelect: (id: string, name: string, phone?: string) => void;
}

const CustomerModal: React.FC<CustomerModalProps> = ({ onClose, onSelect }) => {
  const [tab, setTab] = useState<CustomerModalTab>('find');
  const [search, setSearch] = useState('');

  const { data: searchData, isFetching } = useQuery({
    queryKey: ['customers', 'search', search],
    queryFn: () => customersApi.list({ search, pageSize: 20 }),
    enabled: tab === 'find',
  });
  const customers: any[] = searchData?.data?.items ?? searchData?.data ?? [];

  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' });
  const createMutation = useMutation({
    mutationFn: () => customersApi.create({ name: form.name, phone: form.phone, email: form.email, address: form.address }),
    onSuccess: (res) => {
      const c = res.data;
      toast.success(`Customer "${c.name}" created!`);
      onSelect(c.id, c.name, c.phone);
    },
    onError: () => toast.error('Failed to create customer.'),
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white border-2 border-ink rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b-2 border-ink bg-paper-alt">
          <div className="flex items-center gap-2">
            <UserPlus size={18} className="text-teal-dark" />
            <span className="font-bold text-base">Add Customer</span>
          </div>
          <button onClick={onClose} className="text-ink-soft hover:text-ink transition-colors" id="customer-modal-close">
            <X size={18} />
          </button>
        </div>

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

        <div className="p-5">
          {tab === 'find' ? (
            <div>
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

              <div className="max-h-64 overflow-y-auto space-y-1">
                {isFetching && <p className="text-center text-ink-soft text-xs py-4">Searching…</p>}
                {!isFetching && customers.length === 0 && search && (
                  <p className="text-center text-ink-soft text-xs py-4">No customers found.</p>
                )}
                {!isFetching && customers.length === 0 && !search && (
                  <p className="text-center text-ink-soft text-xs py-4">Type to search customers.</p>
                )}
                {customers.map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => onSelect(c.id, c.name, c.phone)}
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
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const scanRef = useRef<HTMLInputElement>(null);

  // Cash Change Calculator State
  const [cashReceived, setCashReceived] = useState<string>('');

  // Discount Modal State
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [tempDiscountType, setTempDiscountType] = useState<'percent' | 'flat'>(cart.cartDiscountType);
  const [tempDiscountValue, setTempDiscountValue] = useState<string>(
    cart.cartDiscountValue > 0 ? String(cart.cartDiscountValue) : ''
  );

  // Line Discount Modal State
  const [editingLineDiscount, setEditingLineDiscount] = useState<{ productId: string; variantId: string | null; currentDiscount: number; name: string } | null>(null);
  const [lineDiscountInput, setLineDiscountInput] = useState('');

  // Held Carts Modal State
  const [showHeldModal, setShowHeldModal] = useState(false);

  // Keyboard Shortcuts Modal State
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Loyalty Redemption Modal State
  const [showLoyaltyModal, setShowLoyaltyModal] = useState(false);
  const [loyaltyRedeemInput, setLoyaltyRedeemInput] = useState('');

  // Enlarge QR Modal State
  const [showQrModal, setShowQrModal] = useState(false);

  // Last Completed Sale for WhatsApp Sharing
  const [completedSale, setCompletedSale] = useState<{
    invoiceId: string;
    invoiceNumber: string;
    customerName: string | null;
    customerPhone: string;
    items: Array<{ name: string; quantity: number; unitPrice: number; lineTotal: number }>;
    subtotal: number;
    discountTotal: number;
    taxTotal: number;
    grandTotal: number;
    paymentMethod: string;
  } | null>(null);

  // Readjustable Panels State
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

  // Settings (Loyalty Program)
  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => adminApi.getSettings(),
  });
  const settings = settingsData?.data;
  const loyaltyEnabled = settings?.loyaltyEnabled ?? true;
  const loyaltyPointsPerAmount = settings?.loyaltyPointsPerAmount ?? 100;
  const loyaltyRedemptionRate = settings?.loyaltyRedemptionRate ?? 1.0;

  // Selected customer details (Loyalty Points)
  const { data: customerData } = useQuery({
    queryKey: ['customer', cart.customerId],
    queryFn: () => customersApi.get(cart.customerId!),
    enabled: Boolean(cart.customerId),
  });
  const customerDetails = customerData?.data;
  const customerLoyaltyPoints = customerDetails?.loyaltyPoints ?? 0;
  const customerLoyaltyValue = customerLoyaltyPoints * loyaltyRedemptionRate;

  // Fetch products & categories
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
    toast.success(`${product.name} added`, { duration: 800 });
  };

  const handleSelectCustomer = (id: string, name: string, phone?: string) => {
    cart.setCustomer(id, name);
    if (phone) setCustomerPhone(phone);
    setShowCustomerModal(false);
    toast.success(`Customer set: ${name}`);
  };

  // UPI configuration from localStorage or location
  const [storeUpiId, setStoreUpiId] = useState(() => localStorage.getItem('store_upi_id') || '');
  const [storeUpiName, setStoreUpiName] = useState(() => localStorage.getItem('store_upi_name') || activeLocation?.name || 'Vikreta Store');
  const [showUpiConfigModal, setShowUpiConfigModal] = useState(false);
  const [tempUpiId, setTempUpiId] = useState('');
  const [tempUpiName, setTempUpiName] = useState('');

  // Dynamic UPI payment URL string (NPCI specification compliant)
  const upiPayString = useMemo(() => {
    const total = cart.grandTotal();
    const cleanId = (storeUpiId || '').trim();
    if (!cleanId) return '';
    const cleanName = (storeUpiName || 'Store').trim();
    const note = `Bill_${activeLocation?.name?.replace(/[^a-zA-Z0-9]/g, '') || 'POS'}`;
    const amountStr = total > 0 ? total.toFixed(2) : '1.00';
    // pa must keep literal '@' per NPCI UPI spec for Google Pay, PhonePe, Paytm
    return `upi://pay?pa=${cleanId}&pn=${encodeURIComponent(cleanName)}&am=${amountStr}&cu=INR&tn=${encodeURIComponent(note)}`;
  }, [storeUpiId, storeUpiName, cart.grandTotal(), activeLocation]);

  // Cash change calculation
  const cashNum = parseFloat(cashReceived) || 0;
  const grandTot = cart.grandTotal();
  const changeDue = Math.max(0, cashNum - grandTot);
  const remainingDue = Math.max(0, grandTot - cashNum);

  // Proportional line discount distribution to sync with backend
  const buildLinesForInvoice = () => {
    const sub = cart.subtotal();
    const cartDiscount = cart.cartDiscountAmount();
    const discountRatio = sub > 0 && cartDiscount > 0 ? (sub - cartDiscount) / sub : 1;

    return cart.lines.map(l => {
      const lineBase = Math.max(0, l.unitPrice * l.quantity - l.lineDiscount);
      const allocatedCartDiscount = sub > 0 && cartDiscount > 0 ? (lineBase * (1 - discountRatio)) : 0;
      const totalLineDiscount = l.lineDiscount + allocatedCartDiscount;

      return {
        productId: l.productId,
        variantId: l.variantId,
        quantity: l.quantity,
        unitPriceOverride: l.unitPrice,
        lineDiscount: Math.round(totalLineDiscount * 100) / 100,
      };
    });
  };

  const chargeMutation = useMutation({
    mutationFn: async () => {
      const invoicePayload = {
        locationId: activeLocation?.id,
        customerId: cart.customerId,
        pointsRedeemed: cart.redeemedLoyaltyPoints,
        notes: cart.cartDiscountValue > 0
          ? `Cart Discount: ${cart.cartDiscountType === 'percent' ? `${cart.cartDiscountValue}%` : fmt(cart.cartDiscountValue)}`
          : '',
        lines: buildLinesForInvoice(),
      };

      const invRes = await invoicesApi.create(invoicePayload);
      const invoice = invRes.data;

      const payRes = await invoicesApi.addPayment(invoice.id, {
        amount: cart.grandTotal(),
        method: paymentMethod,
        referenceNumber: paymentMethod === 'UPI' ? (upiRef.trim() || 'UPI') : '',
      });

      return { invoice, payment: payRes.data };
    },
    onSuccess: (res) => {
      toast.success('Sale complete! Payment recorded.');

      // Capture completed sale details for WhatsApp sharing
      setCompletedSale({
        invoiceId: res.invoice.id,
        invoiceNumber: res.invoice.invoiceNumber,
        customerName: cart.customerName,
        customerPhone: customerPhone,
        items: cart.lines.map(l => ({
          name: l.productName,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          lineTotal: l.unitPrice * l.quantity - l.lineDiscount,
        })),
        subtotal: cart.subtotal(),
        discountTotal: cart.cartDiscountAmount() + cart.lines.reduce((s, l) => s + l.lineDiscount, 0) + cart.redeemedLoyaltyAmount,
        taxTotal: cart.taxTotal(),
        grandTotal: cart.grandTotal(),
        paymentMethod,
      });

      queryClient.invalidateQueries({ queryKey: ['customer', cart.customerId] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      cart.clear();
      setUpiRef('');
      setCashReceived('');
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['report-sales'] });
    },
    onError: () => toast.error('Failed to process sale. Please verify inventory and details.'),
  });

  // Share via WhatsApp handler
  const handleShareWhatsApp = (customPhone?: string) => {
    if (!completedSale) return;
    const phone = customPhone || completedSale.customerPhone;
    const text = formatWhatsAppReceipt({
      storeName: storeUpiName,
      invoiceNumber: completedSale.invoiceNumber,
      date: new Date().toLocaleDateString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      customerName: completedSale.customerName,
      items: completedSale.items,
      subtotal: completedSale.subtotal,
      discountTotal: completedSale.discountTotal,
      taxTotal: completedSale.taxTotal,
      grandTotal: completedSale.grandTotal,
      paymentMethod: completedSale.paymentMethod,
      storeAddress: activeLocation?.address,
    });

    const url = buildWhatsAppLink(phone, text);
    window.open(url, '_blank');
  };

  const handleHoldCart = () => {
    if (cart.lines.length === 0) {
      toast.error('Cart is empty.');
      return;
    }
    const success = cart.holdCurrentCart();
    if (success) {
      toast.success('Cart parked! You can resume it anytime.');
    }
  };

  // ── Keyboard Shortcuts (Fast Counter Checkout) ───────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputFocused =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl instanceof HTMLSelectElement;

      // F1: Shortcuts Cheat Sheet Modal
      if (e.key === 'F1') {
        e.preventDefault();
        setShowShortcutsModal((prev) => !prev);
        return;
      }

      // F2: Focus Search / Barcode Input
      if (e.key === 'F2') {
        e.preventDefault();
        scanRef.current?.focus();
        scanRef.current?.select();
        return;
      }

      // F4: Instant Pay / Complete Sale
      if (e.key === 'F4') {
        e.preventDefault();
        if (cart.lines.length === 0) {
          toast.error('Cart is empty');
        } else if (!activeLocation) {
          toast.error('Please select an active store location');
        } else if (!chargeMutation.isPending) {
          chargeMutation.mutate();
        }
        return;
      }

      // Space: Select Cash payment method when not typing in text fields
      if (e.code === 'Space' && !isInputFocused) {
        e.preventDefault();
        setPaymentMethod('Cash');
        toast('Cash payment selected [Space]', { icon: '💵', duration: 700 });
        return;
      }

      // F8: Park / Hold current sale
      if (e.key === 'F8') {
        e.preventDefault();
        handleHoldCart();
        return;
      }

      // F9: Open Parked / Held Sales modal
      if (e.key === 'F9') {
        e.preventDefault();
        setShowHeldModal((prev) => !prev);
        return;
      }

      // Escape: Close topmost open modal, or clear cart
      if (e.key === 'Escape') {
        if (showShortcutsModal) { setShowShortcutsModal(false); return; }
        if (showLoyaltyModal) { setShowLoyaltyModal(false); return; }
        if (showCustomerModal) { setShowCustomerModal(false); return; }
        if (showDiscountModal) { setShowDiscountModal(false); return; }
        if (editingLineDiscount) { setEditingLineDiscount(null); return; }
        if (showHeldModal) { setShowHeldModal(false); return; }
        if (showQrModal) { setShowQrModal(false); return; }
        if (showUpiConfigModal) { setShowUpiConfigModal(false); return; }

        if (cart.lines.length > 0) {
          if (window.confirm('Clear current cart? [Esc]')) {
            cart.clear();
            toast.success('Cart cleared');
          }
        }
        return;
      }

      // Auto-focus search input when single alphanumeric char is pressed outside inputs
      if (!isInputFocused && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        scanRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    cart, activeLocation, chargeMutation,
    showShortcutsModal, showLoyaltyModal, showCustomerModal, showDiscountModal,
    editingLineDiscount, showHeldModal, showQrModal, showUpiConfigModal
  ]);

  return (
    <>
      {showCustomerModal && (
        <CustomerModal
          onClose={() => setShowCustomerModal(false)}
          onSelect={handleSelectCustomer}
        />
      )}

      {/* ── Loyalty Points Redemption Modal ────────────────────────────────────── */}
      {showLoyaltyModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowLoyaltyModal(false); }}
        >
          <div className="bg-white border-2 border-ink rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b-2 border-ink bg-paper-alt">
              <span className="font-bold text-sm flex items-center gap-1.5 text-amber-800">
                <Sparkles size={16} className="text-amber-600" /> Redeem Loyalty Points
              </span>
              <button onClick={() => setShowLoyaltyModal(false)} className="text-ink-soft hover:text-ink">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-center">
                <p className="text-xs text-amber-800 font-semibold">{cart.customerName ?? 'Customer'}</p>
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  <span className="text-2xl font-mono font-black text-amber-900">{customerLoyaltyPoints}</span>
                  <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">Points Available</span>
                </div>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Worth ₹{customerLoyaltyValue.toFixed(2)} (1 pt = ₹{loyaltyRedemptionRate.toFixed(2)})
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Points to Redeem (Max: {Math.min(customerLoyaltyPoints, Math.floor((cart.grandTotal() + cart.redeemedLoyaltyAmount) / loyaltyRedemptionRate))})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max={Math.min(customerLoyaltyPoints, Math.floor((cart.grandTotal() + cart.redeemedLoyaltyAmount) / loyaltyRedemptionRate))}
                    value={loyaltyRedeemInput}
                    onChange={(e) => setLoyaltyRedeemInput(e.target.value)}
                    placeholder="Enter points"
                    className="input font-mono text-base pr-12"
                    autoFocus
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-soft">
                    pts
                  </span>
                </div>
                {Number(loyaltyRedeemInput) > 0 && (
                  <p className="text-xs text-teal-dark font-mono font-bold mt-1">
                    Deducts: -₹{(Number(loyaltyRedeemInput) * loyaltyRedemptionRate).toFixed(2)} from bill
                  </p>
                )}
              </div>

              {/* Quick Percent Options */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink-soft font-semibold">Quick:</span>
                {[0.25, 0.5, 1].map((pct) => {
                  const maxPts = Math.min(
                    customerLoyaltyPoints,
                    Math.floor((cart.grandTotal() + cart.redeemedLoyaltyAmount) / loyaltyRedemptionRate)
                  );
                  const pts = Math.floor(maxPts * pct);
                  return (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setLoyaltyRedeemInput(String(pts))}
                      className="px-2.5 py-1 text-xs font-bold font-mono border-2 border-line rounded-lg hover:border-amber-500 hover:bg-amber-50 transition-colors"
                    >
                      {pct === 1 ? 'MAX' : `${pct * 100}%`} ({pts})
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-line">
                {cart.redeemedLoyaltyPoints > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      cart.setLoyaltyRedemption(0, 0);
                      setShowLoyaltyModal(false);
                      toast.success('Loyalty redemption removed');
                    }}
                    className="btn-secondary text-xs flex-1 text-cherry hover:bg-rose-50"
                  >
                    Remove
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const pts = parseInt(loyaltyRedeemInput, 10) || 0;
                    const maxPts = Math.min(
                      customerLoyaltyPoints,
                      Math.floor((cart.grandTotal() + cart.redeemedLoyaltyAmount) / loyaltyRedemptionRate)
                    );
                    if (pts <= 0) {
                      cart.setLoyaltyRedemption(0, 0);
                      setShowLoyaltyModal(false);
                      toast.success('Points cleared');
                      return;
                    }
                    if (pts > maxPts) {
                      toast.error(`Cannot redeem more than ${maxPts} points`);
                      return;
                    }
                    const discount = pts * loyaltyRedemptionRate;
                    cart.setLoyaltyRedemption(pts, discount);
                    setShowLoyaltyModal(false);
                    toast.success(`Redeemed ${pts} points (-₹${discount.toFixed(2)})!`);
                  }}
                  className="btn-primary text-xs flex-1 justify-center bg-amber-600 hover:bg-amber-700 border-amber-700 text-white"
                >
                  Apply Points
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Shortcuts Cheat Sheet Modal ────────────────────────────────────────── */}
      {showShortcutsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowShortcutsModal(false); }}
        >
          <div className="bg-white border-2 border-ink rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b-2 border-ink bg-paper-alt">
              <span className="font-bold text-sm flex items-center gap-2 text-ink">
                <Keyboard size={16} className="text-teal-dark" /> Keyboard Shortcuts (Counter Hotkeys)
              </span>
              <button onClick={() => setShowShortcutsModal(false)} className="text-ink-soft hover:text-ink">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-ink-soft">
                Accelerate checkout speed at the counter with direct keyboard hotkeys:
              </p>
              <div className="divide-y divide-line border-2 border-line rounded-xl overflow-hidden text-xs">
                {[
                  { key: 'F1', label: 'Shortcuts Help', desc: 'Open or close this hotkey guide' },
                  { key: 'F2', label: 'Barcode / Search', desc: 'Instantly focus product search / barcode input' },
                  { key: 'F4', label: 'Pay / Complete Sale', desc: 'Instantly finalize bill & record payment' },
                  { key: 'Space', label: 'Cash Payment', desc: 'Select Cash method when not in text fields' },
                  { key: 'F8', label: 'Hold Sale', desc: 'Park current cart for waiting customer' },
                  { key: 'F9', label: 'Parked Sales', desc: 'Open list of parked sales to resume' },
                  { key: 'Esc', label: 'Cancel / Clear', desc: 'Close dialogs or clear current cart' },
                ].map((s) => (
                  <div key={s.key} className="flex items-center justify-between p-2.5 hover:bg-paper-alt">
                    <div className="flex items-center gap-2.5">
                      <kbd className="px-2 py-1 bg-ink text-white font-mono font-black text-xs rounded border border-ink shadow-sm">
                        {s.key}
                      </kbd>
                      <span className="font-bold text-ink">{s.label}</span>
                    </div>
                    <span className="text-[11px] text-ink-soft text-right">{s.desc}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowShortcutsModal(false)}
                  className="btn-primary w-full text-xs justify-center"
                >
                  Got It (Esc to close)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Cart Discount Modal ───────────────────────────────────────────────── */}
      {showDiscountModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowDiscountModal(false); }}
        >
          <div className="bg-white border-2 border-ink rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b-2 border-ink bg-paper-alt">
              <span className="font-bold text-sm flex items-center gap-1.5">
                <Tag size={16} className="text-marigold-dark" /> Cart Discount
              </span>
              <button onClick={() => setShowDiscountModal(false)} className="text-ink-soft hover:text-ink">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex rounded-lg border-2 border-ink overflow-hidden">
                <button
                  type="button"
                  onClick={() => setTempDiscountType('percent')}
                  className={`flex-1 py-2 text-xs font-bold transition-colors ${
                    tempDiscountType === 'percent' ? 'bg-marigold text-ink' : 'bg-white text-ink-soft'
                  }`}
                >
                  Percentage (%)
                </button>
                <button
                  type="button"
                  onClick={() => setTempDiscountType('flat')}
                  className={`flex-1 py-2 text-xs font-bold transition-colors border-l-2 border-ink ${
                    tempDiscountType === 'flat' ? 'bg-marigold text-ink' : 'bg-white text-ink-soft'
                  }`}
                >
                  Flat Rupee (₹)
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Discount Value {tempDiscountType === 'percent' ? '(%)' : '(₹)'}
                </label>
                <input
                  type="number"
                  min="0"
                  step={tempDiscountType === 'percent' ? '1' : '0.5'}
                  value={tempDiscountValue}
                  onChange={(e) => setTempDiscountValue(e.target.value)}
                  placeholder={tempDiscountType === 'percent' ? 'e.g. 10 for 10%' : 'e.g. 50 for ₹50'}
                  className="input font-mono text-base"
                  autoFocus
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-ink-soft font-semibold mr-1">Quick:</span>
                {tempDiscountType === 'percent'
                  ? [5, 10, 15, 20].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setTempDiscountValue(String(pct))}
                        className="px-2 py-0.5 text-xs font-mono font-bold border-2 border-line rounded hover:border-marigold"
                      >
                        {pct}%
                      </button>
                    ))
                  : [20, 50, 100, 200].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setTempDiscountValue(String(amt))}
                        className="px-2 py-0.5 text-xs font-mono font-bold border-2 border-line rounded hover:border-marigold"
                      >
                        ₹{amt}
                      </button>
                    ))}
              </div>

              <div className="flex items-center gap-2 pt-2">
                {cart.cartDiscountValue > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      cart.setCartDiscount('percent', 0);
                      setShowDiscountModal(false);
                      toast.success('Discount removed');
                    }}
                    className="btn-secondary text-xs flex-1 text-cherry hover:bg-rose-50"
                  >
                    Remove
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const val = parseFloat(tempDiscountValue) || 0;
                    cart.setCartDiscount(tempDiscountType, val);
                    setShowDiscountModal(false);
                    toast.success(val > 0 ? 'Discount applied!' : 'Discount cleared');
                  }}
                  className="btn-primary text-xs flex-1 justify-center"
                >
                  Apply Discount
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Line Item Discount Modal ──────────────────────────────────────────── */}
      {editingLineDiscount && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setEditingLineDiscount(null); }}
        >
          <div className="bg-white border-2 border-ink rounded-2xl shadow-2xl w-full max-w-xs mx-4 p-5 space-y-3">
            <h3 className="text-sm font-bold truncate">Item Discount: {editingLineDiscount.name}</h3>
            <label className="block text-xs text-ink-soft">Flat discount on this item (₹):</label>
            <input
              type="number"
              min="0"
              step="1"
              value={lineDiscountInput}
              onChange={(e) => setLineDiscountInput(e.target.value)}
              className="input font-mono text-base"
              placeholder="0.00"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setEditingLineDiscount(null)}
                className="btn-secondary text-xs flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const val = parseFloat(lineDiscountInput) || 0;
                  cart.updateDiscount(editingLineDiscount.productId, editingLineDiscount.variantId, val);
                  setEditingLineDiscount(null);
                  toast.success('Item discount updated');
                }}
                className="btn-teal text-xs flex-1 justify-center"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Held Sales Modal ─────────────────────────────────────────────────── */}
      {showHeldModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowHeldModal(false); }}
        >
          <div className="bg-white border-2 border-ink rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-3.5 border-b-2 border-ink bg-paper-alt">
              <span className="font-bold text-base flex items-center gap-2">
                <Clock size={18} className="text-teal-dark" /> Parked / Held Sales ({cart.heldCarts.length})
              </span>
              <button onClick={() => setShowHeldModal(false)} className="text-ink-soft hover:text-ink">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {cart.heldCarts.length === 0 ? (
                <div className="text-center py-12 text-ink-soft text-sm">
                  No held carts. You can click <strong>"Hold Sale"</strong> on the receipt anytime to park an order.
                </div>
              ) : (
                cart.heldCarts.map((held) => (
                  <div
                    key={held.id}
                    className="p-4 border-2 border-ink rounded-xl bg-paper-alt/40 hover:bg-paper-alt/80 transition-all flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-ink-soft font-mono">
                          {new Date(held.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {held.itemCount} items
                        </p>
                        <p className="text-sm font-bold text-ink mt-0.5">
                          {held.customerName ? `Customer: ${held.customerName}` : 'Walk-in Customer'}
                        </p>
                      </div>
                      <span className="font-mono text-base font-bold text-teal-dark">{fmt(held.total)}</span>
                    </div>

                    <p className="text-xs text-ink-soft truncate">
                      {held.lines.map((l) => `${l.quantity}× ${l.productName}`).join(', ')}
                    </p>

                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-line">
                      <button
                        onClick={() => {
                          cart.deleteHeldCart(held.id);
                          toast.success('Parked cart removed');
                        }}
                        className="text-xs font-bold text-cherry hover:underline px-2 py-1"
                      >
                        Discard
                      </button>
                      <button
                        onClick={() => {
                          if (cart.lines.length > 0) {
                            if (!window.confirm('Current active cart will be replaced by the held cart. Proceed?')) return;
                          }
                          cart.resumeCart(held.id);
                          setShowHeldModal(false);
                          toast.success('Cart resumed!');
                        }}
                        className="btn-primary text-xs py-1 px-3.5 flex items-center gap-1"
                      >
                        <RotateCcw size={12} /> Resume Sale
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Large QR Code Modal for Customer Counter Display ─────────────────── */}
      {/* ── UPI Configuration Modal ───────────────────────────────────────── */}
      {showUpiConfigModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowUpiConfigModal(false); }}
        >
          <div className="bg-white border-2 border-ink rounded-3xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-teal-light rounded-xl text-teal-dark">
                  <QrCode size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink">Configure Store UPI</h3>
                  <p className="text-[11px] text-ink-soft">Direct deposits into your bank account</p>
                </div>
              </div>
              <button onClick={() => setShowUpiConfigModal(false)} className="text-ink-soft hover:text-ink">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Store UPI ID / VPA <span className="text-cherry">*</span>
                </label>
                <input
                  type="text"
                  value={tempUpiId}
                  onChange={(e) => setTempUpiId(e.target.value.trim())}
                  placeholder="e.g. yourstore@okaxis, 9876543210@paytm"
                  className="input text-xs font-mono w-full"
                  autoFocus
                />
                <p className="text-[10px] text-ink-soft mt-1">
                  Copy from your PhonePe, Google Pay, Paytm, or BHIM business profile.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">Payee / Merchant Name</label>
                <input
                  type="text"
                  value={tempUpiName}
                  onChange={(e) => setTempUpiName(e.target.value)}
                  placeholder="e.g. Sharma Kirana Store"
                  className="input text-xs w-full"
                />
              </div>

              <div className="p-3 bg-paper-alt rounded-xl border border-line text-[11px] text-ink-soft space-y-1">
                <p className="font-bold text-ink flex items-center gap-1">
                  💡 How Dynamic UPI Works:
                </p>
                <p>
                  The POS encodes your UPI ID + exact invoice amount into an NPCI UPI link.
                  When customers scan, the money transfers directly to your bank account with 0% gateway fees.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowUpiConfigModal(false)}
                className="btn-secondary text-xs flex-1 justify-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!tempUpiId || !tempUpiId.includes('@')) {
                    toast.error('Please enter a valid UPI ID (e.g. shop@bank)');
                    return;
                  }
                  localStorage.setItem('store_upi_id', tempUpiId);
                  localStorage.setItem('store_upi_name', tempUpiName || 'Store');
                  setStoreUpiId(tempUpiId);
                  setStoreUpiName(tempUpiName || 'Store');
                  setShowUpiConfigModal(false);
                  toast.success('UPI ID saved! QR code updated.');
                }}
                className="btn-teal text-xs flex-1 justify-center"
              >
                Save UPI ID
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Large QR Code Modal ────────────────────────────────────────────── */}
      {showQrModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowQrModal(false); }}
        >
          <div className="bg-white border-2 border-ink rounded-3xl shadow-2xl w-full max-w-sm mx-4 p-6 text-center space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-teal-dark flex items-center gap-1.5">
                <QrCode size={16} /> Scan to Pay with UPI
              </span>
              <button onClick={() => setShowQrModal(false)} className="text-ink-soft hover:text-ink">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 bg-white border-2 border-line rounded-2xl inline-block shadow-inner">
              <QRCodeSVG value={upiPayString} size={220} />
            </div>

            <div>
              <p className="font-mono text-3xl font-extrabold text-teal-dark">{fmt(cart.grandTotal())}</p>
              <p className="text-xs text-ink-soft mt-1">Accepts Google Pay, PhonePe, Paytm, BHIM</p>
              <p className="text-[11px] font-mono text-ink-soft mt-0.5 bg-paper-alt px-2 py-1 rounded inline-block">
                UPI ID: {storeUpiId || 'Not Configured'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setTempUpiId(storeUpiId);
                  setTempUpiName(storeUpiName);
                  setShowQrModal(false);
                  setShowUpiConfigModal(true);
                }}
                className="btn-secondary text-xs flex-1 justify-center"
              >
                <Edit2 size={12} /> Edit UPI ID
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(upiPayString);
                  toast.success('UPI link copied!');
                }}
                className="btn-teal text-xs flex-1 justify-center"
              >
                Copy Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Layout ──────────────────────────────────────────────────────── */}
      <div className={`flex h-[calc(100vh-57px)] bg-paper-alt overflow-hidden ${isDragging ? 'select-none' : ''}`}>
        {/* ── Left: Product picker (Item Selection Side) ─────────────── */}
        <div className="flex flex-col flex-1 p-5 overflow-hidden min-w-0">
          {/* Top action row: Search & Held Sales button */}
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <input
                ref={scanRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="▤  Scan barcode or search products…"
                className="input w-full pr-16"
                id="pos-search"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                {search ? (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="pointer-events-auto text-xs text-ink-soft hover:text-ink mr-1"
                  >
                    ✕
                  </button>
                ) : null}
                <kbd className="text-[10px] font-mono font-bold bg-paper-alt text-ink-soft px-1.5 py-0.5 rounded border border-line shadow-2xs">
                  F2
                </kbd>
              </div>
            </div>

            {/* Shortcuts Guide Button */}
            <button
              type="button"
              onClick={() => setShowShortcutsModal(true)}
              className="btn-ghost flex items-center gap-1.5 flex-shrink-0 text-xs py-2 px-2.5 text-ink-soft hover:text-ink border border-line rounded-lg"
              title="View Keyboard Hotkeys [F1]"
              id="pos-shortcuts-btn"
            >
              <Keyboard size={14} className="text-teal-dark" />
              <span className="hidden md:inline font-medium">Hotkeys</span>
              <kbd className="text-[10px] font-mono font-bold bg-paper-alt px-1 py-0.5 rounded border border-line">F1</kbd>
            </button>

            {/* Held Carts quick access button */}
            <button
              onClick={() => setShowHeldModal(true)}
              className={`btn-secondary flex items-center gap-1.5 flex-shrink-0 text-xs py-2 px-3 relative ${
                cart.heldCarts.length > 0 ? 'border-marigold text-marigold-dark font-bold' : ''
              }`}
              title="View Parked Sales [F9]"
              id="held-sales-btn"
            >
              <Clock size={14} />
              <span>Parked</span>
              <kbd className="text-[10px] font-mono text-ink-soft bg-paper-alt px-1 rounded border border-line">F9</kbd>
              {cart.heldCarts.length > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-marigold text-ink text-[11px] font-bold font-mono">
                  {cart.heldCarts.length}
                </span>
              )}
            </button>
          </div>

          {/* Category filter */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1 flex-shrink-0">
            <button
              onClick={() => setActiveCategory(null)}
              className={`cat-pill flex-shrink-0 ${
                !activeCategory ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-ink hover:bg-paper-alt'
              }`}
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
          <div
            className={`w-1.5 h-10 rounded-full flex items-center justify-center transition-all ${
              isDragging ? 'bg-white' : 'bg-ink-soft/40 group-hover:bg-teal-dark group-hover:scale-110'
            }`}
          >
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
              <p className="text-center font-bold text-base text-cherry mb-3">Current Sale</p>

              {/* Completed Sale Notification with WhatsApp Action */}
              {completedSale && (
                <div className="p-3 mb-4 bg-teal-light border-2 border-teal rounded-xl animate-in fade-in space-y-2">
                  <div className="flex items-center justify-between text-teal-dark font-bold text-xs">
                    <span>✓ Sale completed! #{completedSale.invoiceNumber}</span>
                    <button onClick={() => setCompletedSale(null)} className="text-ink-soft hover:text-ink">
                      ✕
                    </button>
                  </div>
                  <button
                    onClick={() => handleShareWhatsApp()}
                    className="w-full bg-[#25D366] hover:bg-[#1EBE5D] text-white py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                    id="whatsapp-share-btn"
                  >
                    <MessageCircle size={14} /> Send Receipt on WhatsApp
                  </button>
                </div>
              )}

              {/* Customer line */}
              <div className="text-xs text-ink-soft mb-3 bg-paper-alt/40 p-2.5 rounded-lg border border-line">
                <div className="flex justify-between items-center">
                  {cart.customerId ? (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <UserCheck size={14} className="text-teal-dark flex-shrink-0" />
                      <div className="truncate">
                        <p className="font-semibold text-teal-dark truncate leading-tight">{cart.customerName}</p>
                        {customerPhone && <p className="text-[10px] text-ink-soft font-mono">{customerPhone}</p>}
                      </div>
                      <button
                        onClick={() => {
                          cart.setCustomer(null, null);
                          cart.setLoyaltyRedemption(0, 0);
                          setCustomerPhone('');
                        }}
                        className="text-ink-soft hover:text-cherry transition-colors flex-shrink-0 ml-1"
                        title="Remove customer"
                        id="clear-customer-btn"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <span className="italic">Walk-in customer</span>
                  )}
                  <button
                    className="text-teal-dark font-bold hover:text-teal transition-colors flex-shrink-0 ml-2"
                    onClick={() => setShowCustomerModal(true)}
                    id="add-customer-btn"
                  >
                    {cart.customerId ? 'Change' : '+ Add customer'}
                  </button>
                </div>

                {/* Loyalty Points Strip */}
                {cart.customerId && loyaltyEnabled && (
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-line/60 bg-amber-50/50 -mx-1 px-2 py-1 rounded">
                    <div className="flex items-center gap-1">
                      <Sparkles size={12} className="text-amber-600" />
                      <span className="font-mono text-xs font-bold text-amber-950">
                        {customerLoyaltyPoints} Pts
                      </span>
                      <span className="text-[10px] text-amber-800">
                        (₹{customerLoyaltyValue.toFixed(0)})
                      </span>
                    </div>
                    {customerLoyaltyPoints > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setLoyaltyRedeemInput(
                            cart.redeemedLoyaltyPoints > 0 ? String(cart.redeemedLoyaltyPoints) : ''
                          );
                          setShowLoyaltyModal(true);
                        }}
                        className="text-[10px] font-bold text-amber-800 hover:text-amber-950 underline"
                        id="redeem-loyalty-btn"
                      >
                        {cart.redeemedLoyaltyPoints > 0 ? 'Edit Points' : '+ Redeem'}
                      </button>
                    ) : (
                      <span className="text-[10px] text-ink-soft">Earn 1 pt / ₹{loyaltyPointsPerAmount}</span>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t-2 border-dashed border-line my-2" />

              {/* Cart lines */}
              {cart.lines.length === 0 ? (
                <div className="text-center text-ink-soft text-xs py-8">
                  <p>Cart is empty</p>
                  <p className="text-[11px] opacity-75 mt-1">Tap products on the left to add items</p>
                </div>
              ) : (
                <div className="space-y-3 my-2">
                  {cart.lines.map((line) => (
                    <div key={`${line.productId}-${line.variantId}`} className="flex justify-between items-start group">
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
                          {line.lineDiscount > 0 ? (
                            <button
                              onClick={() => {
                                setEditingLineDiscount({
                                  productId: line.productId,
                                  variantId: line.variantId,
                                  currentDiscount: line.lineDiscount,
                                  name: line.productName,
                                });
                                setLineDiscountInput(String(line.lineDiscount));
                              }}
                              className="text-[10px] font-mono text-cherry font-bold hover:underline"
                            >
                              (-{fmt(line.lineDiscount)})
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingLineDiscount({
                                  productId: line.productId,
                                  variantId: line.variantId,
                                  currentDiscount: 0,
                                  name: line.productName,
                                });
                                setLineDiscountInput('');
                              }}
                              className="text-[10px] text-ink-soft hover:text-marigold-dark transition-colors opacity-0 group-hover:opacity-100"
                              title="Add Item Discount"
                            >
                              +discount
                            </button>
                          )}
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
                  ))}
                </div>
              )}

              <div className="border-t-2 border-dashed border-line my-3" />

              {/* Totals & Discount breakdown */}
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-ink-soft text-xs">
                  <span>Subtotal</span>
                  <span className="font-mono">{fmt(cart.subtotal())}</span>
                </div>

                {/* Cart Discount row */}
                <div className="flex justify-between items-center text-xs">
                  <button
                    onClick={() => {
                      setTempDiscountType(cart.cartDiscountType);
                      setTempDiscountValue(cart.cartDiscountValue > 0 ? String(cart.cartDiscountValue) : '');
                      setShowDiscountModal(true);
                    }}
                    className="flex items-center gap-1 text-marigold-dark font-bold hover:underline"
                    id="cart-discount-btn"
                  >
                    <Tag size={12} />
                    {cart.cartDiscountValue > 0
                      ? `Discount (${cart.cartDiscountType === 'percent' ? `${cart.cartDiscountValue}%` : 'Flat'})`
                      : '+ Add Discount'}
                  </button>
                  <span className="font-mono font-bold text-cherry">
                    {cart.cartDiscountAmount() > 0 ? `-${fmt(cart.cartDiscountAmount())}` : '—'}
                  </span>
                </div>

                {/* Loyalty Redemption row */}
                {cart.redeemedLoyaltyPoints > 0 && (
                  <div className="flex justify-between items-center text-xs bg-amber-50 px-2 py-1 rounded border border-amber-200">
                    <span className="flex items-center gap-1 font-bold text-amber-900">
                      <Sparkles size={11} className="text-amber-600" />
                      Points ({cart.redeemedLoyaltyPoints} pts)
                      <button
                        type="button"
                        onClick={() => cart.setLoyaltyRedemption(0, 0)}
                        className="text-cherry hover:text-rose-700 ml-1 font-bold"
                        title="Remove loyalty points"
                      >
                        ✕
                      </button>
                    </span>
                    <span className="font-mono font-bold text-amber-900">
                      -{fmt(cart.redeemedLoyaltyAmount)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-ink-soft text-xs">
                  <span>Tax (GST)</span>
                  <span className="font-mono">{fmt(cart.taxTotal())}</span>
                </div>

                <div className="flex justify-between font-bold text-xl pt-2 border-t border-line">
                  <span>Total</span>
                  <span className="font-mono text-teal-dark">{fmt(cart.grandTotal())}</span>
                </div>
              </div>
            </div>

            {/* Serrated bottom edge */}
            <div className="receipt-edge-bottom flex-shrink-0" />

            {/* Payment footer */}
            <div className="px-5 pb-5 pt-2 bg-[#FFFDF7] border-t-2 border-dashed border-line flex-shrink-0">
              {/* Payment Methods Grid */}
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
                    {method === 'Cash' && (
                      <span className="text-[9px] font-mono opacity-70 mt-0.5 px-1 bg-black/10 rounded">
                        Space
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* ── UPI Interactive Panel ─────────────────────────────────── */}
              {paymentMethod === 'UPI' && cart.lines.length > 0 && (
                <div className="mb-3 p-3 bg-teal-light/40 border-2 border-teal/40 rounded-xl space-y-2.5 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-teal-dark flex items-center gap-1">
                      <QrCode size={14} /> Scan UPI QR
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setTempUpiId(storeUpiId);
                          setTempUpiName(storeUpiName);
                          setShowUpiConfigModal(true);
                        }}
                        className="text-[10px] text-teal-dark font-bold hover:underline flex items-center gap-0.5"
                        title="Configure Store UPI ID"
                      >
                        <Edit2 size={10} /> {storeUpiId ? 'Change UPI' : 'Set UPI'}
                      </button>
                      {storeUpiId && (
                        <button
                          type="button"
                          onClick={() => setShowQrModal(true)}
                          className="text-[11px] text-teal-dark font-bold hover:underline flex items-center gap-1"
                        >
                          <Maximize2 size={11} /> Enlarge
                        </button>
                      )}
                    </div>
                  </div>

                  {!storeUpiId ? (
                    <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-center space-y-2">
                      <div className="text-amber-800 text-xs font-bold flex items-center justify-center gap-1">
                        <AlertCircle size={14} className="text-amber-600" /> UPI ID Not Configured
                      </div>
                      <p className="text-[11px] text-amber-700 leading-tight">
                        Enter your PhonePe, GPay, Paytm, or Bank UPI ID so payments go directly to your account.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setTempUpiId('');
                          setTempUpiName(storeUpiName);
                          setShowUpiConfigModal(true);
                        }}
                        className="btn-teal text-xs py-1.5 px-3 w-full justify-center"
                      >
                        Set UPI ID Now
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-center py-1 bg-white rounded-lg border border-teal/20">
                        <QRCodeSVG value={upiPayString} size={130} />
                      </div>

                      <div className="text-center">
                        <p className="text-[11px] font-mono font-bold text-ink truncate px-1">
                          Pay to: {storeUpiId}
                        </p>
                        <p className="text-[10px] text-ink-soft">{storeUpiName} · GPay, PhonePe, Paytm</p>
                      </div>

                      <input
                        type="text"
                        value={upiRef}
                        onChange={(e) => setUpiRef(e.target.value)}
                        placeholder="UPI Ref / UTR No. (optional)"
                        className="input py-1 px-2 text-xs font-mono w-full bg-white"
                        id="pos-upi-ref-input"
                      />
                    </>
                  )}
                </div>
              )}

              {/* ── Cash Change Due Calculator ─────────────────────────────── */}
              {paymentMethod === 'Cash' && cart.lines.length > 0 && (
                <div className="mb-3 p-3 bg-paper-alt/70 border-2 border-ink rounded-xl space-y-2.5 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-ink flex items-center gap-1">
                      <DollarSign size={13} className="text-marigold-dark" /> Cash Received
                    </label>
                    <button
                      type="button"
                      onClick={() => setCashReceived(String(Math.ceil(grandTot)))}
                      className="text-[10px] font-bold text-teal-dark hover:underline"
                    >
                      Exact (₹{Math.ceil(grandTot)})
                    </button>
                  </div>

                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-ink-soft">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      placeholder={String(Math.ceil(grandTot))}
                      className="input pl-6 py-1.5 text-sm font-mono font-bold w-full bg-white"
                      id="pos-cash-received-input"
                    />
                  </div>

                  {/* Cash Denomination Quick Add Chips */}
                  <div className="flex items-center gap-1 flex-wrap">
                    {[50, 100, 200, 500].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          const curr = parseFloat(cashReceived) || 0;
                          setCashReceived(String(curr + amt));
                        }}
                        className="px-2 py-0.5 text-[11px] font-mono font-bold border border-ink rounded bg-white hover:bg-paper-alt"
                      >
                        +₹{amt}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setCashReceived('')}
                      className="px-1.5 py-0.5 text-[10px] text-ink-soft hover:text-cherry"
                    >
                      Clear
                    </button>
                  </div>

                  {/* Change or Remaining Calculation Banner */}
                  {cashNum > 0 && (
                    <div
                      className={`p-2 rounded-lg border text-center transition-all ${
                        cashNum >= grandTot
                          ? 'bg-teal-light border-teal text-teal-dark'
                          : 'bg-amber-50 border-marigold text-marigold-dark'
                      }`}
                    >
                      {cashNum >= grandTot ? (
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider block opacity-85">
                            Return Change
                          </span>
                          <span className="font-mono text-lg font-extrabold">{fmt(changeDue)}</span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-[11px] font-bold block opacity-85">Remaining Balance</span>
                          <span className="font-mono text-sm font-bold">{fmt(remainingDue)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Pay Button */}
              <button
                onClick={() => chargeMutation.mutate()}
                disabled={cart.lines.length === 0 || chargeMutation.isPending || !activeLocation}
                className="w-full bg-marigold border-2 border-ink rounded-lg py-3.5
                           font-mono text-base font-bold text-ink
                           hover:bg-marigold-dark transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                id="pay-btn"
              >
                {chargeMutation.isPending ? (
                  'Processing…'
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <span>Pay {fmt(cart.grandTotal())}</span>
                    <kbd className="text-xs font-mono font-bold bg-ink/10 px-1.5 py-0.5 rounded border border-ink/20">
                      F4
                    </kbd>
                  </span>
                )}
              </button>

              {/* Action Buttons: Hold Sale, Print, Void */}
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={handleHoldCart}
                  disabled={cart.lines.length === 0}
                  className="text-xs font-bold text-ink-soft hover:text-marigold-dark flex items-center gap-1 disabled:opacity-40 transition-colors"
                  id="hold-sale-btn"
                >
                  <Clock size={13} /> Hold Sale <span className="text-[10px] font-mono opacity-60">[F8]</span>
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    disabled={cart.lines.length === 0}
                    className="text-xs font-bold text-ink-soft hover:text-ink flex items-center gap-1 disabled:opacity-40 transition-colors"
                  >
                    <Printer size={13} /> Print
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (cart.lines.length > 0 && window.confirm('Void current sale and clear cart? [Esc]')) {
                        cart.clear();
                        toast.success('Sale voided.');
                      }
                    }}
                    disabled={cart.lines.length === 0}
                    className="text-xs font-bold text-cherry hover:underline disabled:opacity-40"
                  >
                    Void <span className="text-[10px] font-mono opacity-60">[Esc]</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
