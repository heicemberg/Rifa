// ============================================================================
// CONSTANTES PARA SISTEMA DE RIFA DE CAMIONETA EN MÉXICO
// ============================================================================

import type {
  QuickSelectOption,
  PaymentMethod,
  PaymentMethodType,
  AdminConfig,
  ThemeColors
} from './types';

// ============================================================================
// CONFIGURACIÓN GENERAL DE LA RIFA
// ============================================================================

/** Total de tickets disponibles */
export const TOTAL_TICKETS = 10000;

/** Precio por ticket en pesos mexicanos */
export const TICKET_PRICE = 250;

/** Tiempo de reserva en minutos */
export const RESERVATION_TIME = 30;

/** Tiempo de reserva en milisegundos */
export const RESERVATION_TIME_MS = RESERVATION_TIME * 60 * 1000;

// ============================================================================
// OPCIONES DE SELECCIÓN RÁPIDA
// ============================================================================

// ✅ CARDS PRINCIPALES: Sin descuentos (precio completo) - 6 cards
export const MAIN_CARD_OPTIONS: QuickSelectOption[] = [
  {
    tickets: 2,
    price: 500,      // Sin descuento: 2 × $250 = $500
    discount: 0,
    popular: false
  },
  {
    tickets: 5,
    price: 1250,     // Sin descuento: 5 × $250 = $1,250
    discount: 0,
    popular: false
  },
  {
    tickets: 10,
    price: 2500,     // Sin descuento: 10 × $250 = $2,500
    discount: 0,
    popular: true
  },
  {
    tickets: 25,
    price: 6250,     // Sin descuento: 25 × $250 = $6,250
    discount: 0,
    popular: false
  },
  {
    tickets: 50,
    price: 12500,    // Sin descuento: 50 × $250 = $12,500
    discount: 0,
    popular: false
  },
  {
    tickets: 100,
    price: 25000,    // Sin descuento: 100 × $250 = $25,000
    discount: 0,
    popular: false
  }
];

// ✅ MODAL OPTIONS: Con descuentos por volumen (máximo 30%)
export const QUICK_SELECT_OPTIONS: QuickSelectOption[] = [
  {
    tickets: 2,
    price: 500,      // Sin descuento: 2 × $250 = $500
    discount: 0,
    popular: false
  },
  {
    tickets: 5,
    price: 1188,     // 5% descuento: $1,250 - $62 = $1,188
    discount: 5,
    popular: false
  },
  {
    tickets: 10,
    price: 2250,     // 10% descuento: $2,500 - $250 = $2,250
    discount: 10,
    popular: true
  },
  {
    tickets: 25,
    price: 5313,     // 15% descuento: $6,250 - $937 = $5,313
    discount: 15,
    popular: false
  },
  {
    tickets: 50,
    price: 10000,    // 20% descuento: $12,500 - $2,500 = $10,000
    discount: 20,
    popular: false
  },
  {
    tickets: 100,
    price: 17500,    // 30% descuento: $25,000 - $7,500 = $17,500
    discount: 30,
    popular: false
  }
];

// ============================================================================
// MÉTODOS DE PAGO DISPONIBLES EN MÉXICO
// ============================================================================

// ⚠️ DEPRECATED: Los métodos de pago ahora se obtienen dinámicamente desde payment-config.ts
// Esta constante se mantiene para compatibilidad pero se recomienda usar getPaymentMethods()

export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'binance' as PaymentMethodType,
    name: 'Binance Pay',
    icon: '/logos/binance.svg',
    account: '168868614',
    accountDetails: 'Binance ID: 168868614\nEscanea el código QR desde la app Binance',
    enabled: true
  },
  {
    id: 'banamex' as PaymentMethodType,
    name: 'Banco Banamex',
    icon: '/logos/banamex.svg',
    account: '8744427',
    accountDetails: 'Titular: Egleimis Ollarves\nCuenta: 8744427\nCLABE: 002180702087444274\nBanco: Banamex',
    enabled: true
  },
  {
    id: 'bbva' as PaymentMethodType,
    name: 'BBVA México',
    icon: '/logos/bbva.svg',
    account: '4152314364090798',
    accountDetails: 'Titular: Egliskar Ollarves\nTarjeta: 4152314364090798',
    enabled: true
  },
  {
    id: 'oxxo' as PaymentMethodType,
    name: 'OXXO',
    icon: '/logos/oxxo.png',
    account: '4152314364090798',
    accountDetails: 'Tarjeta para pago en OXXO: 4152314364090798\nMonto exacto del pago\nConserva tu comprobante',
    enabled: true
  }
];

// ============================================================================
// NOMBRES MEXICANOS PARA ACTIVIDAD EN TIEMPO REAL
// ============================================================================

// Nombres completos para actividad más realista
export const MEXICAN_FIRST_NAMES = [
  'José', 'Luis', 'Juan', 'Miguel', 'Carlos', 'Fernando', 'Jorge', 'Alejandro',
  'María', 'Guadalupe', 'Rosa', 'Ana', 'Carmen', 'Patricia', 'Sandra', 'Leticia',
  'Francisco', 'Roberto', 'Ricardo', 'Eduardo', 'Raúl', 'Jesús', 'Daniel', 'Pedro',
  'Juana', 'Teresa', 'Gloria', 'Esperanza', 'Julia', 'Irma', 'Silvia', 'Martha',
  'Antonio', 'Arturo', 'Armando', 'Alberto', 'Andrés', 'Ángel', 'Adrián', 'Agustín',
  'Beatriz', 'Blanca', 'Bertha', 'Brenda', 'Bárbara', 'Claudia', 'Cristina', 'Carolina',
  'Diego', 'David', 'Emilio', 'Edgar', 'Enrique', 'Ernesto', 'Esteban', 'Erika',
  'Gabriela', 'Graciela', 'Gustavo', 'Guillermo', 'Hugo', 'Héctor', 'Ignacio', 'Isabel',
  'Jaime', 'Javier', 'Jonathan', 'Julián', 'Karina', 'Laura', 'Lucía', 'Lorena',
  'Manuel', 'Marco', 'Martín', 'Mauricio', 'Mónica', 'Nancy', 'Norma', 'Octavio',
  'Oscar', 'Pablo', 'Paulo', 'Rafael', 'Ramón', 'Raquel', 'Rubén', 'Salvador',
  'Sergio', 'Susana', 'Sofía', 'Verónica', 'Vicente', 'Víctor', 'Yolanda', 'Ximena'
];

export const MEXICAN_SURNAMES = [
  'González', 'García', 'Rodríguez', 'Hernández', 'López', 'Martínez', 'Pérez', 'Sánchez',
  'Ramírez', 'Torres', 'Flores', 'Rivera', 'Gómez', 'Díaz', 'Cruz', 'Morales',
  'Reyes', 'Gutiérrez', 'Ortiz', 'Chávez', 'Ruiz', 'Vásquez', 'Castillo', 'Jiménez',
  'Vargas', 'Ramos', 'Mendoza', 'Aguilar', 'Contreras', 'Medina', 'Luna', 'Moreno',
  'Alvarez', 'Acosta', 'Alvarado', 'Ayala', 'Bautista', 'Cabrera', 'Campos', 'Cárdenas',
  'Cervantes', 'Cortés', 'Delgado', 'Domínguez', 'Espinoza', 'Estrada', 'Figueroa', 'Fuentes',
  'Galván', 'Guerrero', 'Herrera', 'Ibarra', 'Lara', 'Ledesma', 'Maldonado', 'Miranda',
  'Montoya', 'Muñoz', 'Navarro', 'Núñez', 'Ochoa', 'Padilla', 'Palacios', 'Paredes',
  'Peña', 'Quintero', 'Robles', 'Romero', 'Salazar', 'Silva', 'Solís', 'Téllez',
  'Valdez', 'Valencia', 'Vega', 'Velasco', 'Villa', 'Villanueva', 'Zamora', 'Zúñiga'
];

// Para compatibilidad con código existente
export const MEXICAN_NAMES: string[] = MEXICAN_FIRST_NAMES.map((name, index) => {
  const surname = MEXICAN_SURNAMES[index % MEXICAN_SURNAMES.length];
  return `${name} ${surname.charAt(0)}.`;
});

// ============================================================================
// CIUDADES MEXICANAS PRINCIPALES
// ============================================================================

export const MEXICAN_CITIES: string[] = [
  'Ciudad de México',
  'Guadalajara, Jalisco',
  'Monterrey, Nuevo León',
  'Puebla, Puebla',
  'Tijuana, Baja California',
  'León, Guanajuato',
  'Juárez, Chihuahua',
  'Torreón, Coahuila',
  'Querétaro, Querétaro',
  'San Luis Potosí, San Luis Potosí',
  'Mérida, Yucatán',
  'Mexicali, Baja California',
  'Aguascalientes, Aguascalientes',
  'Cuernavaca, Morelos',
  'Saltillo, Coahuila',
  'Xalapa, Veracruz',
  'Tampico, Tamaulipas',
  'Morelia, Michoacán',
  'Reynosa, Tamaulipas',
  'Tlalnepantla, Estado de México',
  'Chimalhuacán, Estado de México',
  'Naucalpan, Estado de México',
  'Cancún, Quintana Roo',
  'Veracruz, Veracruz',
  'Pachuca, Hidalgo',
  'Oaxaca, Oaxaca',
  'Acapulco, Guerrero',
  'Chihuahua, Chihuahua',
  'Hermosillo, Sonora',
  'Culiacán, Sinaloa',
  'Mazatlán, Sinaloa',
  'Durango, Durango',
  'Campeche, Campeche',
  'La Paz, Baja California Sur',
  'Tuxtla Gutiérrez, Chiapas',
  'Villahermosa, Tabasco',
  'Tepic, Nayarit',
  'Colima, Colima',
  'Zacatecas, Zacatecas',
  'Tlaxcala, Tlaxcala'
];

// ============================================================================
// COLORES PREDETERMINADOS DEL TEMA
// ============================================================================

export const DEFAULT_THEME_COLORS: ThemeColors = {
  primary: '#1e40af',      // Azul principal
  secondary: '#dc2626',    // Rojo secundario
  accent: '#f59e0b',       // Amarillo de acento
  background: '#ffffff',   // Fondo blanco
  text: '#1f2937',         // Texto gris oscuro
  success: '#10b981',      // Verde éxito
  error: '#ef4444',        // Rojo error
  warning: '#f59e0b'       // Amarillo advertencia
};

// ============================================================================
// CONFIGURACIÓN PREDETERMINADA DEL ADMINISTRADOR
// ============================================================================

export const DEFAULT_ADMIN_CONFIG: AdminConfig = {
  prizeTitle: 'Chevrolet Silverado Z71 2024 - Valor $45,000 USD',
  prizeImage: '/premios/premio-rifa.png',
  prizeValue: 45000,
  sorteoDate: new Date('2024-12-31T20:00:00-06:00'), // 31 Dec 2024 8PM CST
  colors: DEFAULT_THEME_COLORS,
  paymentMethods: PAYMENT_METHODS
};

// ============================================================================
// CONFIGURACIONES DE TIEMPO Y INTERVALOS
// ============================================================================

/** Intervalo para actualizar la actividad en tiempo real (ms) */
export const LIVE_ACTIVITY_INTERVAL = 5000;

/** Intervalo para verificar reservas expiradas (ms) */
export const RESERVATION_CHECK_INTERVAL = 60000;

/** Intervalo para generar actividad falsa de compras (ms) */
export const FAKE_ACTIVITY_INTERVAL = 15000;

// ============================================================================
// CONFIGURACIÓN FOMO REALISTA
// ============================================================================

/** Configuración para FOMO realista */
export const FOMO_CONFIG = {
  // Rango de tiempo entre notificaciones (en milisegundos)
  MIN_INTERVAL: 20000, // 20 segundos
  MAX_INTERVAL: 180000, // 3 minutos
  
  // Número de boletos por compra (distribución realista)
  TICKET_RANGES: [
    { min: 1, max: 1, weight: 30 },    // 30% compran 1 boleto
    { min: 2, max: 3, weight: 25 },    // 25% compran 2-3 boletos
    { min: 4, max: 7, weight: 20 },    // 20% compran 4-7 boletos
    { min: 8, max: 15, weight: 15 },   // 15% compran 8-15 boletos
    { min: 16, max: 30, weight: 8 },   // 8% compran 16-30 boletos
    { min: 31, max: 50, weight: 2 }    // 2% compran 31-50 boletos
  ],
  
  // Máximo porcentaje de venta ficticia
  MAX_FAKE_PERCENTAGE: 27,
  
  // Velocidad inicial de ventas ficticias (boletos por hora)
  INITIAL_SALES_RATE: 150,
  
  // Mensajes de compra más naturales
  PURCHASE_MESSAGES: [
    'acaba de comprar',
    'acaba de adquirir',
    'compró',
    'adquirió',
    'seleccionó',
    'reservó'
  ],
  
  // Tiempo adicional en los mensajes
  TIME_MESSAGES: [
    'hace 1 minuto',
    'hace 2 minutos',
    'hace unos minutos',
    'recién',
    'ahora mismo'
  ]
};

// ============================================================================
// LÍMITES Y VALIDACIONES
// ============================================================================

/** Máximo de tickets por compra */
export const MAX_TICKETS_PER_PURCHASE = 100;

/** Mínimo de tickets por compra */
export const MIN_TICKETS_PER_PURCHASE = 2;

/** Máximo de caracteres para nombre */
export const MAX_NAME_LENGTH = 100;

/** Máximo de caracteres para email */
export const MAX_EMAIL_LENGTH = 254;

/** Patrón para validar email */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Patrón para validar WhatsApp mexicano (formato: +52 seguido de 10 dígitos) */
export const MEXICAN_WHATSAPP_REGEX = /^\+52\d{10}$/;

/** Número de WhatsApp de contacto */
export const CONTACT_WHATSAPP = '+523343461630';

// ============================================================================
// MENSAJES Y TEXTOS PREDETERMINADOS
// ============================================================================

export const MESSAGES = {
  // Mensajes de éxito
  SUCCESS: {
    TICKETS_RESERVED: '¡Números apartados con éxito!',
    PAYMENT_VERIFIED: '¡Pago confirmado! Tus números ya están asegurados.',
    PROFILE_UPDATED: 'Tus datos se actualizaron correctamente.'
  },
  
  // Mensajes de error
  ERROR: {
    TICKETS_NOT_AVAILABLE: 'Algunos números ya los tomaron otros jugadores.',
    INVALID_EMAIL: 'Por favor escribe un correo electrónico válido.',
    INVALID_WHATSAPP: 'Por favor escribe tu WhatsApp completo (+52 y 10 dígitos).',
    RESERVATION_EXPIRED: 'Se venció tu apartado. Escoge otros números por favor.',
    PAYMENT_FAILED: 'No se pudo procesar tu pago. Inténtalo de nuevo.',
    MAX_TICKETS_EXCEEDED: `No puedes comprar más de ${MAX_TICKETS_PER_PURCHASE} tickets.`
  },
  
  // Mensajes de advertencia
  WARNING: {
    RESERVATION_EXPIRING: 'Tu apartado se vence pronto. Termina tu compra.',
    FEW_TICKETS_LEFT: 'Quedan poquitos números disponibles.'
  },
  
  // Mensajes informativos
  INFO: {
    TICKETS_SELECTED: 'números escogidos',
    TOTAL_TO_PAY: 'Total a pagar',
    DISCOUNT_APPLIED: 'Descuento aplicado',
    SORTEO_DATE: 'Fecha del sorteo'
  }
};

// ============================================================================
// CONFIGURACIONES DE FORMATO (SOLO OBJETOS INTL)
// ============================================================================

/** Configuración para formatear moneda estadounidense */
export const CURRENCY_FORMAT_CONFIG = {
  style: 'currency' as const,
  currency: 'USD' as const,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
};

/** Configuración para formatear fechas en México */
export const DATE_FORMAT_CONFIG = {
  year: 'numeric' as const,
  month: 'long' as const,
  day: 'numeric' as const,
  hour: '2-digit' as const,
  minute: '2-digit' as const,
  timeZone: 'America/Mexico_City'
};

/** Configuración para formatear números */
export const NUMBER_FORMAT_CONFIG = {
  // Configuración por defecto para números en México
};

// ============================================================================
// RE-EXPORTS DE TIPOS PARA CONVENIENCIA
// ============================================================================

export type {
  QuickSelectOption,
  PaymentMethod,
  PaymentMethodType,
  AdminConfig,
  ThemeColors
} from './types';