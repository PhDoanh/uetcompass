import { create } from 'zustand';

const useAccountSettingsStore = create((set) => ({
  loading: false,
  error: '',
  success: '',
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSuccess: (success) => set({ success }),
  resetStatus: () => set({ error: '', success: '' }),
}));

export default useAccountSettingsStore;
