import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const usePriceStore = create(
  persist(
    (set, get) => ({
      // текущее состояние сканирования
      currentBarcode: null,
      currentProduct: null,
      
      // оффлайн-очередь (цены, сохранённые при отсутствии сети)
      pendingPrices: [],
      
      setBarcode: (barcode) => set({ currentBarcode: barcode }),
      setProduct: (product) => set({ currentProduct: product }),
      
      queuePrice: (priceEntry) => set((state) => ({
        pendingPrices: [...state.pendingPrices, priceEntry]
      })),
      
      clearPendingPrices: () => set({ pendingPrices: [] }),
      
      // удалить из очереди успешно загруженную запись
      removePendingPrice: (tempId) => set((state) => ({
        pendingPrices: state.pendingPrices.filter(p => p.tempId !== tempId)
      })),
    }),
    {
      name: 'price-scanner-storage', // ключ в localStorage
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ pendingPrices: state.pendingPrices }),
    }
  )
);