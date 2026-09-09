import React from 'react';

interface MoneyInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  className?: string;
  min?: number;
  disabled?: boolean;
  id?: string;
}

export const MoneyInput: React.FC<MoneyInputProps> = ({
  value,
  onChange,
  label,
  className = '',
  min = 0,
  disabled,
  id,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseFloat(e.target.value);
    if (!isNaN(raw) && raw >= min) onChange(raw);
  };

  return (
    <div className={className}>
      {label && <label htmlFor={id} className="block text-xs font-medium text-ink-soft mb-1">{label}</label>}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft text-sm font-mono">₹</span>
        <input
          id={id}
          type="number"
          step="0.01"
          min={min}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          className="input pl-7 font-mono"
        />
      </div>
    </div>
  );
};

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

export const QuantityStepper: React.FC<QuantityStepperProps> = ({
  value,
  onChange,
  min = 0,
  max = 9999,
  className = '',
}) => (
  <div className={`flex items-center gap-1 ${className}`}>
    <button
      onClick={() => onChange(Math.max(min, value - 1))}
      disabled={value <= min}
      className="w-7 h-7 flex items-center justify-center rounded border-2 border-ink
                 font-bold text-sm hover:bg-paper-alt disabled:opacity-40 transition-colors"
    >
      −
    </button>
    <span className="font-mono font-bold text-sm w-8 text-center">{value}</span>
    <button
      onClick={() => onChange(Math.min(max, value + 1))}
      disabled={value >= max}
      className="w-7 h-7 flex items-center justify-center rounded border-2 border-ink
                 font-bold text-sm hover:bg-paper-alt disabled:opacity-40 transition-colors"
    >
      +
    </button>
  </div>
);

interface DateRangePickerProps {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ from, to, onFromChange, onToChange }) => {
  const setPreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    onFromChange(start.toISOString().split('T')[0]);
    onToChange(end.toISOString().split('T')[0]);
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <label className="text-xs text-ink-soft font-medium">From</label>
        <input type="date" value={from} onChange={(e) => onFromChange(e.target.value)} className="input-soft text-sm py-1.5" />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-ink-soft font-medium">To</label>
        <input type="date" value={to} onChange={(e) => onToChange(e.target.value)} className="input-soft text-sm py-1.5" />
      </div>
      <div className="flex items-center gap-1">
        {[
          { label: 'Today', days: 0 },
          { label: '7d', days: 7 },
          { label: '30d', days: 30 },
        ].map(({ label, days }) => (
          <button
            key={label}
            onClick={() => setPreset(days)}
            className="px-2.5 py-1 text-xs font-bold border-2 border-line rounded-lg hover:border-teal hover:text-teal-dark transition-colors"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};
