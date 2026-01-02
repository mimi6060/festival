'use client';

import React, { useEffect, useRef } from 'react';

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
 * QR Code component using canvas rendering
 * This is a lightweight implementation that doesn't require external libraries
 * For production, consider using 'qrcode' or 'qrcode.react' package
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
    if (!canvas) {return;}

    const ctx = canvas.getContext('2d');
    if (!ctx) {return;}

    // Clear canvas
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);

    // Generate QR code pattern
    // This is a simplified visualization - for real QR codes, use a proper library
    const modules = generateQRPattern(value, level);
    const moduleCount = modules.length;
    const margin = includeMargin ? 4 : 0;
    const moduleSize = size / (moduleCount + margin * 2);

    ctx.fillStyle = fgColor;

    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (modules[row][col]) {
          const x = (col + margin) * moduleSize;
          const y = (row + margin) * moduleSize;
          ctx.fillRect(x, y, moduleSize, moduleSize);
        }
      }
    }
  }, [value, size, bgColor, fgColor, level, includeMargin]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={`rounded ${className}`}
      style={{ imageRendering: 'pixelated' }}
    />
  );
}

/**
 * Simplified QR pattern generator
 * This creates a visual pattern that looks like a QR code
 * For actual scannable QR codes, use 'qrcode' library
 */
function generateQRPattern(data: string, errorLevel: string): boolean[][] {
  // Determine size based on data length
  const version = Math.max(1, Math.ceil(data.length / 10));
  const size = 21 + (version - 1) * 4;

  // Initialize empty matrix
  const matrix: boolean[][] = Array(size)
    .fill(null)
    .map(() => Array(size).fill(false));

  // Add finder patterns (the three large squares in corners)
  addFinderPattern(matrix, 0, 0);
  addFinderPattern(matrix, size - 7, 0);
  addFinderPattern(matrix, 0, size - 7);

  // Add timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Add alignment pattern for version > 1
  if (version > 1) {
    const alignPos = size - 7;
    addAlignmentPattern(matrix, alignPos, alignPos);
  }

  // Fill data area with pseudo-random pattern based on input
  const seed = hashCode(data + errorLevel);
  let rng = seed;

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (matrix[row][col] === false && !isReservedArea(row, col, size)) {
        rng = (rng * 1103515245 + 12345) & 0x7fffffff;
        matrix[row][col] = (rng % 3) === 0;
      }
    }
  }

  return matrix;
}

function addFinderPattern(matrix: boolean[][], startRow: number, startCol: number): void {
  // Outer square
  for (let i = 0; i < 7; i++) {
    matrix[startRow][startCol + i] = true;
    matrix[startRow + 6][startCol + i] = true;
    matrix[startRow + i][startCol] = true;
    matrix[startRow + i][startCol + 6] = true;
  }

  // Inner square
  for (let row = startRow + 2; row < startRow + 5; row++) {
    for (let col = startCol + 2; col < startCol + 5; col++) {
      matrix[row][col] = true;
    }
  }
}

function addAlignmentPattern(matrix: boolean[][], centerRow: number, centerCol: number): void {
  for (let row = centerRow - 2; row <= centerRow + 2; row++) {
    for (let col = centerCol - 2; col <= centerCol + 2; col++) {
      if (row < 0 || col < 0 || row >= matrix.length || col >= matrix.length) {continue;}

      const dist = Math.max(Math.abs(row - centerRow), Math.abs(col - centerCol));
      matrix[row][col] = dist === 0 || dist === 2;
    }
  }
}

function isReservedArea(row: number, col: number, size: number): boolean {
  // Finder patterns + separators
  if (row < 9 && col < 9) {return true;}
  if (row < 9 && col >= size - 8) {return true;}
  if (row >= size - 8 && col < 9) {return true;}

  // Timing patterns
  if (row === 6 || col === 6) {return true;}

  return false;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
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
    if (!canvas) {return;}

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
          Download QR Code
        </button>
      )}
    </div>
  );
}
