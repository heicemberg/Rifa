// ============================================================================
// INTERFACES TYPESCRIPT PARA SISTEMA DE RIFA DE CAMIONETA EN MÉXICO
// ============================================================================

/**
 * Estados posibles de un ticket
 */
export type TicketStatus = 'available' | 'selected' | 'reserved' | 'sold';

/**
 * Interface para un ticket individual de la rifa
 */
export interface Ticket {
  /** ID único del ticket */
  id: string;
  /** Número del ticket en formato "0001" */
  number: string;
  /** Estado actual del ticket */
  status: TicketStatus;
  /** ID del comprador (opcional, solo cuando está reservado o vendido) */
  buyerId?: string;
  /** Fecha y hora de reserva (opcional) */
  reservedAt?: Date;
  /** Fecha y hora de compra confirmada (opcional) */
  purchaseDate?: Date;
}

/**
 * Estados posibles de un cliente
 */
export type CustomerStatus = 'pending' | 'verified' | 'rejected';

/**
 * Interface para un cliente/comprador
 */
export interface Customer {
  /** ID único del cliente */
  id: string;
  /** Nombre completo del cliente */
  name: string;
  /** Email del cliente */
  email: string;
  /** Número de WhatsApp del cliente */
  whatsapp: string;
  /** Ciudad del cliente */
  city: string;
  /** Estado/región del cliente */
  state: string;
  /** Array de IDs de tickets seleccionados */
  selectedTickets: string[];
  /** Monto total a pagar */
  totalAmount: number;
  /** Método de pago seleccionado */
  paymentMethod: PaymentMethodType;
  /** URL del comprobante de pago (opcional) */
  proofUrl?: string;
  /** Estado del cliente/pago */
  status: CustomerStatus;
  /** Fecha de creación del registro */
  createdAt: Date;
}

/**
 * Tipos de métodos de pago disponibles en México
 */
export type PaymentMethodType = 'binance' | 'banamex' | 'bbva' | 'oxxo';

/**
 * Interface para un método de pago
 */
export interface PaymentMethod {
  /** ID único del método de pago */
  id: PaymentMethodType;
  /** Nombre del método de pago */
  name: string;
  /** Ruta del icono del método de pago */
  icon: string;
  /** Número de cuenta o información de pago */
  account: string;
  /** Detalles completos de la cuenta para copiar */
  accountDetails?: string;
  /** Si el método está habilitado */
  enabled: boolean;
}

/**
 * Interface para actividad en tiempo real
 */
export interface LiveActivity {
  /** ID único de la actividad */
  id: string;
  /** Nombre del comprador en formato "Juan M." */
  buyerName: string;
  /** Cantidad de tickets comprados */
  ticketCount: number;
  /** Fecha y hora de la actividad */
  createdAt: Date;
}

/**
 * Interface para colores del tema
 */
export interface ThemeColors {
  /** Color primario */
  primary: string;
  /** Color secundario */
  secondary: string;
  /** Color de acento */
  accent: string;
  /** Color de fondo */
  background: string;
  /** Color de texto */
  text: string;
  /** Color de éxito */
  success: string;
  /** Color de error */
  error: string;
  /** Color de advertencia */
  warning: string;
}

/**
 * Interface para configuración de administrador
 */
export interface AdminConfig {
  /** Título del premio */
  prizeTitle: string;
  /** URL de la imagen del premio */
  prizeImage: string;
  /** Valor del premio */
  prizeValue: number;
  /** Fecha del sorteo */
  sorteoDate: Date;
  /** Configuración de colores */
  colors: ThemeColors;
  /** Métodos de pago disponibles */
  paymentMethods: PaymentMethod[];
}

/**
 * Interface para opciones de selección rápida
 */
export interface QuickSelectOption {
  /** Cantidad de tickets */
  tickets: number;
  /** Precio total */
  price: number;
  /** Descuento aplicado (0-100) */
  discount: number;
  /** Si es la opción popular/destacada */
  popular?: boolean;
}

/**
 * Interface para estadísticas generales
 */
export interface RaffleStats {
  /** Total de tickets */
  totalTickets: number;
  /** Tickets vendidos */
  soldTickets: number;
  /** Tickets disponibles */
  availableTickets: number;
  /** Tickets reservados */
  reservedTickets: number;
  /** Ingresos totales */
  totalRevenue: number;
  /** Porcentaje vendido */
  soldPercentage: number;
}

/**
 * Interface para notificaciones del sistema
 */
export interface Notification {
  /** ID único de la notificación */
  id: string;
  /** Tipo de notificación */
  type: 'success' | 'error' | 'warning' | 'info';
  /** Título de la notificación */
  title: string;
  /** Mensaje de la notificación */
  message: string;
  /** Si la notificación es persistente */
  persistent?: boolean;
  /** Duración en milisegundos (opcional) */
  duration?: number;
  /** Fecha de creación */
  createdAt: Date;
}

/**
 * Interface para respuesta de API genérica
 */
export interface ApiResponse<T = unknown> {
  /** Si la operación fue exitosa */
  success: boolean;
  /** Datos de respuesta */
  data?: T;
  /** Mensaje de error */
  error?: string;
  /** Código de estado */
  statusCode?: number;
}

/**
 * Interface para paginación
 */
export interface PaginationParams {
  /** Página actual (base 1) */
  page: number;
  /** Elementos por página */
  limit: number;
  /** Campo de ordenamiento */
  sortBy?: string;
  /** Dirección del ordenamiento */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Interface para respuesta paginada
 */
export interface PaginatedResponse<T> {
  /** Datos de la página actual */
  data: T[];
  /** Información de paginación */
  pagination: {
    /** Página actual */
    currentPage: number;
    /** Total de páginas */
    totalPages: number;
    /** Total de elementos */
    totalItems: number;
    /** Elementos por página */
    itemsPerPage: number;
    /** Si hay página anterior */
    hasPrevPage: boolean;
    /** Si hay página siguiente */
    hasNextPage: boolean;
  };
}

// ============================================================================
// EXPORT DE TODAS LAS INTERFACES Y TIPOS
// ============================================================================

// Los tipos ya están exportados en sus definiciones arriba

// Constantes útiles
export const TICKET_STATUSES: TicketStatus[] = ['available', 'selected', 'reserved', 'sold'];
export const CUSTOMER_STATUSES: CustomerStatus[] = ['pending', 'verified', 'rejected'];
export const PAYMENT_METHOD_TYPES: PaymentMethodType[] = ['binance', 'banamex', 'bbva', 'oxxo'];

/**
 * Función helper para formatear número de ticket
 */
export const formatTicketNumber = (num: number): string => {
  return num.toString().padStart(4, '0');
};

/**
 * Función helper para formatear nombre de comprador
 */
export const formatBuyerName = (fullName: string): string => {
  const parts = fullName.trim().split(' ');
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  
  const firstName = parts[0];
  const lastNameInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${firstName} ${lastNameInitial}.`;
};

/**
 * Función helper para validar número de WhatsApp mexicano
 */
export const isValidMexicanWhatsApp = (whatsapp: string): boolean => {
  // Formato: +52 seguido de 10 dígitos (celular mexicano)
  const cleanNumber = whatsapp.replace(/\D/g, '');
  return /^52\d{10}$/.test(cleanNumber);
};

/**
 * Función helper para calcular precio con descuento
 */
export const calculateDiscountedPrice = (originalPrice: number, discount: number): number => {
  return Math.round(originalPrice * (1 - discount / 100));
};