// ============================================================================
// PAYMENT LOGOS - Componentes SVG inline para garantizar visualización
// Solución definitiva para Netlify: SVGs como componentes React
// ============================================================================

'use client';

import React from 'react';

interface LogoProps {
  className?: string;
}

// ============================================================================
// LOGO BANAMEX
// ============================================================================

export const BanamexLogo: React.FC<LogoProps> = ({ className = '' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 512 512"
    className={className}
  >
    <rect width="512" height="512" fill="#003F87"/>
    <text
      x="256"
      y="280"
      textAnchor="middle"
      fontFamily="Arial,sans-serif"
      fontWeight="bold"
      fontSize="48"
      fill="#FFFFFF"
    >
      BANAMEX
    </text>
  </svg>
);

// ============================================================================
// LOGO BBVA
// ============================================================================

export const BBVALogo: React.FC<LogoProps> = ({ className = '' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 512 512"
    className={className}
  >
    <rect width="512" height="512" fill="#004580"/>
    <text
      x="256"
      y="290"
      textAnchor="middle"
      fontFamily="Arial,sans-serif"
      fontWeight="bold"
      fontSize="72"
      fill="#FFFFFF"
    >
      BBVA
    </text>
  </svg>
);

// ============================================================================
// LOGO BINANCE
// ============================================================================

export const BinanceLogo: React.FC<LogoProps> = ({ className = '' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 512 512"
    className={className}
  >
    <rect width="512" height="512" fill="#F3BA2F"/>
    <g transform="translate(256, 200)">
      <polygon
        points="0,-30 25,-15 25,15 0,30 -25,15 -25,-15"
        fill="#000000"
      />
    </g>
    <text
      x="256"
      y="320"
      textAnchor="middle"
      fontFamily="Arial,sans-serif"
      fontWeight="bold"
      fontSize="42"
      fill="#000000"
    >
      BINANCE
    </text>
  </svg>
);

// ============================================================================
// LOGO OXXO
// ============================================================================

export const OXXOLogo: React.FC<LogoProps> = ({ className = '' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 512 512"
    className={className}
  >
    <rect width="512" height="512" fill="#E70020"/>
    <text
      x="256"
      y="290"
      textAnchor="middle"
      fontFamily="Arial,sans-serif"
      fontWeight="bold"
      fontSize="72"
      fill="#FFFFFF"
    >
      OXXO
    </text>
  </svg>
);

// ============================================================================
// HELPER: Obtener logo por ID de método de pago
// ============================================================================

export const getPaymentLogo = (methodId: string, className?: string) => {
  const logos: Record<string, React.FC<LogoProps>> = {
    'banamex': BanamexLogo,
    'bbva': BBVALogo,
    'binance': BinanceLogo,
    'oxxo': OXXOLogo
  };

  const LogoComponent = logos[methodId] || null;

  if (!LogoComponent) {
    return null;
  }

  return <LogoComponent className={className} />;
};

// ============================================================================
// COMPONENTE PRINCIPAL: PaymentLogo
// ============================================================================

interface PaymentLogoProps {
  methodId: string;
  className?: string;
  fallbackSrc?: string;
}

export const PaymentLogo: React.FC<PaymentLogoProps> = ({
  methodId,
  className = '',
  fallbackSrc
}) => {
  const logo = getPaymentLogo(methodId, className);

  if (logo) {
    return logo;
  }

  // Fallback a imagen si existe
  if (fallbackSrc) {
    return (
      <img
        src={fallbackSrc}
        alt={methodId}
        className={className}
      />
    );
  }

  return null;
};

export default PaymentLogo;
