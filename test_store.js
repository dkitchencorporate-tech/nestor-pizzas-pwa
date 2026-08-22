import { createStore } from 'zustand/vanilla'

const store = createStore((set, get) => ({
  items: [{ id: '1', price: 8.5, quantity: 1 }],
  updatePrice: (id, price) => set((state) => ({
    items: state.items.map((item) => 
      item.id === id ? { ...item, price } : item
    )
  })),
  getTotal: () => get().items.reduce((total, item) => total + (item.price * item.quantity), 0)
}))

console.log("Initial total:", store.getState().getTotal())
store.getState().updatePrice('1', 9)
console.log("After update total:", store.getState().getTotal())
