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

interface CartState {
  lines: CartLine[];
  customerId: string | null;
  customerName: string | null;

  addItem: (item: Omit<CartLine, 'quantity' | 'lineDiscount'>) => void;
  removeItem: (productId: string, variantId: string | null) => void;
  updateQuantity: (productId: string, variantId: string | null, quantity: number) => void;
  updateDiscount: (productId: string, variantId: string | null, discount: number) => void;
  setCustomer: (id: string | null, name: string | null) => void;
  clear: () => void;

  subtotal: () => number;
  taxTotal: () => number;
  grandTotal: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartState>()((set, get) => ({
  lines: [],
  customerId: null,
  customerName: null,

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
          ? { ...l, lineDiscount: discount }
          : l
      ),
    })),

  setCustomer: (id, name) => set({ customerId: id, customerName: name }),

  clear: () => set({ lines: [], customerId: null, customerName: null }),

  subtotal: () => {
    const { lines } = get();
    return lines.reduce((sum, l) => sum + l.unitPrice * l.quantity - l.lineDiscount, 0);
  },

  taxTotal: () => {
    const { lines } = get();
    return lines.reduce(
      (sum, l) => sum + (l.unitPrice * l.quantity - l.lineDiscount) * l.taxRate,
      0
    );
  },

  grandTotal: () => {
    const { subtotal, taxTotal } = get();
    return subtotal() + taxTotal();
  },

  itemCount: () => get().lines.reduce((sum, l) => sum + l.quantity, 0),
}));
