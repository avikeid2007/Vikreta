import { create } from 'zustand';

export interface CartLine {
  productId: string;
  variantId: string | null;
  productName: string;
  variantAttribute: string | null;
  categoryColor: string; // hex
  categoryName: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  lineDiscount: number;
}

export interface HeldCart {
  id: string;
  createdAt: string;
  lines: CartLine[];
  customerId: string | null;
  customerName: string | null;
  cartDiscountType: 'percent' | 'flat';
  cartDiscountValue: number;
  subtotal: number;
  total: number;
  itemCount: number;
  note?: string;
}

interface CartState {
  lines: CartLine[];
  customerId: string | null;
  customerName: string | null;

  // Cart-level discount
  cartDiscountType: 'percent' | 'flat';
  cartDiscountValue: number;
  setCartDiscount: (type: 'percent' | 'flat', value: number) => void;

  // Held carts
  heldCarts: HeldCart[];
  holdCurrentCart: (note?: string) => boolean;
  resumeCart: (id: string) => void;
  deleteHeldCart: (id: string) => void;

  addItem: (item: Omit<CartLine, 'quantity' | 'lineDiscount'>) => void;
  removeItem: (productId: string, variantId: string | null) => void;
  updateQuantity: (productId: string, variantId: string | null, quantity: number) => void;
  updateDiscount: (productId: string, variantId: string | null, discount: number) => void;
  setCustomer: (id: string | null, name: string | null) => void;
  clear: () => void;

  // Loyalty points redemption
  redeemedLoyaltyPoints: number;
  redeemedLoyaltyAmount: number;
  setLoyaltyRedemption: (points: number, amount: number) => void;

  subtotal: () => number;
  cartDiscountAmount: () => number;
  taxTotal: () => number;
  grandTotal: () => number;
  itemCount: () => number;
}

const loadHeldCarts = (): HeldCart[] => {
  try {
    const raw = localStorage.getItem('pos_held_carts');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveHeldCarts = (carts: HeldCart[]) => {
  try {
    localStorage.setItem('pos_held_carts', JSON.stringify(carts));
  } catch {
    // Ignore storage quota errors
  }
};

export const useCartStore = create<CartState>()((set, get) => ({
  lines: [],
  customerId: null,
  customerName: null,
  cartDiscountType: 'percent',
  cartDiscountValue: 0,
  heldCarts: loadHeldCarts(),

  setCartDiscount: (type, value) => set({ cartDiscountType: type, cartDiscountValue: Math.max(0, value) }),

  holdCurrentCart: (note = '') => {
    const { lines, customerId, customerName, cartDiscountType, cartDiscountValue, subtotal, grandTotal, itemCount } = get();
    if (lines.length === 0) return false;

    const newHeld: HeldCart = {
      id: `HELD-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      lines: [...lines],
      customerId,
      customerName,
      cartDiscountType,
      cartDiscountValue,
      subtotal: subtotal(),
      total: grandTotal(),
      itemCount: itemCount(),
      note,
    };

    const updated = [newHeld, ...get().heldCarts];
    saveHeldCarts(updated);
    set({
      lines: [],
      customerId: null,
      customerName: null,
      cartDiscountType: 'percent',
      cartDiscountValue: 0,
      heldCarts: updated,
    });
    return true;
  },

  resumeCart: (id) => {
    const held = get().heldCarts.find((c) => c.id === id);
    if (!held) return;

    const updatedHeld = get().heldCarts.filter((c) => c.id !== id);
    saveHeldCarts(updatedHeld);

    set({
      lines: held.lines,
      customerId: held.customerId,
      customerName: held.customerName,
      cartDiscountType: held.cartDiscountType,
      cartDiscountValue: held.cartDiscountValue,
      heldCarts: updatedHeld,
    });
  },

  deleteHeldCart: (id) => {
    const updated = get().heldCarts.filter((c) => c.id !== id);
    saveHeldCarts(updated);
    set({ heldCarts: updated });
  },

  addItem: (item) =>
    set((state) => {
      const existing = state.lines.find(
        (l) => l.productId === item.productId && l.variantId === item.variantId
      );
      if (existing) {
        return {
          lines: state.lines.map((l) =>
            l.productId === item.productId && l.variantId === item.variantId
              ? { ...l, quantity: l.quantity + 1 }
              : l
          ),
        };
      }
      return { lines: [...state.lines, { ...item, quantity: 1, lineDiscount: 0 }] };
    }),

  removeItem: (productId, variantId) =>
    set((state) => ({
      lines: state.lines.filter(
        (l) => !(l.productId === productId && l.variantId === variantId)
      ),
    })),

  updateQuantity: (productId, variantId, quantity) =>
    set((state) => ({
      lines: quantity <= 0
        ? state.lines.filter((l) => !(l.productId === productId && l.variantId === variantId))
        : state.lines.map((l) =>
            l.productId === productId && l.variantId === variantId
              ? { ...l, quantity }
              : l
          ),
    })),

  updateDiscount: (productId, variantId, discount) =>
    set((state) => ({
      lines: state.lines.map((l) =>
        l.productId === productId && l.variantId === variantId
          ? { ...l, lineDiscount: Math.max(0, discount) }
          : l
      ),
    })),

  redeemedLoyaltyPoints: 0,
  redeemedLoyaltyAmount: 0,
  setLoyaltyRedemption: (points, amount) =>
    set({ redeemedLoyaltyPoints: Math.max(0, points), redeemedLoyaltyAmount: Math.max(0, amount) }),

  setCustomer: (id, name) => set({ customerId: id, customerName: name }),

  clear: () => set({
    lines: [],
    customerId: null,
    customerName: null,
    cartDiscountType: 'percent',
    cartDiscountValue: 0,
    redeemedLoyaltyPoints: 0,
    redeemedLoyaltyAmount: 0,
  }),

  subtotal: () => {
    const { lines } = get();
    return lines.reduce((sum, l) => sum + Math.max(0, l.unitPrice * l.quantity - l.lineDiscount), 0);
  },

  cartDiscountAmount: () => {
    const { cartDiscountType, cartDiscountValue, subtotal } = get();
    const sub = subtotal();
    if (sub <= 0 || cartDiscountValue <= 0) return 0;
    if (cartDiscountType === 'percent') {
      return (sub * Math.min(100, cartDiscountValue)) / 100;
    }
    return Math.min(sub, cartDiscountValue);
  },

  taxTotal: () => {
    const { lines, cartDiscountAmount, subtotal, redeemedLoyaltyAmount } = get();
    const sub = subtotal();
    const discount = cartDiscountAmount() + (redeemedLoyaltyAmount || 0);

    // Discount ratio to apply to line items
    const discountRatio = sub > 0 ? Math.max(0, sub - discount) / sub : 1;

    return lines.reduce((sum, l) => {
      const lineBase = Math.max(0, l.unitPrice * l.quantity - l.lineDiscount);
      const discountedLine = lineBase * discountRatio;
      return sum + discountedLine * l.taxRate;
    }, 0);
  },

  grandTotal: () => {
    const { subtotal, cartDiscountAmount, taxTotal, redeemedLoyaltyAmount } = get();
    return Math.max(0, subtotal() - cartDiscountAmount() - (redeemedLoyaltyAmount || 0) + taxTotal());
  },

  itemCount: () => get().lines.reduce((sum, l) => sum + l.quantity, 0),
}));
