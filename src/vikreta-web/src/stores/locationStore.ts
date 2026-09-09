import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LocationOption {
  id: string;
  name: string;
  address: string;
  timeZone: string;
}

interface LocationState {
  activeLocation: LocationOption | null;
  locations: LocationOption[];
  setLocations: (locations: LocationOption[]) => void;
  setActiveLocation: (location: LocationOption) => void;
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      activeLocation: null,
      locations: [],

      setLocations: (locations) =>
        set((state) => ({
          locations,
          activeLocation: state.activeLocation ?? locations[0] ?? null,
        })),

      setActiveLocation: (location) => set({ activeLocation: location }),
    }),
    {
      name: 'vikreta-location',
    }
  )
);
