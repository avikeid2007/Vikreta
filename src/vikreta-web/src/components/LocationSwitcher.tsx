import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, ChevronDown } from 'lucide-react';
import { useLocationStore } from '../stores/locationStore';
import { locationsApi } from '../api/client';

export const LocationSwitcher: React.FC = () => {
  const { activeLocation, locations, setLocations, setActiveLocation } = useLocationStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: locationsData } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locationsApi.list(),
  });

  const locList = Array.isArray(locationsData)
    ? locationsData
    : ((locationsData as any)?.data ?? []);

  useEffect(() => {
    if (Array.isArray(locList) && locList.length > 0) {
      setLocations(locList);
    }
  }, [locList, setLocations]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!activeLocation) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border-2 border-teal
                   bg-teal-light text-teal-dark text-sm font-bold hover:bg-teal-light/80 transition-colors"
        id="location-switcher"
      >
        <MapPin size={13} />
        {activeLocation.name}
        <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-56 card z-50 py-1">
          <div className="px-3 py-2 text-[11px] text-ink-soft font-medium uppercase tracking-wide border-b border-line">
            Switch Location
          </div>
          {locations.map((loc) => (
            <button
              key={loc.id}
              onClick={() => { setActiveLocation(loc); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 hover:bg-paper transition-colors
                ${activeLocation.id === loc.id ? 'font-bold text-teal-dark' : 'text-ink'}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${activeLocation.id === loc.id ? 'bg-teal' : 'bg-line'}`} />
              {loc.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
