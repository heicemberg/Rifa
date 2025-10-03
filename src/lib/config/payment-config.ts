// ============================================================================
// CONFIGURACIÓN DE MÉTODOS DE PAGO - RIFA SILVERADO 2024
// ============================================================================

import type { PaymentMethod, PaymentMethodType } from '../types';

// ============================================================================
// TIPOS DE CONFIGURACIÓN
// ============================================================================

interface PaymentConfig {
  development: PaymentMethod[];
  production: PaymentMethod[];
}

interface CryptoConfig {
  development: {
    binanceEmail: string;
    walletAddresses: Record<string, string>;
  };
  production: {
    binanceEmail: string;
    walletAddresses: Record<string, string>;
  };
}

// ============================================================================
// CONFIGURACIÓN DE MÉTODOS DE PAGO POR AMBIENTE
// ============================================================================

const PAYMENT_CONFIG: PaymentConfig = {
  // ✅ DESARROLLO - Datos de prueba
  development: [
    {
      id: 'banamex' as PaymentMethodType,
      name: 'Banco Banamex',
      icon: '/logos/banamex.svg',
      account: process.env.NEXT_PUBLIC_BANAMEX_ACCOUNT_DEV || '8744427',
      accountDetails: `Titular: ${process.env.NEXT_PUBLIC_BANAMEX_OWNER_DEV || 'Egleimis Ollarves'}\nCuenta: ${process.env.NEXT_PUBLIC_BANAMEX_ACCOUNT_DEV || '8744427'}\nCLABE: ${process.env.NEXT_PUBLIC_BANAMEX_CLABE_DEV || '002180702087444274'}\nBanco: Banamex`,
      enabled: true,
      qrCode: null
    },
    {
      id: 'bbva' as PaymentMethodType,
      name: 'BBVA México',
      icon: '/logos/bbva.svg',
      account: process.env.NEXT_PUBLIC_BBVA_CARD_DEV || '4152314364090798',
      accountDetails: `Titular: ${process.env.NEXT_PUBLIC_BBVA_OWNER_DEV || 'Egliskar Ollarves'}\nTarjeta: ${process.env.NEXT_PUBLIC_BBVA_CARD_DEV || '4152314364090798'}`,
      enabled: true,
      qrCode: null
    },
    {
      id: 'oxxo' as PaymentMethodType,
      name: 'OXXO',
      icon: '/logos/oxxo.svg',
      account: process.env.NEXT_PUBLIC_OXXO_REF_DEV || 'RIF-SIL-2024-001',
      accountDetails: `Referencia OXXO: ${process.env.NEXT_PUBLIC_OXXO_REF_DEV || 'RIF-SIL-2024-001'}\nMonto exacto del pago\nConserva tu comprobante`,
      enabled: true,
      qrCode: null
    },
    {
      id: 'binance' as PaymentMethodType,
      name: 'Binance Pay',
      icon: '/logos/binance.svg',
      account: process.env.NEXT_PUBLIC_BINANCE_EMAIL_DEV || 'rifadesilverado2024@gmail.com',
      accountDetails: `Email Binance Pay: ${process.env.NEXT_PUBLIC_BINANCE_EMAIL_DEV || 'rifadesilverado2024@gmail.com'}`,
      enabled: true,
      qrCode: '/premios/QR.jpg'
    }
  ],

  // 🚀 PRODUCCIÓN - Datos reales (desde variables de entorno)
  production: [
    {
      id: 'banamex' as PaymentMethodType,
      name: 'Banco Banamex',
      icon: '/logos/banamex.svg',
      account: process.env.NEXT_PUBLIC_BANAMEX_ACCOUNT_PROD || '8744427',
      accountDetails: `Titular: ${process.env.NEXT_PUBLIC_BANAMEX_OWNER_PROD || 'Egleimis Ollarves'}\nCuenta: ${process.env.NEXT_PUBLIC_BANAMEX_ACCOUNT_PROD || '8744427'}\nCLABE: ${process.env.NEXT_PUBLIC_BANAMEX_CLABE_PROD || '002180702087444274'}\nBanco: Banamex`,
      enabled: true,
      qrCode: null
    },
    {
      id: 'bbva' as PaymentMethodType,
      name: 'BBVA México',
      icon: '/logos/bbva.svg',
      account: process.env.NEXT_PUBLIC_BBVA_CARD_PROD || '4152314364090798',
      accountDetails: `Titular: ${process.env.NEXT_PUBLIC_BBVA_OWNER_PROD || 'Egliskar Ollarves'}\nTarjeta: ${process.env.NEXT_PUBLIC_BBVA_CARD_PROD || '4152314364090798'}`,
      enabled: true,
      qrCode: null
    },
    {
      id: 'oxxo' as PaymentMethodType,
      name: 'OXXO',
      icon: '/logos/oxxo.svg',
      account: process.env.NEXT_PUBLIC_OXXO_REF_PROD || '4152314364090798',
      accountDetails: `Tarjeta para pago en OXXO: ${process.env.NEXT_PUBLIC_OXXO_REF_PROD || '4152314364090798'}\nMonto exacto del pago\nConserva tu comprobante`,
      enabled: true,
      qrCode: null
    },
    {
      id: 'binance' as PaymentMethodType,
      name: 'Binance Pay',
      icon: '/logos/binance.svg',
      account: process.env.NEXT_PUBLIC_BINANCE_ID_PROD || '168868614',
      accountDetails: `Binance ID: ${process.env.NEXT_PUBLIC_BINANCE_ID_PROD || '168868614'}\nEscanea el código QR desde la app Binance`,
      enabled: true,
      qrCode: '/premios/QR.jpg'
    }
  ]
};

// ============================================================================
// CONFIGURACIÓN DE CRYPTO POR AMBIENTE
// ============================================================================

const CRYPTO_CONFIG: CryptoConfig = {
  development: {
    binanceEmail: 'rifadesilverado2024@gmail.com',
    walletAddresses: {
      BTC: process.env.NEXT_PUBLIC_BTC_WALLET_DEV || '',
      ETH: process.env.NEXT_PUBLIC_ETH_WALLET_DEV || '',
      USDT: process.env.NEXT_PUBLIC_USDT_WALLET_DEV || '',
      USDC: process.env.NEXT_PUBLIC_USDC_WALLET_DEV || '',
      SOL: process.env.NEXT_PUBLIC_SOL_WALLET_DEV || ''
    }
  },
  production: {
    binanceEmail: process.env.NEXT_PUBLIC_BINANCE_EMAIL_PROD || '',
    walletAddresses: {
      BTC: process.env.NEXT_PUBLIC_BTC_WALLET_PROD || '',
      ETH: process.env.NEXT_PUBLIC_ETH_WALLET_PROD || '',
      USDT: process.env.NEXT_PUBLIC_USDT_WALLET_PROD || '',
      USDC: process.env.NEXT_PUBLIC_USDC_WALLET_PROD || '',
      SOL: process.env.NEXT_PUBLIC_SOL_WALLET_PROD || ''
    }
  }
};

// ============================================================================
// FUNCIONES DE UTILIDAD
// ============================================================================

/**
 * Obtiene el ambiente actual
 */
export const getCurrentEnvironment = (): 'development' | 'production' => {
  return process.env.NODE_ENV === 'production' ? 'production' : 'development';
};

/**
 * Obtiene los métodos de pago según el ambiente
 */
export const getPaymentMethods = (): PaymentMethod[] => {
  const env = getCurrentEnvironment();
  const methods = PAYMENT_CONFIG[env];

  // Filtrar solo métodos habilitados
  return methods.filter(method => method.enabled);
};

/**
 * Obtiene configuración de crypto según el ambiente
 */
export const getCryptoConfig = () => {
  const env = getCurrentEnvironment();
  return CRYPTO_CONFIG[env];
};

/**
 * Valida que todas las configuraciones necesarias estén presentes
 */
export const validatePaymentConfig = (): { valid: boolean; missing: string[] } => {
  const env = getCurrentEnvironment();
  const missing: string[] = [];

  if (env === 'production') {
    // Validar variables de entorno de producción
    const requiredVars = [
      'NEXT_PUBLIC_BINANCE_ID_PROD',
      'NEXT_PUBLIC_BANAMEX_ACCOUNT_PROD',
      'NEXT_PUBLIC_BANAMEX_OWNER_PROD',
      'NEXT_PUBLIC_BANAMEX_CLABE_PROD',
      'NEXT_PUBLIC_BBVA_CARD_PROD',
      'NEXT_PUBLIC_BBVA_OWNER_PROD',
      'NEXT_PUBLIC_OXXO_REF_PROD',
      'NEXT_PUBLIC_CONTACT_PHONE_PROD'
    ];

    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        missing.push(varName);
      }
    }
  }

  return {
    valid: missing.length === 0,
    missing
  };
};

/**
 * Hook para obtener métodos de pago de forma reactiva
 */
export const usePaymentMethods = () => {
  const methods = getPaymentMethods();
  const cryptoConfig = getCryptoConfig();
  const validation = validatePaymentConfig();

  return {
    paymentMethods: methods,
    cryptoConfig,
    validation,
    environment: getCurrentEnvironment()
  };
};

// ============================================================================
// EXPORTS
// ============================================================================

export { PAYMENT_CONFIG, CRYPTO_CONFIG };
export type { PaymentConfig, CryptoConfig };