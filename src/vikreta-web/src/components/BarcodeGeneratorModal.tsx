import React, { useState } from 'react';
import { X, Printer, Barcode, CheckSquare, Square } from 'lucide-react';
import { BarcodeLabel } from './BarcodeLabel';

export interface BarcodeProduct {
  id?: string;
  name: string;
  sku: string;
  barcode?: string;
  defaultPrice?: number;
}

interface BarcodeGeneratorModalProps {
  isOpen?: boolean;
  onClose: () => void;
  product?: BarcodeProduct | null;
  productsList?: BarcodeProduct[];
}

export const BarcodeGeneratorModal: React.FC<BarcodeGeneratorModalProps> = ({
  isOpen = true,
  onClose,
  product,
  productsList = [],
}) => {
  const [selectedProduct, setSelectedProduct] = useState<BarcodeProduct | null>(product || productsList[0] || null);
  const [copies, setCopies] = useState<number>(24);
  const [layout, setLayout] = useState<'a4-24' | 'a4-30' | 'a4-40' | 'thermal'>('a4-24');
  const [showStoreName, setShowStoreName] = useState(true);
  const [showProductName, setShowProductName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showBarcodeText, setShowBarcodeText] = useState(true);

  if (!isOpen) return null;

  const currentProd = selectedProduct || product;
  if (!currentProd) return null;

  const storeName = localStorage.getItem('store_upi_name') || 'Vikreta Retail';

  const sheetSizes = {
    'a4-24': { name: 'A4 Sheet (24-Up · 3×8)', count: 24, grid: 'grid-cols-3', w: '70mm', h: '37mm' },
    'a4-30': { name: 'A4 Sheet (30-Up · 3×10)', count: 30, grid: 'grid-cols-3', w: '70mm', h: '29.7mm' },
    'a4-40': { name: 'A4 Sheet (40-Up · 4×10)', count: 40, grid: 'grid-cols-4', w: '52.5mm', h: '29.7mm' },
    'thermal': { name: 'Thermal Roll (50×25mm Single)', count: 1, grid: 'grid-cols-1 max-w-[240px]', w: '50mm', h: '25mm' },
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white border-2 border-ink rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-paper-alt">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-marigold-light rounded-lg text-ink">
              <Barcode size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink">Barcode Label Generator & Sheet Printing</h2>
              <p className="text-xs text-ink-soft">
                Print barcode stickers for standard A4 adhesive sheets or thermal label rolls
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-ink-soft hover:text-ink">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body: Controls & Live Preview */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left: Settings Panel */}
          <div className="w-full md:w-80 p-5 border-r border-line bg-paper overflow-y-auto space-y-4">
            {/* Product Selector (if multiple available) */}
            {productsList.length > 1 && (
              <div>
                <label className="block text-xs font-bold text-ink mb-1">Select Product</label>
                <select
                  value={selectedProduct?.id}
                  onChange={(e) => {
                    const p = productsList.find((item) => item.id === e.target.value);
                    if (p) setSelectedProduct(p);
                  }}
                  className="input text-xs w-full"
                >
                  {productsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Layout Picker */}
            <div>
              <label className="block text-xs font-bold text-ink mb-1">Sheet Format / Printer Type</label>
              <select
                value={layout}
                onChange={(e) => {
                  const newLayout = e.target.value as any;
                  setLayout(newLayout);
                  if (newLayout !== 'thermal') {
                    setCopies(sheetSizes[newLayout as keyof typeof sheetSizes].count);
                  }
                }}
                className="input text-xs w-full font-medium"
              >
                <option value="a4-24">A4 Sheet — 24 Labels (3 × 8 · 70×37mm)</option>
                <option value="a4-30">A4 Sheet — 30 Labels (3 × 10 · 70×29.7mm)</option>
                <option value="a4-40">A4 Sheet — 40 Labels (4 × 10 · 52.5×29.7mm)</option>
                <option value="thermal">Thermal Roll Label (50 × 25mm / 2"×1")</option>
              </select>
            </div>

            {/* Copies Count */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-ink">Total Labels to Print</label>
                <button
                  type="button"
                  onClick={() => setCopies(sheetSizes[layout].count)}
                  className="text-[10px] text-teal-dark hover:underline font-bold"
                >
                  Fill Sheet ({sheetSizes[layout].count})
                </button>
              </div>
              <input
                type="number"
                min="1"
                max="200"
                value={copies}
                onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                className="input text-xs font-mono w-full"
              />
            </div>

            {/* Label Elements Toggles */}
            <div className="space-y-2 pt-2 border-t border-line">
              <label className="block text-xs font-bold text-ink mb-1">Sticker Content</label>
              {[
                { label: 'Store Name Header', val: showStoreName, set: setShowStoreName },
                { label: 'Product Name', val: showProductName, set: setShowProductName },
                { label: 'MRP / Price (₹)', val: showPrice, set: setShowPrice },
                { label: 'Barcode Text (Digits)', val: showBarcodeText, set: setShowBarcodeText },
              ].map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => item.set(!item.val)}
                  className="flex items-center gap-2 text-xs text-ink hover:text-teal-dark transition-colors w-full text-left"
                >
                  {item.val ? (
                    <CheckSquare size={15} className="text-teal-dark flex-shrink-0" />
                  ) : (
                    <Square size={15} className="text-ink-soft flex-shrink-0" />
                  )}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-line space-y-2">
              <button
                onClick={handlePrint}
                className="btn-primary w-full justify-center py-2.5 shadow-sm text-sm"
              >
                <Printer size={15} /> Print {copies} Sticker{copies > 1 ? 's' : ''}
              </button>
              <button onClick={onClose} className="btn-secondary w-full justify-center text-xs">
                Cancel
              </button>
            </div>
          </div>

          {/* Right: Live Sheet Preview */}
          <div className="flex-1 p-5 bg-paper-alt/60 overflow-y-auto flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-ink-soft uppercase tracking-wider">
                Live Sheet Preview ({copies} Labels · {sheetSizes[layout].name})
              </span>
              <span className="text-[11px] text-ink-soft">
                SKU: <strong className="font-mono text-ink">{currentProd.sku}</strong> · Code: <strong className="font-mono text-ink">{currentProd.barcode || currentProd.sku}</strong>
              </span>
            </div>

            {/* Printable Sheet Container */}
            <div className="bg-white border border-line shadow-md p-4 w-full max-w-2xl rounded-lg printable-barcode-sheet">
              <div className={`grid ${sheetSizes[layout].grid} gap-2`}>
                {Array.from({ length: copies }).map((_, idx) => (
                  <BarcodeLabel
                    key={idx}
                    storeName={storeName}
                    productName={currentProd.name}
                    sku={currentProd.sku}
                    barcode={currentProd.barcode || currentProd.sku}
                    price={currentProd.defaultPrice}
                    layout={layout}
                    showStoreName={showStoreName}
                    showProductName={showProductName}
                    showPrice={showPrice}
                    showBarcodeText={showBarcodeText}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
