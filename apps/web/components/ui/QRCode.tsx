'use client';

import React, { useEffect, useRef } from 'react';
import QRCodeLib from 'qrcode';

interface QRCodeProps {
  value: string;
  size?: number;
  bgColor?: string;
  fgColor?: string;
  level?: 'L' | 'M' | 'Q' | 'H';
  includeMargin?: boolean;
  className?: string;
}

/**
 * QR Code component using the qrcode library for scannable QR codes
 */
export function QRCode({
  value,
  size = 128,
  bgColor = '#FFFFFF',
  fgColor = '#000000',
  level = 'M',
  includeMargin = true,
  className = '',
}: QRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !value) {
      return;
    }

    QRCodeLib.toCanvas(canvas, value, {
      width: size,
      margin: includeMargin ? 2 : 0,
      color: {
        dark: fgColor,
        light: bgColor,
      },
      errorCorrectionLevel: level,
    }).catch((err) => {
      console.error('QR Code generation error:', err);
    });
  }, [value, size, bgColor, fgColor, level, includeMargin]);

  return <canvas ref={canvasRef} width={size} height={size} className={`rounded ${className}`} />;
}

// QR Code with download functionality
interface DownloadableQRCodeProps extends QRCodeProps {
  filename?: string;
  showDownload?: boolean;
}

export function DownloadableQRCode({
  filename = 'qrcode',
  showDownload = true,
  ...props
}: DownloadableQRCodeProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    const canvas = containerRef.current?.querySelector('canvas');
    if (!canvas) {
      return;
    }

    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div ref={containerRef} className="inline-flex flex-col items-center gap-2">
      <QRCode {...props} />
      {showDownload && (
        <button
          onClick={handleDownload}
          className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
        >
          Télécharger
        </button>
      )}
    </div>
  );
}
