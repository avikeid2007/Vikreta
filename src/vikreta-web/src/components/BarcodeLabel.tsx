import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

export interface BarcodeLabelProps {
  storeName?: string;
  productName: string;
  sku?: string;
  barcode: string;
  price?: number;
  layout?: 'a4-24' | 'a4-30' | 'a4-40' | 'thermal';
  showStoreName?: boolean;
  showProductName?: boolean;
  showPrice?: boolean;
  showBarcodeText?: boolean;
}

export const BarcodeLabel: React.FC<BarcodeLabelProps> = ({
  storeName = 'Vikreta Retail',
  productName,
  sku,
  barcode,
  price,
  layout = 'a4-24',
  showStoreName = true,
  showProductName = true,
  showPrice = true,
  showBarcodeText = true,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const code = barcode?.trim() || sku?.trim() || '100001';
    try {
      JsBarcode(svgRef.current, code, {
        format: 'CODE128',
        width: layout === 'thermal' ? 1.8 : 1.3,
        height: layout === 'a4-40' ? 22 : layout === 'thermal' ? 34 : 28,
        displayValue: showBarcodeText,
        fontSize: 10,
        font: 'monospace',
        margin: 2,
        background: '#ffffff',
        lineColor: '#000000',
      });
    } catch {
      // Fallback
    }
  }, [barcode, sku, layout, showBarcodeText]);

  return (
    <div className={`barcode-sticker barcode-sticker-${layout} border border-dashed border-gray-300 p-1.5 bg-white flex flex-col items-center justify-between text-center overflow-hidden rounded`}>
      {showStoreName && (
        <p className="text-[10px] font-bold text-gray-800 uppercase tracking-wider truncate w-full">
          {storeName}
        </p>
      )}
      {showProductName && (
        <p className="text-[11px] font-semibold text-gray-900 leading-tight truncate w-full px-1" title={productName}>
          {productName}
        </p>
      )}
      <div className="my-0.5 flex items-center justify-center max-w-full overflow-hidden">
        <svg ref={svgRef} className="max-w-full h-auto" />
      </div>
      {showPrice && price !== undefined && (
        <p className="text-[11px] font-mono font-extrabold text-gray-900">
          MRP: ₹{price.toFixed(2)}
        </p>
      )}
    </div>
  );
};
