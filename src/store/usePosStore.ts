import { create } from 'zustand';
import type { User, Soldier, ProductCatalog, OrderItem, Shift, PaymentMethod } from '../types/schema.ts';
import { calculateCartTotals } from '../types/schema.ts';

export interface CartItem extends OrderItem {
  product_name: string;
  category: string;
  unit_name?: string;
  image_url?: string;
  conversion_factor: number;
  parent_barcode?: string;
  seller_name?: string;
}

export interface PartyParticipant {
  soldier: Soldier;
  splitType: 'EQUAL' | 'FIXED' | 'PERCENT';
  amountAssigned: number;
  percentage: number;
  paymentMethod: PaymentMethod;
  transferConfirmed: boolean;
  cashReceived: number;
  cashChange: number;
  isPaid: boolean;
}

interface PosState {
  // Session & Auth
  currentUser: User | null;
  activeBatchId: string;
  isOnline: boolean;
  setCurrentUser: (user: User | null) => void;
  setActiveBatchId: (batchId: string) => void;
  setIsOnline: (online: boolean) => void;

  // Active Shift
  activeShift: Shift | null;
  setActiveShift: (shift: Shift | null) => void;

  // POS Cart
  cart: CartItem[];
  primaryBuyer: (Soldier & { remaining_credit?: number; cash_balance?: number }) | null;
  isPartyMode: boolean;
  partySplitMode: 'EQUAL' | 'FIXED' | 'PERCENT';
  partyParticipants: PartyParticipant[];
  
  setPrimaryBuyer: (soldier: (Soldier & { remaining_credit?: number; cash_balance?: number }) | null) => void;
  addToCart: (product: ProductCatalog, qty?: number) => void;
  removeFromCart: (barcode: string) => void;
  updateQuantity: (barcode: string, qty: number) => void;
  clearCart: () => void;
  
  // Party Split Actions
  togglePartyMode: (active?: boolean) => void;
  setPartySplitMode: (mode: 'EQUAL' | 'FIXED' | 'PERCENT') => void;
  addPartyParticipant: (soldier: Soldier) => void;
  removePartyParticipant: (pxCode: string) => void;
  setPartyHost: (pxCode: string) => void;
  updateParticipantAmount: (pxCode: string, amount: number) => void;
  updateParticipantPercentage: (pxCode: string, pct: number) => void;
  updateParticipantPayment: (pxCode: string, method: PaymentMethod, transferConfirmed?: boolean, cashReceived?: number) => void;
  recalculatePartySplits: (customNetTotal?: number) => void;

  // Totals
  totals: {
    totalGross: number;
    discountTotal: number;
    netPayable: number;
  };
}

export const usePosStore = create<PosState>((set, get) => ({
  currentUser: null,
  activeBatchId: '2569_1',
  isOnline: navigator.onLine,
  setCurrentUser: (user) => set({ currentUser: user }),
  setActiveBatchId: (batchId) => set({ activeBatchId: batchId }),
  setIsOnline: (online) => set({ isOnline: online }),

  activeShift: null,
  setActiveShift: (shift) => set({ activeShift: shift }),

  cart: [],
  primaryBuyer: null,
  isPartyMode: false,
  partySplitMode: 'EQUAL',
  partyParticipants: [],
  totals: { totalGross: 0, discountTotal: 0, netPayable: 0 },

  setPrimaryBuyer: (soldier) => {
    set({ primaryBuyer: soldier });
    // If party mode active and no host participant yet, auto add host
    const { isPartyMode, partyParticipants, totals } = get();
    if (isPartyMode && soldier) {
      const exists = partyParticipants.some(p => p.soldier.px_code === soldier.px_code);
      if (!exists) {
        const hostParticipant: PartyParticipant = {
          soldier,
          splitType: 'EQUAL',
          amountAssigned: totals.netPayable,
          percentage: 100,
          paymentMethod: 'CREDIT',
          transferConfirmed: false,
          cashReceived: 0,
          cashChange: 0,
          isPaid: false
        };
        set({ partyParticipants: [hostParticipant, ...partyParticipants] });
        get().recalculatePartySplits();
      }
    }
  },

  addToCart: (product, qty = 1) => {
    const { cart } = get();
    const existingIndex = cart.findIndex((i) => i.barcode === product.barcode);

    let newCart: CartItem[];
    if (existingIndex > -1) {
      newCart = cart.map((item, idx) => {
        if (idx === existingIndex) {
          const newActual = item.actual_qty + qty;
          const newCharged = item.charged_qty + qty;
          const subtotal = newCharged * item.unit_price - item.discount_amount;
          return {
            ...item,
            actual_qty: newActual,
            charged_qty: newCharged,
            subtotal
          };
        }
        return item;
      });
    } else {
      const newItem: CartItem = {
        item_id: `ITEM-${Date.now()}-${cart.length + 1}`,
        order_id: '',
        barcode: product.barcode,
        product_name: product.product_name,
        category: product.category,
        unit_name: product.unit_name,
        image_url: product.image_url,
        conversion_factor: product.conversion_factor || 1,
        parent_barcode: product.parent_barcode,
        actual_qty: qty,
        charged_qty: qty,
        cost_price_at_sale: Number(product.cost_price) || 0,
        unit_price: product.selling_price,
        discount_amount: 0,
        subtotal: qty * product.selling_price,
        seller_id: product.seller_id || 'S01',
        is_voided: false
      };
      newCart = [...cart, newItem];
    }

    const calculatedTotals = calculateCartTotals(newCart);
    set({ cart: newCart, totals: calculatedTotals });
    if (get().isPartyMode) {
      get().recalculatePartySplits();
    }
  },

  removeFromCart: (barcode) => {
    const newCart = get().cart.filter((i) => i.barcode !== barcode);
    const calculatedTotals = calculateCartTotals(newCart);
    set({ cart: newCart, totals: calculatedTotals });
    if (get().isPartyMode) {
      get().recalculatePartySplits();
    }
  },

  updateQuantity: (barcode, qty) => {
    if (qty <= 0) {
      get().removeFromCart(barcode);
      return;
    }
    const newCart = get().cart.map((item) => {
      if (item.barcode === barcode) {
        return {
          ...item,
          actual_qty: qty,
          charged_qty: qty,
          subtotal: qty * item.unit_price - item.discount_amount
        };
      }
      return item;
    });
    const calculatedTotals = calculateCartTotals(newCart);
    set({ cart: newCart, totals: calculatedTotals });
    if (get().isPartyMode) {
      get().recalculatePartySplits();
    }
  },

  clearCart: () => {
    set({
      cart: [],
      primaryBuyer: null,
      isPartyMode: false,
      partySplitMode: 'EQUAL',
      partyParticipants: [],
      totals: { totalGross: 0, discountTotal: 0, netPayable: 0 }
    });
  },

  togglePartyMode: (active) => {
    const isParty = active !== undefined ? active : !get().isPartyMode;
    const { primaryBuyer, totals } = get();
    let initialParticipants: PartyParticipant[] = [];

    if (isParty && primaryBuyer) {
      initialParticipants = [{
        soldier: primaryBuyer,
        splitType: 'EQUAL',
        amountAssigned: totals.netPayable,
        percentage: 100,
        paymentMethod: 'CREDIT',
        transferConfirmed: false,
        cashReceived: 0,
        cashChange: 0,
        isPaid: false
      }];
    }

    set({ 
      isPartyMode: isParty,
      partyParticipants: isParty ? initialParticipants : []
    });
    if (isParty) {
      get().recalculatePartySplits();
    }
  },

  setPartySplitMode: (mode) => {
    set({ partySplitMode: mode });
    get().recalculatePartySplits();
  },

  addPartyParticipant: (soldier) => {
    const { partyParticipants, primaryBuyer } = get();
    if (partyParticipants.some(p => p.soldier.px_code === soldier.px_code)) return;

    const newParticipant: PartyParticipant = {
      soldier,
      splitType: get().partySplitMode,
      amountAssigned: 0,
      percentage: 0,
      paymentMethod: 'CREDIT',
      transferConfirmed: false,
      cashReceived: 0,
      cashChange: 0,
      isPaid: false
    };

    const nextParticipants = [...partyParticipants, newParticipant];
    set({ 
      partyParticipants: nextParticipants,
      primaryBuyer: primaryBuyer || nextParticipants[0].soldier
    });
    get().recalculatePartySplits();
  },

  removePartyParticipant: (pxCode) => {
    const { partyParticipants } = get();
    const remaining = partyParticipants.filter(p => p.soldier.px_code !== pxCode);
    set({ 
      partyParticipants: remaining,
      primaryBuyer: remaining.length > 0 ? remaining[0].soldier : null
    });
    get().recalculatePartySplits();
  },

  setPartyHost: (pxCode) => {
    const { partyParticipants } = get();
    const target = partyParticipants.find(p => p.soldier.px_code === pxCode);
    if (!target) return;
    const others = partyParticipants.filter(p => p.soldier.px_code !== pxCode);
    const reordered = [target, ...others];
    set({
      partyParticipants: reordered,
      primaryBuyer: target.soldier
    });
    get().recalculatePartySplits();
  },

  updateParticipantAmount: (pxCode, amount) => {
    const { partyParticipants } = get();
    const updated = partyParticipants.map(p => {
      if (p.soldier.px_code === pxCode) {
        return { ...p, amountAssigned: Math.max(0, amount), splitType: 'FIXED' as const };
      }
      return p;
    });
    set({ partyParticipants: updated });
  },

  updateParticipantPercentage: (pxCode, pct) => {
    const { partyParticipants, totals } = get();
    const updated = partyParticipants.map(p => {
      if (p.soldier.px_code === pxCode) {
        const amt = Number(((pct / 100) * totals.netPayable).toFixed(2));
        return { ...p, percentage: pct, amountAssigned: amt, splitType: 'PERCENT' as const };
      }
      return p;
    });
    set({ partyParticipants: updated });
  },

  updateParticipantPayment: (pxCode, method, transferConfirmed = false, cashReceived = 0) => {
    const { partyParticipants } = get();
    const updated = partyParticipants.map(p => {
      if (p.soldier.px_code === pxCode) {
        const change = method === 'CASH' ? Math.max(0, cashReceived - p.amountAssigned) : 0;
        return {
          ...p,
          paymentMethod: method,
          transferConfirmed: method === 'TRANSFER' ? transferConfirmed : true,
          cashReceived,
          cashChange: change
        };
      }
      return p;
    });
    set({ partyParticipants: updated });
  },

  /**
   * Recalculates Party Splits with automatic penny allocation to Host/First member
   */
  recalculatePartySplits: (customNetTotal?: number) => {
    const { partyParticipants, partySplitMode, totals } = get();
    const total = customNetTotal !== undefined ? customNetTotal : totals.netPayable;
    const count = partyParticipants.length;

    if (count === 0 || total <= 0) return;

    if (partySplitMode === 'EQUAL') {
      // Divide equally in cents
      const baseShare = Math.floor((total / count) * 100) / 100;
      let remainder = Number((total - (baseShare * count)).toFixed(2));

      const updated = partyParticipants.map((p, idx) => {
        // Host (index 0) takes the remainder fraction to guarantee exactly 100% total
        const allocated = idx === 0 ? Number((baseShare + remainder).toFixed(2)) : baseShare;
        const pct = Number(((allocated / total) * 100).toFixed(1));
        return {
          ...p,
          splitType: 'EQUAL' as const,
          amountAssigned: allocated,
          percentage: pct
        };
      });
      set({ partyParticipants: updated });
    } else if (partySplitMode === 'PERCENT') {
      const equalPct = Number((100 / count).toFixed(1));
      let currentTotalAssigned = 0;
      const updated = partyParticipants.map((p, idx) => {
        const pct = p.percentage > 0 ? p.percentage : (idx === count - 1 ? 100 - currentTotalAssigned : equalPct);
        const amt = Number(((pct / 100) * total).toFixed(2));
        currentTotalAssigned += amt;
        return {
          ...p,
          splitType: 'PERCENT' as const,
          percentage: pct,
          amountAssigned: amt
        };
      });
      set({ partyParticipants: updated });
    }
  }
}));

