// Mock for react-native-qrcode-svg
import React from 'react';

interface QRCodeProps {
  value: string;
  size?: number;
  color?: string;
  backgroundColor?: string;
}

const QRCode: React.FC<QRCodeProps> = ({ value, size = 100 }) => {
  return React.createElement('View', { testID: 'qr-code', value, size });
};

export default QRCode;
