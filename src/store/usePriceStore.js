import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const usePriceStore = create(
  persist(
    (set) => ({
      currentBarcode: null,
      currentProduct: null,
      pendingPrices: [],

      setBarcode: (barcode) => set({ currentBarcode: barcode }),
      setProduct: (product) => set({ currentProduct: product }),

      resetCurrent: () => set({
        currentBarcode: null,
        currentProduct: null,
      }),

      queuePrice: (priceEntry) => set((state) => ({
        pendingPrices: [...state.pendingPrices, priceEntry],
      })),

      removePendingPrice: (tempId) => set((state) => ({
        pendingPrices: state.pendingPrices.filter((p) => p.tempId !== tempId),
      })),

      clearPendingPrices: () => set({ pendingPrices: [] }),
    }),
    {
      name: 'price-scanner-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ pendingPrices: state.pendingPrices }),
    }
  )
);