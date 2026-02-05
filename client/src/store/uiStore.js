import { create } from 'zustand';

const useUiStore = create((set) => ({
  theme: 'dark',
  setTheme: (theme) => set({ theme }),
}));

export default useUiStore;
