import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeProps {
  value: string;
  width?: number;
  height?: number;
  format?: string;
  displayValue?: boolean;
  fontSize?: number;
  font?: string;
  margin?: number;
  className?: string;
}

export const Barcode: React.FC<BarcodeProps> = ({
  value,
  width = 2,
  height = 48,
  format = 'CODE128',
  displayValue = true,
  fontSize = 13,
  font = 'monospace',
  margin = 8,
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format,
          width,
          height,
          displayValue,
          fontSize,
          font,
          margin,
          background: 'transparent',
          lineColor: '#0f172a',
        });
      } catch (err) {
        console.error('Error al renderizar código de barras:', err);
      }
    }
  }, [value, width, height, format, displayValue, fontSize, font, margin]);

  return <svg ref={svgRef} className={className} />;
};
