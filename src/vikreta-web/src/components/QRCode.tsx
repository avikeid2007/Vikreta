import React, { useMemo } from 'react';
import QRCode from 'qrcode';

export interface QRCodeSVGProps {
  value: string;
  size?: number;
  fgColor?: string;
  bgColor?: string;
  level?: 'L' | 'M' | 'Q' | 'H';
  includeMargin?: boolean;
  className?: string;
}

export const QRCodeSVG: React.FC<QRCodeSVGProps> = ({
  value,
  size = 130,
  fgColor = '#000000',
  bgColor = '#ffffff',
  level = 'M',
  includeMargin = true,
  className = '',
}) => {
  const { path, totalCells } = useMemo(() => {
    if (!value) return { path: '', totalCells: 0 };
    try {
      const qr = QRCode.create(value, { errorCorrectionLevel: level });
      const margin = includeMargin ? 4 : 0;
      const numCells = qr.modules.size;
      const total = numCells + margin * 2;
      let d = '';

      for (let r = 0; r < numCells; r++) {
        for (let c = 0; c < numCells; c++) {
          if (qr.modules.get(r, c)) {
            d += `M${c + margin} ${r + margin}h1v1h-1z `;
          }
        }
      }

      return { path: d, totalCells: total };
    } catch (err) {
      console.error('Failed to generate QR Code:', err);
      return { path: '', totalCells: 0 };
    }
  }, [value, level, includeMargin]);

  if (!path || totalCells === 0) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`flex items-center justify-center bg-paper-alt text-ink-soft text-xs border border-line ${className}`}
      >
        QR Error
      </div>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${totalCells} ${totalCells}`}
      width={size}
      height={size}
      className={className}
      shapeRendering="crispEdges"
      style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
    >
      <rect width={totalCells} height={totalCells} fill={bgColor} />
      <path d={path} fill={fgColor} />
    </svg>
  );
};
