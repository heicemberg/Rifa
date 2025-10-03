// ============================================================================
// PREMIUM PURCHASE WIZARD - 5-STEP MODAL WITH SUPABASE INTEGRATION
// Ultra Premium UI/UX with Real-time Validation and Payment Animations
// Fixed: Minimum 2 tickets validation, smooth Framer Motion animations
// ============================================================================

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { 
  X, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  CreditCard, 
  Building2, 
  Smartphone,
  Users,
  MapPin,
  Phone,
  Mail,
  FileText,
  Upload,
  Copy,
  Check,
  Camera,
  Zap,
  TrendingUp,
  Gift,
  AlertCircle,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { cn } from '../lib/utils';
import { formatPrice, formatTicketNumber } from '../lib/utils';
import { PAYMENT_METHODS, QUICK_SELECT_OPTIONS, MAIN_CARD_OPTIONS, MIN_TICKETS_PER_PURCHASE } from '../lib/constants';
import type { PaymentMethod as PaymentMethodType } from '../lib/types';
import { useMasterCounters } from '../hooks/useMasterCounters';
import { useLazyCryptoPrice } from '../hooks/useLazyCryptoPrice';
import { useCryptoConversion } from '../hooks/useCryptoConversion';
import { getPaymentMethods, validatePaymentConfig } from '../lib/config/payment-config';
import { useRaffleStore } from '../stores/raffle-store';
import { useOversellProtection } from '../hooks/useOversellProtection';
import { useReservationCleanup } from '../hooks/useReservationCleanup';
import CryptoIcon from './CryptoIcon';

// ============================================================================
// INTERFACES AND TYPES
// ============================================================================

interface PurchaseWizardProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTickets: number[];
  onConfirmPurchase: (customerData: CustomerData, paymentMethod: string) => Promise<void>;
  onQuickSelect: (count: number) => void;
  isProcessing: boolean;
}

interface CustomerData {
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  [key: string]: string; // Index signature for dynamic property access
}

interface ValidationErrors {
  [key: string]: string;
}

interface WizardStep {
  number: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

// ============================================================================
// OPTIMIZED COMPONENTS FOR MAXIMUM PERFORMANCE
// ============================================================================

interface OptimizedQuickSelectCardProps {
  option: { tickets: number; price: number; discount: number; popular?: boolean };
  onSelect: () => void;
  disabled?: boolean;
}

// ✅ ULTRA-OPTIMIZED: High-performance card with mobile-first UX improvements
const OptimizedQuickSelectCard: React.FC<OptimizedQuickSelectCardProps> = React.memo(({
  option,
  onSelect,
  disabled = false
}) => {
  // ✅ PERFORMANCE: Ultra-robust event handler with haptic feedback
  const handleClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled) {
      console.log(`⚠️ CARD DISABLED: ${option.tickets} boletos`);
      return;
    }

    // Mobile haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }

    console.log(`🎯 CARD CLICKED: ${option.tickets} boletos - EJECUTANDO onSelect`);

    try {
      onSelect();
      console.log(`✅ onSelect ejecutado para ${option.tickets} boletos`);
    } catch (error) {
      console.error(`❌ Error ejecutando onSelect:`, error);
    }
  }, [onSelect, disabled, option.tickets]);

  // ✅ PERFORMANCE: Pre-calculated styles with enhanced mobile interactions
  const isPopular = Boolean(option.popular);
  const baseStyles = useMemo(() => ({
    base: cn(
      'relative rounded-2xl pt-8 pb-4 px-6 sm:pt-10 sm:pb-6 sm:px-8 text-center transition-all duration-200 ease-out',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50',
      'z-10 select-none max-w-full', // Extra padding top for badges, ensure containment
      disabled
        ? 'opacity-50 cursor-not-allowed'
        : 'cursor-pointer hover:scale-[1.02] active:scale-[0.98] touch-manipulation',
      isPopular
        ? 'bg-gradient-to-br from-amber-50 via-amber-100 to-orange-50 border-2 border-amber-300 shadow-lg shadow-amber-400/25 ring-1 ring-amber-200/30'
        : 'bg-gradient-to-br from-white via-slate-50 to-white border-2 border-slate-200 hover:border-blue-300 hover:bg-blue-50/60 hover:shadow-lg hover:shadow-blue-200/30'
    )
  }), [disabled, isPopular]);

  // Calculate winning probability for urgency indicator
  const winProbability = ((option.tickets / 10000) * 100).toFixed(2);

  return (
    <motion.button
      onClick={handleClick}
      disabled={disabled}
      className={baseStyles.base}
      type="button"
      aria-label={`Seleccionar ${option.tickets} boletos por ${formatPrice(option.price)} - ${winProbability}% probabilidad de ganar`}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      {/* Enhanced Popular Badge with urgency - Properly contained within borders */}
      {isPopular && (
        <motion.div
          initial={{ scale: 0, rotate: -12 }}
          animate={{ scale: 1, rotate: 0 }}
          className="absolute top-3 right-3 z-20 bg-gradient-to-r from-emerald-500 to-green-500 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg"
        >
          <div className="flex items-center gap-1">
            <Zap size={8} />
            <span className="text-xs">MÁS ELEGIDO</span>
          </div>
        </motion.div>
      )}

      {/* Urgency indicator for high-value packages - Properly contained within borders */}
      {option.tickets >= 50 && !isPopular && (
        <div className="absolute top-3 left-3 z-10 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse">
          <span className="text-xs">🔥 OFERTA</span>
        </div>
      )}

      {/* Main Content with enhanced visual hierarchy */}
      <div className="space-y-3">
        {/* Tickets Count with better emphasis */}
        <div className="space-y-1">
          <div className={cn(
            'text-3xl sm:text-4xl font-black leading-none tracking-tight',
            isPopular
              ? 'text-amber-700 drop-shadow-sm'
              : 'text-slate-800'
          )}>
            {option.tickets}
          </div>
          <div className={cn(
            'text-xs font-semibold uppercase tracking-wider',
            isPopular
              ? 'text-amber-600'
              : 'text-slate-500'
          )}>
            Números
          </div>
        </div>

        {/* Enhanced Price Section with trust indicators */}
        <div className="space-y-2">
          <div className={cn(
            'text-xl sm:text-2xl font-black',
            isPopular
              ? 'text-emerald-700'
              : 'text-slate-900'
          )}>
            {formatPrice(option.price)}
          </div>

          {/* Discount Badge with better visual impact */}
          {option.discount > 0 && (
            <div className="flex items-center justify-center gap-2">
              <span className="text-slate-400 line-through text-sm">
                {formatPrice(option.tickets * 250)}
              </span>
              <span className={cn(
                'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold shadow-sm',
                isPopular
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-red-100 text-red-800 border border-red-200'
              )}>
                <TrendingUp size={10} />
                AHORRA {option.discount}%
              </span>
            </div>
          )}

          {/* Winning probability indicator */}
          <div className="text-xs text-slate-600 font-medium bg-slate-100 px-2 py-1 rounded-full">
            {winProbability}% probabilidad de ganar
          </div>
        </div>
      </div>

      {/* Hover effect overlay for better feedback */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-blue-500/0 to-blue-500/10 opacity-0 hover:opacity-100 transition-opacity duration-200 rounded-2xl pointer-events-none" />
    </motion.button>
  );
});

OptimizedQuickSelectCard.displayName = 'OptimizedQuickSelectCard';

// ============================================================================
// OPTIMIZED PAYMENT METHOD CARD - ULTRA-FAST PERFORMANCE
// ============================================================================

interface OptimizedPaymentMethodCardProps {
  method: { id: string; name: string; icon: string; [key: string]: any };
  isSelected: boolean;
  onSelect: () => void;
  expanded?: boolean;
  selectedTickets?: number[];
  convertedAmounts?: any;
  cryptoLoading?: boolean;
  lastUpdate?: Date | null;
}

// ✅ ULTRA-OPTIMIZED: Payment method card with mobile-first design and trust indicators
const OptimizedPaymentMethodCard: React.FC<OptimizedPaymentMethodCardProps> = React.memo(({
  method,
  isSelected,
  onSelect,
  expanded = false,
  selectedTickets = [],
  convertedAmounts = {},
  cryptoLoading = false,
  lastUpdate = null
}) => {
  // ✅ PERFORMANCE: Memoized click handler with haptic feedback
  const handleClick = useCallback(() => {
    // Mobile haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    onSelect();
  }, [onSelect]);

  // Payment method priority and trust indicators
  const getMethodPriority = useCallback(() => {
    const priorities: Record<string, { order: number; label: string; color: string; icon: string }> = {
      'binance': { order: 1, label: 'MÁS RÁPIDO', color: 'yellow', icon: '🚀' },
      'oxxo': { order: 2, label: 'MÁS POPULAR', color: 'emerald', icon: '🏪' },
      'bancoppel': { order: 3, label: 'CONFIABLE', color: 'blue', icon: '🏦' },
      'bancoazteca': { order: 4, label: 'SEGURO', color: 'purple', icon: '🔒' }
    };
    return priorities[method.id as string] || { order: 99, label: '', color: 'slate', icon: '' };
  }, [method.id]);

  const priority = getMethodPriority();

  // ✅ PERFORMANCE: Pre-calculated styles with enhanced mobile design and proper containment
  const cardStyles = useMemo(() => {
    const base = 'group w-full rounded-2xl border-2 text-center relative overflow-hidden transition-all duration-200 will-change-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 select-none touch-manipulation max-w-full';

    if (expanded) {
      return cn(base, 'px-6 py-4 min-h-[80px] border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 shadow-xl ring-2 ring-blue-200/50');
    }

    if (isSelected) {
      return cn(base,
        'px-4 py-6 min-h-[120px] border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 shadow-xl ring-2 ring-blue-200/50',
        'hover:scale-[1.01] active:scale-[0.99]'
      );
    }

    // Enhanced styling based on priority
    const priorityStyles: Record<number, string> = {
      1: 'border-yellow-300 bg-gradient-to-br from-yellow-50 to-orange-50 hover:border-yellow-400 hover:shadow-yellow-200/30',
      2: 'border-emerald-300 bg-gradient-to-br from-emerald-50 to-green-50 hover:border-emerald-400 hover:shadow-emerald-200/30',
      3: 'border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50 hover:border-blue-400 hover:shadow-blue-200/30',
      4: 'border-purple-300 bg-gradient-to-br from-purple-50 to-violet-50 hover:border-purple-400 hover:shadow-purple-200/30'
    };

    return cn(base,
      'px-4 pt-8 pb-6 min-h-[120px] hover:scale-[1.02] active:scale-[0.98]',
      priorityStyles[priority.order] || 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/50',
      'hover:shadow-lg transition-all duration-200'
    );
  }, [expanded, isSelected, priority.order]);

  return (
    <motion.button
      onClick={handleClick}
      className={cardStyles}
      whileHover={{ scale: expanded ? 1.01 : 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      {/* Priority Badge - Fixed positioning for proper containment */}
      {priority.label && !expanded && (
        <motion.div
          initial={{ scale: 0, rotate: -12 }}
          animate={{ scale: 1, rotate: 0 }}
          className={cn(
            'absolute top-3 right-3 z-20 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg',
            priority.color === 'yellow' && 'bg-gradient-to-r from-yellow-500 to-orange-500',
            priority.color === 'emerald' && 'bg-gradient-to-r from-emerald-500 to-green-500',
            priority.color === 'blue' && 'bg-gradient-to-r from-blue-500 to-indigo-500',
            priority.color === 'purple' && 'bg-gradient-to-r from-purple-500 to-violet-500'
          )}
        >
          <div className="flex items-center gap-1">
            <span>{priority.icon}</span>
            <span>{priority.label}</span>
          </div>
        </motion.div>
      )}

      {/* Selection Indicator - Fixed positioning for proper containment */}
      {isSelected && !expanded && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-3 left-3 z-10 w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg"
        >
          <CheckCircle size={16} className="text-white" />
        </motion.div>
      )}

      <div className={cn(
        'flex items-center justify-center h-full',
        expanded ? 'flex-row gap-4' : 'flex-col space-y-3'
      )}>
        {/* Enhanced Logo Container */}
        <div className={cn(
          'flex items-center justify-center bg-white rounded-xl shadow-sm border border-slate-100 group-hover:shadow-md transition-shadow duration-200',
          expanded ? 'w-16 h-16 p-3' : 'w-full py-4 px-6'
        )}>
          <img
            src={method.icon}
            alt={method.name}
            className={cn(
              'object-contain group-hover:scale-105 transition-transform duration-200',
              expanded
                ? (method.id === 'binance' ? 'max-w-12 max-h-12' : 'max-w-8 max-h-8')
                : (method.id === 'binance' ? 'max-w-full max-h-[80px]' : 'max-w-full max-h-[60px]')
            )}
          />
        </div>

        {/* Enhanced Payment Method Info */}
        <div className={cn(
          'text-center',
          expanded ? 'flex-1 text-left' : ''
        )}>
          <div className="font-black text-slate-900 text-base group-hover:text-blue-700 transition-colors duration-200">
            {method.name}
          </div>

          {/* Trust & Speed Indicators */}
          {!expanded && (
            <div className="mt-2 space-y-1">
              {method.enabled && (
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded-full font-bold">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    24/7
                  </span>
                  {method.id === 'binance' && (
                    <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-bold">
                      <Zap size={10} />
                      INSTANTÁNEO
                    </span>
                  )}
                  {method.id === 'oxxo' && (
                    <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full font-bold">
                      <MapPin size={10} />
                      +20K TIENDAS
                    </span>
                  )}
                </div>
              )}

              {/* Payment Type Indicator */}
              <div className="text-xs text-slate-600 font-medium">
                {method.id === 'binance' && '💰 Criptomonedas'}
                {method.id === 'oxxo' && '🏪 Efectivo en tienda'}
                {(method.id === 'bancoppel' || method.id === 'bancoazteca') && '🏦 Transferencia bancaria'}
              </div>
            </div>
          )}

          {/* Crypto Prices for Binance */}
          {method.id === 'binance' && expanded && (
            <div className="mt-3 space-y-2">
              {cryptoLoading ? (
                <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  Calculando precios...
                </div>
              ) : convertedAmounts ? (
                <div className="space-y-3 bg-gradient-to-r from-emerald-50 to-blue-50 p-4 rounded-xl border border-emerald-200/50">
                  <div className="text-xs font-bold text-emerald-800 mb-2 flex items-center gap-2">
                    <Sparkles size={12} />
                    Equivalencias disponibles:
                  </div>

                  {/* Stablecoins - Recomendadas */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-emerald-700 mb-1">💰 Stablecoins (Recomendadas)</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-white/90 p-2.5 rounded-lg border border-emerald-200/50 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <CryptoIcon symbol="USDT" size={16} />
                          <div className="font-bold text-emerald-700">≈ {convertedAmounts.USDT?.toFixed(2)}</div>
                        </div>
                        <div className="text-slate-600 text-xs">USDT</div>
                      </div>
                      <div className="bg-white/90 p-2.5 rounded-lg border border-blue-200/50 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <CryptoIcon symbol="USDC" size={16} />
                          <div className="font-bold text-blue-700">≈ {convertedAmounts.USDC?.toFixed(2)}</div>
                        </div>
                        <div className="text-slate-600 text-xs">USDC</div>
                      </div>
                    </div>
                  </div>

                  {/* Principales Criptomonedas */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-700 mb-1">🚀 Principales Criptomonedas</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-white/90 p-2.5 rounded-lg border border-orange-200/50 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <CryptoIcon symbol="BTC" size={16} />
                          <div className="font-bold text-orange-600">≈ {convertedAmounts.BTC?.toFixed(6)}</div>
                        </div>
                        <div className="text-slate-600 text-xs">Bitcoin</div>
                      </div>
                      <div className="bg-white/90 p-2.5 rounded-lg border border-purple-200/50 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <CryptoIcon symbol="ETH" size={16} />
                          <div className="font-bold text-purple-600">≈ {convertedAmounts.ETH?.toFixed(4)}</div>
                        </div>
                        <div className="text-slate-600 text-xs">Ethereum</div>
                      </div>
                      <div className="bg-white/90 p-2.5 rounded-lg border border-indigo-200/50 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <CryptoIcon symbol="SOL" size={16} />
                          <div className="font-bold text-indigo-600">≈ {convertedAmounts.SOL?.toFixed(2)}</div>
                        </div>
                        <div className="text-slate-600 text-xs">Solana</div>
                      </div>
                      <div className="bg-white/90 p-2.5 rounded-lg border border-yellow-200/50 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <CryptoIcon symbol="BNB" size={16} />
                          <div className="font-bold text-yellow-600">≈ {convertedAmounts.BNB?.toFixed(2)}</div>
                        </div>
                        <div className="text-slate-600 text-xs">BNB</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-lg">
                  ⚠️ Precios no disponibles
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Enhanced hover effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-blue-500/0 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-2xl pointer-events-none" />
    </motion.button>
  );
});

OptimizedPaymentMethodCard.displayName = 'OptimizedPaymentMethodCard';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

// ✅ PERFORMANCE: Memoized PurchaseWizard for optimal re-renders
const PurchaseWizard: React.FC<PurchaseWizardProps> = React.memo(({
  isOpen,
  onClose,
  selectedTickets,
  onConfirmPurchase,
  onQuickSelect,
  isProcessing
}) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  // Obtener precio fijo del store (para cards principales)
  const { fixedPrice } = useRaffleStore();

  // Calculate if tickets are selected (this will update reactively)
  const hasTicketsSelected = selectedTickets.length >= MIN_TICKETS_PER_PURCHASE;
  
  // Initialize step based on tickets - but always allow starting from 0 for quick select
  const [currentStep, setCurrentStep] = useState(() => {
    return hasTicketsSelected ? 1 : 0;
  });
  const [customerData, setCustomerData] = useState<CustomerData>({
    name: '',
    email: '',
    phone: '',
    city: '',
    state: 'México'
  });
  
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [copiedField, setCopiedField] = useState<string>('');
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isSelectingTickets, setIsSelectingTickets] = useState(false);
  
  // ✅ ENHANCED: Use unified Master Counter system + Protection hooks
  const masterCounters = useMasterCounters();
  const isConnected = masterCounters.isConnected;
  const supabaseLoading = masterCounters.isLoading;

  // ✅ CRITICAL: Oversell protection and reservation cleanup
  const { atomicReserveTickets, validateTicketsBeforeReservation } = useOversellProtection();
  const { cleanupExpiredReservations } = useReservationCleanup({
    enableAutoCleanup: true,
    showLogs: false
  });
  
  // Calcular precio total - priorizar precio fijo de cards principales
  const totalPrice = useMemo(() => {
    const ticketCount = selectedTickets.length;

    // 1. Si hay precio fijo (cards principales), usar ese precio
    if (fixedPrice !== null) {
      console.log('💰 PRECIO FIJO desde cards principales:', fixedPrice);
      return fixedPrice;
    }

    // 2. Si viene del modal wizard, buscar precio con descuento
    const matchingOption = QUICK_SELECT_OPTIONS.find(option => option.tickets === ticketCount);

    if (matchingOption) {
      console.log('💰 PRECIO CON DESCUENTO desde modal wizard:', matchingOption.price);
      return matchingOption.price;
    }

    // 3. Selección manual - precio base sin descuentos
    const basePrice = ticketCount * 250;
    console.log('💰 PRECIO BASE selección manual:', basePrice);
    return basePrice;
  }, [selectedTickets.length, fixedPrice]);

  // ✅ PERFORMANCE: Lazy crypto loading - only when needed - SIN ERRORES VISIBLES
  const { convertedAmounts, loading: cryptoLoading, lastUpdate, activate: activateCrypto, isActive: cryptoActive } = useLazyCryptoPrice(selectedTickets.length * 250);

  // 🚀 NEW: Enhanced crypto conversion system - SIN ERRORES VISIBLES
  const {
    conversions: newConversions,
    stablecoins,
    mainCryptos,
    loading: newCryptoLoading,
    lastUpdate: newLastUpdate,
    refresh: refreshCrypto
  } = useCryptoConversion(totalPrice, cryptoActive);

  // Get real available tickets from Master Counter
  const getRealAvailableTickets = useCallback(async (): Promise<number[]> => {
    try {
      console.log('🎫 WIZARD: Getting real available tickets from Master Counter');

      // Use real available count from master counter
      const realAvailableCount = masterCounters.availableTickets;
      const realSoldTickets = masterCounters.soldTickets;
      const realReservedTickets = masterCounters.reservedTickets;

      console.log('📊 WIZARD: Master Counter data:', {
        available: realAvailableCount,
        sold: realSoldTickets,
        reserved: realReservedTickets,
        total: masterCounters.totalTickets
      });

      // Calculate available ticket numbers
      const allTickets = Array.from({ length: 10000 }, (_, i) => i + 1);

      // For now, return a simple calculation based on available count
      // In production, you might want to fetch specific available numbers from Supabase
      const availableTickets = allTickets.slice(0, realAvailableCount);

      console.log(`✅ WIZARD: Returning ${availableTickets.length} available tickets`);
      return availableTickets;
    } catch (error) {
      console.error('❌ WIZARD: Error getting available tickets:', error);
      return [];
    }
  }, [masterCounters.availableTickets, masterCounters.soldTickets, masterCounters.reservedTickets, masterCounters.totalTickets]);

  // ============================================================================
  // WIZARD CONFIGURATION
  // ============================================================================
  
  const wizardSteps: WizardStep[] = useMemo(() => {
    const baseSteps = [
      {
        number: 0,
        title: 'Selección',
        description: 'Elige tus números',
        icon: <Zap size={16} />,
        color: 'mexican-gold'
      },
      {
        number: 1,
        title: 'Confirmación',
        description: 'Verifica tu selección',
        icon: <CheckCircle size={16} />,
        color: 'mexican-red'
      },
      {
        number: 2,
        title: 'Pago',
        description: 'Método de pago',
        icon: <CreditCard size={16} />,
        color: 'mexican-green'
      },
      {
        number: 3,
        title: 'Datos',
        description: 'Tu información',
        icon: <Users size={16} />,
        color: 'sunset-orange'
      },
      {
        number: 4,
        title: 'Comprobante',
        description: 'Sube tu captura',
        icon: <Camera size={16} />,
        color: 'tequila-amber'
      }
    ];

    return hasTicketsSelected ? baseSteps.slice(1) : baseSteps;
  }, [hasTicketsSelected]);


  // 🚀 NEW: Get payment methods from configuration
  const configuredPaymentMethods = getPaymentMethods();
  const paymentValidation = validatePaymentConfig();

  // Filter main payment methods (4 methods in 2x2 grid) - prioritize configured methods
  const mainPaymentMethods = configuredPaymentMethods.length > 0
    ? configuredPaymentMethods.filter(method =>
        ['banamex', 'bbva', 'oxxo', 'binance'].includes(method.id)
      )
    : PAYMENT_METHODS.filter(method =>
        ['banamex', 'bbva', 'oxxo', 'binance'].includes(method.id)
      );

  const mexicanStates = [
    'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche',
    'Chiapas', 'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima',
    'Durango', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco', 'México',
    'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla',
    'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora',
    'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas'
  ];

  // ============================================================================
  // EFFECT HOOKS
  // ============================================================================

  // Reset wizard when opening
  useEffect(() => {
    if (isOpen) {
      // Always start at step 0 if no tickets, or step 1 if tickets exist
      const initialStep = selectedTickets.length >= MIN_TICKETS_PER_PURCHASE ? 1 : 0;
      setCurrentStep(initialStep);
      setValidationErrors({});
      setSelectedPaymentMethod('');
      setCopiedField('');
      setPaymentScreenshot(null);
      setPreviewUrl('');
      setIsSelectingTickets(false); // Reset click blocking state
      
      console.log('🔄 WIZARD RESET:', {
        isOpen,
        selectedTickets: selectedTickets.length,
        initialStep,
        hasTicketsSelected: selectedTickets.length >= MIN_TICKETS_PER_PURCHASE
      });
    }
  }, [isOpen, selectedTickets.length]);

  // Update step when tickets are selected (from external grid or quick select)
  useEffect(() => {
    console.log('🔄 WIZARD: useEffect triggered - selectedTickets change:', {
      isOpen,
      selectedTicketsLength: selectedTickets.length,
      minRequired: MIN_TICKETS_PER_PURCHASE,
      currentStep,
      isSelectingTickets,
      shouldAdvance: isOpen && selectedTickets.length >= MIN_TICKETS_PER_PURCHASE && currentStep === 0
    });
    
    // Don't proceed if modal is not open
    if (!isOpen) return;
    
    // Always clear isSelectingTickets when selectedTickets changes (means store updated)
    if (isSelectingTickets && selectedTickets.length >= MIN_TICKETS_PER_PURCHASE) {
      console.log('✅ WIZARD: Store updated with tickets, clearing isSelectingTickets');
      setIsSelectingTickets(false);
    }
    
    // ✅ PERFORMANCE: Advance to step 1 instantly when tickets are selected
    if (selectedTickets.length >= MIN_TICKETS_PER_PURCHASE && currentStep === 0) {
      console.log('🚀 WIZARD: Advancing to confirmation step instantly');
      setCurrentStep(1);
    }
  }, [selectedTickets.length, currentStep, isOpen, isSelectingTickets]);

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // ============================================================================
  // VALIDATION LOGIC
  // ============================================================================

  // ✅ PERFORMANCE: Optimized validation with early returns
  const validateTicketSelection = useCallback(async (): Promise<boolean> => {
    console.log('🔍 WIZARD: Starting enhanced ticket validation...', {
      selectedTickets: selectedTickets.length,
      uniqueTickets: new Set(selectedTickets).size
    });

    // ✅ CRITICAL: Check for duplicates in selection FIRST
    const uniqueTickets = [...new Set(selectedTickets)];
    if (uniqueTickets.length !== selectedTickets.length) {
      const duplicates = selectedTickets.filter((ticket, index) =>
        selectedTickets.indexOf(ticket) !== index
      );
      console.error('❌ WIZARD: Duplicate tickets detected:', duplicates);
      setValidationErrors({
        tickets: `Tickets duplicados detectados: ${duplicates.map(formatTicketNumber).join(', ')}. Esto indica un error en la selección.`
      });
      return false;
    }

    // Early return for basic validation
    if (selectedTickets.length === 0) {
      setValidationErrors({
        tickets: 'Debes seleccionar al menos algunos boletos para continuar.'
      });
      return false;
    }

    if (selectedTickets.length < MIN_TICKETS_PER_PURCHASE) {
      setValidationErrors({
        tickets: `Mínimo ${MIN_TICKETS_PER_PURCHASE} boletos requeridos. No se permite comprar 1 solo boleto por razones de equidad en el sorteo.`
      });
      return false;
    }

    // Use Master Counter for real-time validation instead of deprecated hook
    if (!isConnected) {
      console.warn('⚠️ WIZARD: No connection to Supabase, using local validation');
      return true;
    }

    try {
      // Get real-time data from Master Counter
      const realAvailableCount = masterCounters.availableTickets;
      const realSoldCount = masterCounters.soldTickets;
      const realReservedCount = masterCounters.reservedTickets;

      console.log('📊 WIZARD: Master Counter validation data:', {
        available: realAvailableCount,
        sold: realSoldCount,
        reserved: realReservedCount,
        selectedCount: selectedTickets.length
      });

      // Check if there are enough available tickets
      if (realAvailableCount === 0) {
        setValidationErrors({
          tickets: '¡Lo sentimos! Todos los boletos están agotados. El sorteo ha terminado.'
        });
        return false;
      }

      if (realAvailableCount < selectedTickets.length) {
        setValidationErrors({
          tickets: `Solo quedan ${realAvailableCount} boletos disponibles. Selecciona menos números.`
        });
        return false;
      }

      // Validate that selected tickets are within valid range
      const invalidTickets = selectedTickets.filter(ticket => ticket < 1 || ticket > 10000);
      if (invalidTickets.length > 0) {
        setValidationErrors({
          tickets: `Números de boleto inválidos: ${invalidTickets.map(formatTicketNumber).join(', ')}`
        });
        return false;
      }

      console.log('✅ WIZARD: Enhanced validation passed', {
        selectedCount: selectedTickets.length,
        availableCount: realAvailableCount,
        uniqueCheck: 'passed',
        rangeCheck: 'passed'
      });

    } catch (error) {
      console.warn('⚠️ WIZARD: Error validating tickets (using fallback):', error);
      // Don't block user for connection issues, allow to proceed
      return true;
    }

    // Clear previous errors if all validation passes
    setValidationErrors(prev => {
      const { tickets, ...rest } = prev;
      return rest;
    });

    return true;
  }, [selectedTickets, isConnected, masterCounters]);

  const validateStep = useCallback(async (step: number): Promise<boolean> => {
    const errors: ValidationErrors = {};

    // Step 0: Ticket selection validation
    if (step === 0) {
      return await validateTicketSelection();
    }

    // Step 1: Confirmation (ticket validation)
    if (step === 1) {
      return await validateTicketSelection();
    }

    // Step 2: Payment method
    if (step === 2) {
      if (!selectedPaymentMethod) {
        errors.payment = 'Selecciona un método de pago';
      }
    }

    // Step 3: Customer data
    if (step === 3) {
      if (!customerData.name.trim()) {
        errors.name = 'Ingresa tu nombre completo';
      }
      if (!customerData.email.trim()) {
        errors.email = 'Ingresa tu email';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerData.email)) {
        errors.email = 'Ingresa un email válido';
      }
      if (!customerData.phone.trim()) {
        errors.phone = 'Ingresa tu teléfono';
      } else if (!/^(\+52|52)?\s?[1-9]\d{9}$/.test(customerData.phone.replace(/\s/g, ''))) {
        errors.phone = 'Ingresa un teléfono válido (10 dígitos)';
      }
      if (!customerData.city.trim()) {
        errors.city = 'Ingresa tu ciudad';
      }
    }

    // Step 4: Payment proof
    if (step === 4) {
      if (!paymentScreenshot) {
        errors.screenshot = 'Sube una captura de pantalla de tu comprobante de pago';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [selectedPaymentMethod, customerData, paymentScreenshot, validateTicketSelection]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setValidationErrors({ screenshot: 'Por favor selecciona una imagen (JPG, PNG, etc.)' });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setValidationErrors({ screenshot: 'La imagen es muy grande. Máximo 10MB.' });
      return;
    }

    setPaymentScreenshot(file);

    // Create preview
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    const newPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(newPreviewUrl);

    // Clear errors
    setValidationErrors(prev => {
      const { screenshot, ...rest } = prev;
      return rest;
    });
  }, [previewUrl]);

  const handleNext = useCallback(async () => {
    // Extra validation: never allow advancing from step 1 without tickets
    if (currentStep === 1 && selectedTickets.length < MIN_TICKETS_PER_PURCHASE) {
      setValidationErrors({
        tickets: `Debes seleccionar al menos ${MIN_TICKETS_PER_PURCHASE} boletos antes de continuar.`
      });
      return;
    }
    
    if (await validateStep(currentStep)) {
      if (currentStep < 4) {
        setCurrentStep(currentStep + 1);
      }
    }
  }, [currentStep, validateStep, selectedTickets.length]);

  const handleBack = useCallback(() => {
    // Calculate minimum step dynamically
    const minStep = selectedTickets.length >= MIN_TICKETS_PER_PURCHASE ? 1 : 0;
    if (currentStep > minStep) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep, selectedTickets.length]);

  const handleFinish = useCallback(async () => {
    if (await validateStep(4)) {
      try {
        await onConfirmPurchase(customerData, selectedPaymentMethod);
      } catch (error) {
        console.error('Error en compra:', error);
      }
    }
  }, [validateStep, onConfirmPurchase, customerData, selectedPaymentMethod]);

  const copyToClipboard = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(''), 2000);
  }, []);

  // ✅ PERFORMANCE: Optimized instant quick select with enhanced logging
  const handleQuickSelect = useCallback(async (ticketCount: number) => {
    console.log(`🚀 MODAL WIZARD: handleQuickSelect called with ${ticketCount} boletos`);

    // Clear any previous errors
    setValidationErrors({});
    setIsSelectingTickets(true);

    console.log(`⚡ Estado: isSelectingTickets = true para ${ticketCount} boletos`);

    // Validate minimum tickets
    if (ticketCount < MIN_TICKETS_PER_PURCHASE) {
      setValidationErrors({
        quickSelect: `Mínimo ${MIN_TICKETS_PER_PURCHASE} boletos requeridos para participar en el sorteo`
      });
      setIsSelectingTickets(false);
      return;
    }

    try {
      // Optimized: Skip availability check for instant UX
      // The store will handle conflicts automatically
      console.log('🚀 WIZARD: Instant quick select with count:', ticketCount);

      // Call the parent's onQuickSelect function instantly
      onQuickSelect(ticketCount);

      // Clear errors immediately
      setValidationErrors({});

    } catch (error) {
      console.error('Error in quick select:', error);
      setValidationErrors({
        quickSelect: 'Error al seleccionar boletos. Intenta de nuevo.'
      });
    } finally {
      // Always reset selection state
      setIsSelectingTickets(false);
    }
  }, [onQuickSelect]);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderStepProgress = () => (
    <div className="flex items-center gap-2 sm:gap-3">
      {wizardSteps.map((step, index) => (
        <React.Fragment key={step.number}>
          <div className="flex items-center">
            <div className={cn(
              'w-8 h-8 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center text-xs sm:text-sm font-bold transition-all duration-200 ease-out ring-2',
              currentStep > step.number 
                ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white ring-emerald-300/40 shadow-lg shadow-emerald-500/20 scale-110' 
                : currentStep === step.number
                ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white ring-blue-300/40 shadow-lg shadow-blue-500/20 scale-110 animate-pulse'
                : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500 ring-slate-200/50 hover:ring-slate-300/60'
            )}>
              {currentStep > step.number ? (
                <CheckCircle size={14} className="animate-in zoom-in-50 duration-300" />
              ) : (
                <span>{selectedTickets.length >= MIN_TICKETS_PER_PURCHASE ? step.number : step.number + 1}</span>
              )}
            </div>
          </div>
          {index < wizardSteps.length - 1 && (
            <div className="flex-1 h-2 sm:h-3 mx-1 sm:mx-3 rounded-full bg-gradient-to-r from-slate-100 to-slate-200 shadow-inner overflow-hidden">
              <div className={cn(
                'h-full rounded-full transition-all duration-300 ease-out',
                currentStep > step.number ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-sm' : 'bg-transparent'
              )} />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const renderPaymentMethodAnimation = () => {
    const selectedMethod = mainPaymentMethods.find(m => m.id === selectedPaymentMethod);
    const unselectedMethods = mainPaymentMethods.filter(m => m.id !== selectedPaymentMethod);

    return (
      <LayoutGroup>
        <AnimatePresence mode="wait">
          {!selectedPaymentMethod ? (
            // Initial 2x2 grid layout
            <motion.div 
              key="grid"
              className="grid grid-cols-2 gap-4 sm:gap-6"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              {mainPaymentMethods.map((method, index) => (
                <div key={method.id}>
                  <OptimizedPaymentMethodCard
                    method={method}
                    isSelected={false}
                    onSelect={() => {
                      setSelectedPaymentMethod(method.id);
                      // ✅ PERFORMANCE: Activate crypto only when Binance is selected
                      if (method.id === 'binance' && !cryptoActive) {
                        activateCrypto();
                      }
                    }}
                    selectedTickets={selectedTickets}
                    convertedAmounts={convertedAmounts}
                    cryptoLoading={cryptoLoading}
                    lastUpdate={lastUpdate}
                  />
                </div>
              ))}
            </motion.div>
          ) : (
            // Selected layout: top row (3 small) + bottom expanded
            <motion.div 
              key="selected"
              className="space-y-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Top row - small unselected methods */}
              <motion.div 
                className="flex justify-center gap-3"
                initial={{ y: -5, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.15, delay: 0.02 }}
              >
                {unselectedMethods.map((method, index) => (
                  <motion.button
                    key={method.id}
                    layoutId={method.id}
                    onClick={() => {
                      setSelectedPaymentMethod(method.id);
                      // ✅ PERFORMANCE: Activate crypto when switching to Binance
                      if (method.id === 'binance' && !cryptoActive) {
                        activateCrypto();
                      }
                    }}
                    className="group relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-slate-200/60 bg-gradient-to-br from-white to-slate-50/40 hover:border-blue-300/70 hover:shadow-lg overflow-hidden"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ 
                      duration: 0.15, 
                      delay: index * 0.02,
                      ease: "easeOut" 
                    }}
                    whileHover={{ 
                      scale: 1.1,
                      transition: { duration: 0.1 }
                    }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <img
                        src={method.icon}
                        alt={method.name}
                        className="max-w-8 max-h-8 sm:max-w-10 sm:max-h-10 object-contain filter group-hover:scale-110 transition-transform duration-200"
                      />
                    </div>
                  </motion.button>
                ))}
              </motion.div>

              {/* Bottom - expanded selected method */}
              {selectedMethod && (
                <div key={selectedMethod.id}>
                  <OptimizedPaymentMethodCard
                    method={selectedMethod}
                    isSelected={true}
                    onSelect={() => {}}
                    expanded={true}
                    selectedTickets={selectedTickets}
                    convertedAmounts={convertedAmounts}
                    cryptoLoading={cryptoLoading}
                    lastUpdate={lastUpdate}
                  />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </LayoutGroup>
    );
  };

  // ============================================================================
  // RENDER CONDITIONS
  // ============================================================================

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* ✅ SOLID BACKDROP: Light background overlay */}
          <motion.div
            className="fixed inset-0 bg-gray-100/80 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          
          {/* Modal Container */}
          <div className="flex items-center justify-center min-h-screen p-3 sm:p-6">
            {/* ✅ PERFORMANCE: Optimized modal animation */}
            <motion.div 
              className="relative w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl"
              style={{ maxHeight: '90vh' }}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ 
                duration: 0.25, 
                ease: "easeOut"
              }}
            >
          {/* ✅ PERFORMANCE: Optimized modal background */}
          <div className="bg-white/98 rounded-3xl shadow-2xl ring-1 ring-slate-200/60 border border-white/30 overflow-hidden flex flex-col max-h-[90vh] max-w-full w-full">
          
            {/* Header */}
            {/* ✅ PERFORMANCE: Simplified header background */}
            <div className="shrink-0 bg-gradient-to-r from-slate-50/95 to-white/95 border-b border-slate-200/60 px-4 sm:px-6 py-3 sm:py-4">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  {currentStep > (selectedTickets.length >= MIN_TICKETS_PER_PURCHASE ? 1 : 0) && (
                    <button
                      onClick={handleBack}
                      className="group relative bg-gradient-to-br from-slate-100 to-slate-50 hover:from-slate-200 hover:to-slate-100 text-slate-700 p-2 sm:p-2.5 rounded-xl transition-all duration-300 ease-out ring-1 ring-slate-200/50 hover:ring-slate-300/50 hover:shadow-md active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      disabled={isProcessing}
                    >
                      <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform duration-200" />
                    </button>
                  )}
                  <div className="space-y-1">
                    <h2 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                      {wizardSteps[selectedTickets.length >= MIN_TICKETS_PER_PURCHASE ? currentStep - 1 : currentStep]?.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 font-medium">
                      {wizardSteps[selectedTickets.length >= MIN_TICKETS_PER_PURCHASE ? currentStep - 1 : currentStep]?.description}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={onClose}
                  className="group text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100/80 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-300/50 active:scale-95"
                  disabled={isProcessing}
                >
                  <X size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                </button>
              </div>
              
              {/* Progress Indicator */}
              {renderStepProgress()}
            </div>

            {/* Content Container - Enhanced with Perfect Containment */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 max-w-full">
              <div className="p-4 sm:p-6 space-y-6 max-w-full overflow-hidden">
                
                <AnimatePresence mode="wait">
                  {/* Step 0: Quick Selection */}
                  {currentStep === 0 && (
                    <motion.div
                      key="step-0"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                    >
                      <QuickSelectionStep
                        onQuickSelect={handleQuickSelect}
                        validationError={validationErrors.quickSelect}
                        isSelectingTickets={isSelectingTickets}
                      />
                    </motion.div>
                  )}

                  {/* Step 1: Confirmation */}
                  {currentStep === 1 && (
                    <motion.div
                      key="step-1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                    >
                      <ConfirmationStep
                        selectedTickets={selectedTickets}
                        totalPrice={totalPrice}
                        validationError={validationErrors.tickets}
                      />
                    </motion.div>
                  )}

                  {/* Step 2: Payment Methods */}
                  {currentStep === 2 && (
                    <motion.div
                      key="step-2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="space-y-8 max-w-full overflow-hidden"
                    >
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: 0.1 }}
                      >
                        <StepHeader
                          icon={<CreditCard size={28} />}
                          title="Elige tu método de pago"
                          description="Selecciona cómo prefieres pagar"
                          color="blue"
                        />
                      </motion.div>

                      {/* Selected Tickets Summary - Enhanced Visibility */}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: 0.15 }}
                        className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-300 rounded-2xl p-5 shadow-lg shadow-blue-200/30"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                            <h4 className="font-bold text-blue-900 text-base">Tus números seleccionados</h4>
                          </div>
                          <span className="text-xs font-bold text-white bg-blue-600 px-3 py-1.5 rounded-full">
                            {selectedTickets.length} número{selectedTickets.length !== 1 ? 's' : ''}
                          </span>
                        </div>

                        {/* Numbers Display - Enhanced with Perfect Containment */}
                        {selectedTickets.length > 0 ? (
                          <div className="mb-4">
                            <div className="relative bg-white/90 rounded-2xl border border-blue-200/60 p-4 shadow-inner max-w-full overflow-hidden">
                              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-blue-50 max-w-full">
                                {selectedTickets.slice(0, 20).map((ticket, index) => (
                                  <motion.span
                                    key={ticket}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.02 }}
                                    className="relative text-xs font-mono font-bold bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-2 rounded-xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 whitespace-nowrap flex-shrink-0 max-w-full truncate"
                                  >
                                    <span className="relative z-10 truncate">{formatTicketNumber(ticket)}</span>
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-blue-500/20 rounded-xl opacity-0 hover:opacity-100 transition-opacity" />
                                  </motion.span>
                                ))}
                                {selectedTickets.length > 20 && (
                                  <motion.span
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="text-xs font-bold text-blue-700 bg-gradient-to-r from-blue-100 to-blue-200 px-3 py-2 rounded-xl border border-blue-300/50 whitespace-nowrap flex-shrink-0"
                                  >
                                    +{selectedTickets.length - 20} más
                                  </motion.span>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="mb-4 text-center py-4">
                            <div className="text-amber-600 font-bold text-sm">
                              ⚠️ No hay números seleccionados
                            </div>
                            <div className="text-xs text-amber-500 mt-1">
                              Regresa al paso anterior para seleccionar tus números
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-sm bg-white/60 rounded-lg p-3">
                          <span className="text-blue-700 font-bold">Total a pagar:</span>
                          <span className="text-blue-900 font-black text-xl">{formatPrice(totalPrice)}</span>
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.2 }}
                      >
                        {renderPaymentMethodAnimation()}
                      </motion.div>

                      {/* Payment Details Section */}
                      {selectedPaymentMethod && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: 0.2 }}
                          className="relative bg-gradient-to-br from-emerald-50 to-emerald-100/80 backdrop-blur-sm border border-emerald-200/60 rounded-2xl p-6 ring-1 ring-emerald-200/30 shadow-lg"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent rounded-2xl" />
                          <div className="relative">
                            {(() => {
                              const selectedMethod = mainPaymentMethods.find(m => m.id === selectedPaymentMethod);
                              if (!selectedMethod) return null;

                              return (
                                <div>
                                  <h4 className="font-bold text-emerald-900 mb-6 flex items-center gap-3 text-lg">
                                    <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg shadow-emerald-500/25">
                                      <CreditCard size={18} className="text-white" />
                                    </div>
                                    <span className="bg-gradient-to-r from-emerald-900 to-emerald-700 bg-clip-text text-transparent">
                                      Datos para tu transferencia - {selectedMethod.name}
                                    </span>
                                  </h4>

                                  <div className="bg-white/90 backdrop-blur-sm p-5 rounded-2xl space-y-4 ring-1 ring-emerald-200/50 shadow-md">
                                    {selectedMethod.id === 'binance' ? (
                                      <div className="space-y-4">
                                        <div className="group">
                                          <div className="flex items-center gap-2 mb-2">
                                            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                                            <span className="text-emerald-700 font-semibold">Email Binance Pay:</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <div className="flex-1 min-w-0 bg-slate-100 rounded-lg p-3 border border-slate-200 overflow-hidden">
                                              <span className="font-mono font-bold text-slate-900 text-sm break-words word-break-all overflow-wrap-anywhere">
                                                {selectedMethod.account}
                                              </span>
                                            </div>
                                            <button
                                              onClick={() => copyToClipboard(selectedMethod.account, 'binance-email')}
                                              className="flex-shrink-0 p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95"
                                              title="Copiar email"
                                            >
                                              {copiedField === 'binance-email' ? <CheckCircle size={16} /> : <Copy size={16} />}
                                            </button>
                                          </div>
                                        </div>


                                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                                          <p className="text-sm text-emerald-800 font-medium">
                                            💡 <strong>Importante:</strong> Transfiere el monto exacto en cualquier criptomoneda al email de Binance Pay. Los montos específicos aparecerán en el siguiente paso.
                                          </p>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="space-y-4">
                                        {/* Enhanced Account Details Display */}
                                        {selectedMethod.accountDetails?.split('\n').map((line: string, index: number) => {
                                          // Better parsing for account details
                                          const colonIndex = line.indexOf(':');
                                          if (colonIndex === -1) return null;

                                          const label = line.substring(0, colonIndex).trim();
                                          const value = line.substring(colonIndex + 1).trim();

                                          if (!value || !label) return null;

                                          // Special handling for different field types
                                          const isMainAccount = label.toLowerCase().includes('tarjeta') ||
                                                               label.toLowerCase().includes('referencia') ||
                                                               label.toLowerCase().includes('email');

                                          return (
                                            <div key={index} className={cn(
                                              "flex justify-between items-center group p-3 rounded-lg transition-all duration-200",
                                              isMainAccount ? "bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-200" : "bg-slate-50"
                                            )}>
                                              <span className="text-emerald-700 font-semibold flex items-center gap-2">
                                                <span className={cn(
                                                  "w-2 h-2 rounded-full",
                                                  isMainAccount ? "bg-emerald-500" : "bg-slate-400"
                                                )}></span>
                                                {label}:
                                              </span>
                                              <div className="flex items-center gap-2">
                                                <span className={cn(
                                                  "font-mono font-bold px-3 py-1 rounded-lg select-all",
                                                  isMainAccount
                                                    ? "text-emerald-900 bg-white border border-emerald-200"
                                                    : "text-slate-900 bg-slate-100"
                                                )}>
                                                  {value}
                                                </span>
                                                <button
                                                  onClick={() => copyToClipboard(value, `${selectedMethod.id}-${index}`)}
                                                  className={cn(
                                                    "p-2 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95",
                                                    isMainAccount
                                                      ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100"
                                                      : "text-slate-600 hover:text-slate-700 hover:bg-slate-200"
                                                  )}
                                                  title={`Copiar ${label.toLowerCase()}`}
                                                >
                                                  {copiedField === `${selectedMethod.id}-${index}` ?
                                                    <CheckCircle size={16} className="text-green-600" /> :
                                                    <Copy size={16} />
                                                  }
                                                </button>
                                              </div>
                                            </div>
                                          );
                                        })}

                                        {/* Payment Instructions */}
                                        <div className="bg-gradient-to-r from-emerald-50 to-blue-50 p-4 rounded-xl border border-emerald-200">
                                          <div className="flex items-start gap-3">
                                            <div className="p-2 bg-emerald-500 rounded-lg shadow-lg">
                                              <CheckCircle size={16} className="text-white" />
                                            </div>
                                            <div className="flex-1">
                                              <p className="text-sm text-emerald-800 font-medium mb-2">
                                                <strong>Instrucciones de pago:</strong>
                                              </p>
                                              <ul className="text-sm text-emerald-700 space-y-1">
                                                <li>• Transfiere exactamente <strong className="text-emerald-900">{formatPrice(totalPrice)}</strong></li>
                                                <li>• Usa los datos mostrados arriba</li>
                                                <li>• Conserva tu comprobante de pago</li>
                                                <li>• Sube la captura en el siguiente paso</li>
                                              </ul>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Validation Warning for Production - Hidden for better UX */}
                                        {false && process.env.NODE_ENV === 'production' && !paymentValidation.valid && paymentValidation.missing.length > 0 && (
                                          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                                            <div className="flex items-start gap-3">
                                              <div className="p-1 bg-amber-500 rounded-lg">
                                                <AlertTriangle size={14} className="text-white" />
                                              </div>
                                              <div className="flex-1">
                                                <p className="text-sm text-amber-800 font-medium mb-1">
                                                  ⚠️ Configuración de producción incompleta
                                                </p>
                                                <p className="text-xs text-amber-700">
                                                  Faltan variables de entorno: {paymentValidation.missing.join(', ')}
                                                </p>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </motion.div>
                      )}

                      {validationErrors.payment && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ErrorMessage message={validationErrors.payment} />
                        </motion.div>
                      )}
                    </motion.div>
                  )}

                  {/* Step 3: Customer Data */}
                  {currentStep === 3 && (
                    <motion.div
                      key="step-3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                    >
                      <CustomerDataStep
                        customerData={customerData}
                        onDataChange={setCustomerData}
                        validationErrors={validationErrors}
                        mexicanStates={mexicanStates}
                      />
                    </motion.div>
                  )}

                  {/* Step 4: Payment Proof */}
                  {currentStep === 4 && (
                    <motion.div
                      key="step-4"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                    >
                      <PaymentProofStep
                        selectedPaymentMethod={selectedPaymentMethod}
                        mainPaymentMethods={mainPaymentMethods}
                        customerData={customerData}
                        selectedTickets={selectedTickets}
                        totalPrice={totalPrice}
                        paymentScreenshot={paymentScreenshot}
                        previewUrl={previewUrl}
                        onFileChange={handleFileChange}
                        onRemoveFile={() => {
                          setPaymentScreenshot(null);
                          setPreviewUrl('');
                          setValidationErrors(prev => {
                        const { screenshot, ...rest } = prev;
                        return rest;
                      });
                        }}
                        validationError={validationErrors.screenshot}
                        copiedField={copiedField}
                        onCopyToClipboard={copyToClipboard}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-slate-200/60 bg-gradient-to-r from-white to-slate-50/80 backdrop-blur-sm px-4 sm:px-6 py-3 shadow-lg">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-3 text-xs sm:text-sm">
                  <span className="font-bold text-slate-700">
                    Paso {selectedTickets.length >= MIN_TICKETS_PER_PURCHASE ? currentStep : currentStep + 1} de {wizardSteps.length}
                  </span>
                  <div className="relative w-12 sm:w-16 bg-slate-200 rounded-full h-2 sm:h-3 overflow-hidden shadow-inner">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-600 to-blue-500 rounded-full transition-all duration-500 ease-out shadow-sm" 
                      style={{ 
                        width: `${((selectedTickets.length >= MIN_TICKETS_PER_PURCHASE ? currentStep : currentStep + 1) / wizardSteps.length) * 100}%` 
                      }}
                    />
                  </div>
                  <span className="text-slate-500 font-medium">
                    {Math.round(((selectedTickets.length >= MIN_TICKETS_PER_PURCHASE ? currentStep : currentStep + 1) / wizardSteps.length) * 100)}%
                  </span>
                </div>
                
                <div className="flex gap-2 sm:gap-3 w-full sm:w-auto justify-center sm:justify-end">
                  {currentStep < 4 && currentStep !== 0 && (
                    <button
                      onClick={handleNext}
                      disabled={isProcessing || supabaseLoading}
                      className={cn(
                        'group px-4 sm:px-6 py-2 sm:py-2.5 rounded-2xl font-bold text-sm transition-all duration-300',
                        'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white',
                        'hover:shadow-xl hover:shadow-blue-500/20 hover:scale-105 active:scale-95',
                        'focus:outline-none focus:ring-4 focus:ring-blue-300/30',
                        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
                        'flex items-center gap-2 ring-1 ring-blue-300/20',
                        'flex-1 sm:flex-initial justify-center'
                      )}
                    >
                      {supabaseLoading ? (
                        <>
                          <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Validando...</span>
                        </>
                      ) : (
                        <>
                          <span>Continuar</span>
                          <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform duration-200" />
                        </>
                      )}
                    </button>
                  )}
                  
                  {currentStep === 4 && (
                    <button
                      onClick={handleFinish}
                      disabled={isProcessing}
                      className={cn(
                        'group px-4 sm:px-6 py-2 sm:py-2.5 rounded-2xl font-bold text-sm transition-all duration-300',
                        'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white',
                        'hover:shadow-xl hover:shadow-emerald-500/20 hover:scale-105 active:scale-95',
                        'focus:outline-none focus:ring-4 focus:ring-emerald-300/30',
                        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
                        'flex items-center gap-2 ring-1 ring-emerald-300/20',
                        'flex-1 sm:flex-initial justify-center'
                      )}
                    >
                      {isProcessing ? (
                        <>
                          <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Procesando...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle size={14} className="group-hover:scale-110 transition-transform duration-200" />
                          <span>Confirmar Compra</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
});

// ✅ PERFORMANCE: Set display name for debugging
PurchaseWizard.displayName = 'PurchaseWizard';

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface StepHeaderProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

const StepHeader: React.FC<StepHeaderProps> = ({ icon, title, description, color }) => (
  <div className="text-center space-y-4">
    <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto">
      <div className={`absolute inset-0 bg-gradient-to-br from-${color}-400 to-${color}-600 rounded-3xl shadow-2xl shadow-${color}-500/30 animate-pulse`} />
      <div className={`relative w-full h-full bg-gradient-to-br from-${color}-500 to-${color}-600 rounded-3xl flex items-center justify-center`}>
        <div className="text-white drop-shadow-lg">
          {icon}
        </div>
      </div>
    </div>
    <div className="space-y-2">
      <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
        {title}
      </h3>
      <p className="text-slate-600 text-base sm:text-lg font-medium">
        {description}
      </p>
    </div>
  </div>
);

interface ErrorMessageProps {
  message: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => (
  <div className="relative bg-gradient-to-r from-red-50 to-red-100/80 backdrop-blur-sm border border-red-200/60 rounded-2xl p-4 text-center ring-1 ring-red-200/30 animate-in fade-in-50 slide-in-from-top-2 duration-300">
    <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent rounded-2xl" />
    <p className="relative text-red-800 text-sm font-bold flex items-center justify-center gap-2">
      <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
        <AlertCircle size={12} className="text-white" />
      </div>
      {message}
    </p>
  </div>
);

interface QuickSelectionStepProps {
  onQuickSelect: (count: number) => void;
  validationError?: string;
  isSelectingTickets?: boolean;
}

const QuickSelectionStep: React.FC<QuickSelectionStepProps> = ({ onQuickSelect, validationError, isSelectingTickets }) => (
  <div className="space-y-6 max-w-full overflow-hidden">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <StepHeader
        icon={<Zap size={28} />}
        title="Compra Rápida"
        description="Elige cuántos números quieres"
        color="emerald"
      />
    </motion.div>

    {validationError && (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <ErrorMessage message={validationError} />
      </motion.div>
    )}

    {/* Quick Buy Cards Grid - Enhanced for all cards */}
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full">
      {QUICK_SELECT_OPTIONS.map((option, index) => {
        console.log(`🔄 Renderizando card ${index}: ${option.tickets} boletos, disabled: ${isSelectingTickets}`);
        return (
          <OptimizedQuickSelectCard
            key={`quick-${option.tickets}`}
            option={option}
            onSelect={() => {
              console.log(`🎯 onSelect triggered para ${option.tickets} boletos`);
              onQuickSelect(option.tickets);
            }}
            disabled={isSelectingTickets}
          />
        );
      })}
    </div>

    {/* Benefits Section */}
    <div className="relative bg-gradient-to-r from-blue-50 to-blue-100/80 backdrop-blur-sm border border-blue-200/60 rounded-2xl p-6 ring-1 ring-blue-200/30 shadow-lg">
      <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent rounded-2xl" />
      <div className="relative">
        <h4 className="font-bold text-blue-900 mb-4 flex items-center gap-3 text-lg">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg shadow-blue-500/25">
            <Sparkles size={18} className="text-white" />
          </div>
          <span className="bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent">
            ¿Por qué elegir Compra Rápida?
          </span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-3">
            <CheckCircle size={16} className="text-blue-600 flex-shrink-0" />
            <span className="text-blue-800 font-medium">Números asignados al instante</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle size={16} className="text-blue-600 flex-shrink-0" />
            <span className="text-blue-800 font-medium">Descuentos automáticos por volumen</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle size={16} className="text-blue-600 flex-shrink-0" />
            <span className="text-blue-800 font-medium">Proceso más rápido</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle size={16} className="text-blue-600 flex-shrink-0" />
            <span className="text-blue-800 font-medium">Misma probabilidad de ganar</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

interface ConfirmationStepProps {
  selectedTickets: number[];
  totalPrice: number;
  validationError?: string;
}

const ConfirmationStep: React.FC<ConfirmationStepProps> = ({ selectedTickets, totalPrice, validationError }) => {
  const winProbability = ((selectedTickets.length / 10000) * 100).toFixed(2);
  const savingsAmount = selectedTickets.length >= 10 ? (selectedTickets.length * 250 - totalPrice) : 0;

  return (
    <div className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
      <StepHeader
        icon={<CheckCircle size={20} />}
        title="¡Excelente selección!"
        description={`${selectedTickets.length} número${selectedTickets.length !== 1 ? 's' : ''} reservado${selectedTickets.length !== 1 ? 's' : ''} por 30 minutos`}
        color="blue"
      />

      {validationError && <ErrorMessage message={validationError} />}

      {/* Reservation Timer & Trust Indicator */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl p-4"
      >
        <div className="flex items-center justify-center gap-3 text-emerald-800">
          <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
          <span className="font-bold text-sm">
            ✅ Tus números están reservados por 30 minutos
          </span>
        </div>
        <div className="text-xs text-emerald-600 text-center mt-1 font-medium">
          Nadie más puede seleccionarlos durante este tiempo
        </div>
      </motion.div>

      {/* Enhanced Stats Grid - Mobile Optimized with Proper Containment */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Tickets Count */}
        <div className="group relative overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 text-center ring-1 ring-slate-200/50 hover:ring-slate-300/60 hover:shadow-lg transition-all duration-300 min-w-0">
          <div className="relative z-10">
            <div className="text-2xl sm:text-3xl font-black bg-gradient-to-br from-slate-800 to-slate-600 bg-clip-text text-transparent mb-2 leading-none truncate">
              {selectedTickets.length}
            </div>
            <div className="text-xs sm:text-sm font-semibold text-slate-600 uppercase tracking-wider">
              Números
            </div>
          </div>
        </div>

        {/* Total Price */}
        <div className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 text-center ring-1 ring-blue-200/40 hover:ring-blue-300/50 hover:shadow-lg transition-all duration-300 min-w-0">
          <div className="relative z-10">
            <div className="text-xl sm:text-2xl lg:text-3xl font-black bg-gradient-to-br from-slate-700 to-slate-600 bg-clip-text text-transparent mb-2 leading-none truncate">
              {formatPrice(totalPrice)}
            </div>
            <div className="text-xs sm:text-sm font-semibold text-emerald-700 uppercase tracking-wider">
              Total a Pagar
            </div>
            {savingsAmount > 0 && (
              <div className="text-xs text-emerald-600 font-bold mt-1 truncate">
                Ahorras {formatPrice(savingsAmount)}
              </div>
            )}
          </div>
        </div>

        {/* Win Probability */}
        <div className="group relative overflow-hidden bg-gradient-to-br from-orange-50 to-yellow-50 backdrop-blur-sm rounded-2xl p-4 sm:p-6 text-center ring-1 ring-orange-200/40 hover:ring-orange-300/50 hover:shadow-lg transition-all duration-300 min-w-0">
          <div className="relative z-10">
            <div className="text-2xl sm:text-3xl font-black bg-gradient-to-br from-orange-700 to-yellow-600 bg-clip-text text-transparent mb-2 leading-none truncate">
              {winProbability}%
            </div>
            <div className="text-xs sm:text-sm font-semibold text-orange-700 uppercase tracking-wider">
              Probabilidad
            </div>
          </div>
        </div>
      </div>

      {/* Trust Indicators & Process Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Security Info */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100/80 backdrop-blur-sm border border-blue-200/60 rounded-2xl p-5 ring-1 ring-blue-200/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
              <CheckCircle size={16} className="text-white" />
            </div>
            <h4 className="font-bold text-blue-900 text-sm">Proceso Seguro</h4>
          </div>
          <div className="space-y-2 text-xs text-blue-800">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
              <span>Compra 100% segura y confiable</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
              <span>Confirmación instantánea por WhatsApp</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
              <span>Soporte personalizado 24/7</span>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 backdrop-blur-sm border border-emerald-200/60 rounded-2xl p-5 ring-1 ring-emerald-200/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl shadow-lg">
              <ArrowRight size={16} className="text-white" />
            </div>
            <h4 className="font-bold text-emerald-900 text-sm">Siguientes Pasos</h4>
          </div>
          <div className="space-y-2 text-xs text-emerald-800">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-4 h-4 bg-emerald-500 text-white rounded-full text-xs font-bold">1</span>
              <span>Elige tu método de pago favorito</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-4 h-4 bg-emerald-500 text-white rounded-full text-xs font-bold">2</span>
              <span>Completa tus datos de contacto</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-4 h-4 bg-emerald-500 text-white rounded-full text-xs font-bold">3</span>
              <span>Sube tu comprobante y ¡listo!</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface PaymentMethodCardProps {
  method: any;
  isSelected: boolean;
  onSelect: () => void;
  expanded?: boolean;
  animationDelay: number;
  selectedTickets: number[];
  convertedAmounts: any;
  cryptoLoading: boolean;
  lastUpdate: Date | null;
}

const PaymentMethodCard: React.FC<PaymentMethodCardProps> = ({ 
  method, 
  isSelected, 
  onSelect, 
  expanded = false, 
  animationDelay,
  selectedTickets,
  convertedAmounts,
  cryptoLoading,
  lastUpdate
}) => (
  <div className="space-y-3">
    <motion.button
      onClick={onSelect}
      className={cn(
        'group w-full rounded-3xl border-2 text-center relative backdrop-blur-sm overflow-hidden',
        'focus:outline-none focus:ring-4',
        'min-w-0 max-w-full', // Prevent overflow
        expanded
          ? 'px-4 pt-8 pb-4 min-h-[80px] border-blue-500 bg-gradient-to-r from-blue-50 to-blue-100/90 ring-4 ring-blue-200/60 shadow-2xl shadow-blue-500/25'
          : 'px-4 pt-10 pb-6 sm:px-6 sm:pt-12 sm:pb-8 min-h-[120px] sm:min-h-[140px]',
        isSelected && !expanded
          ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100/90 ring-4 ring-blue-200/60 shadow-2xl shadow-blue-500/25'
          : !expanded && 'border-slate-200/60 bg-gradient-to-br from-white via-white to-slate-50/40 hover:border-blue-300/70 hover:shadow-blue-100/30 ring-1 ring-slate-200/30'
      )}
      whileHover={{ 
        scale: expanded ? 1.01 : 1.02,
        boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)"
      }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      {/* Selection Indicator - Fixed positioning for proper containment */}
      {isSelected && !expanded && (
        <div className="absolute top-3 right-3 z-10">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500 rounded-full blur animate-pulse" />
            <div className="relative w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/40">
              <CheckCircle size={16} className="text-white" />
            </div>
          </div>
        </div>
      )}

      <div className={cn(
        'flex items-center justify-center space-y-3 h-full',
        expanded ? 'flex-row gap-4' : 'flex-col'
      )}>
        {/* Logo Container */}
        <div className={cn(
          'relative flex items-center justify-center',
          expanded ? 'w-16 h-16' : 'flex-1 w-full'
        )}>
          <div className="absolute inset-0 bg-gradient-to-br from-white/80 to-slate-100/60 rounded-2xl shadow-inner" />
          <div className={cn(
            'relative bg-gradient-to-br from-white to-slate-50/80 rounded-2xl shadow-xl ring-1 ring-slate-200/50 group-hover:shadow-2xl transition-all duration-300 flex items-center justify-center',
            expanded ? 'w-16 h-16 p-4' : 'px-4 py-6 sm:px-6 sm:py-8 w-full h-full'
          )}>
            <img
              src={method.icon}
              alt={method.name}
              className={cn(
                'object-contain filter group-hover:scale-105 transition-transform duration-300',
                expanded 
                  ? (method.id === 'binance' ? 'max-w-12 max-h-12' : 'max-w-8 max-h-8')
                  : (method.id === 'binance' ? 'max-w-full max-h-[100px] sm:max-h-[120px]' : 'max-w-full max-h-[60px] sm:max-h-[80px]')
              )}
            />
          </div>
        </div>
        
        {/* Payment Method Info */}
        <div className={cn(
          'text-center space-y-2',
          expanded ? 'flex-1 text-left' : 'flex-shrink-0'
        )}>
          <div className="font-black text-slate-900 text-sm sm:text-base group-hover:text-blue-700 transition-colors duration-200">
            {method.name}
          </div>
          {method.enabled && (
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-800 text-xs px-2 py-1 rounded-full font-bold shadow-sm ring-1 ring-emerald-200/50">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Disponible 24/7
              </span>
              <div className="text-xs text-slate-600 font-medium">
                {method.id === 'binance' && 'Criptomonedas'}
                {method.id === 'oxxo' && 'Efectivo'}
                {(method.id === 'bancoppel' || method.id === 'bancoazteca') && 'Transferencia'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hover Effect Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-blue-500/0 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl pointer-events-none" />
    </motion.button>

    {/* Payment Details */}
    {isSelected && expanded && (
      <div className="relative bg-gradient-to-br from-slate-50 to-slate-100/50 backdrop-blur-sm rounded-2xl p-6 ring-1 ring-slate-200/50 animate-in slide-in-from-top-4 fade-in-50 duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent rounded-2xl" />
        <div className="relative space-y-4">
          <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-3 text-base">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg shadow-blue-500/25">
              <FileText size={16} className="text-white" />
            </div>
            <span className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              {method.id === 'binance' ? 'Montos Exactos en Criptomonedas' : `Datos para ${method.name}`}
            </span>
            {method.id === 'binance' && lastUpdate && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Actualizado: {lastUpdate.toLocaleTimeString()}
              </div>
            )}
          </h4>
          
          {/* Binance Crypto Conversions */}
          {method.id === 'binance' && (
            <div className="space-y-6">
              {/* Total Amount Header - Enhanced */}
              <div className="mb-6 p-6 bg-gradient-to-r from-yellow-50 via-orange-50 to-red-50 rounded-2xl border-2 border-yellow-200/80 shadow-lg ring-1 ring-yellow-300/20">
                <div className="flex items-center gap-3 text-yellow-900 font-bold text-lg mb-2">
                  <div className="p-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg shadow-md">
                    <Sparkles size={20} className="text-white" />
                  </div>
                  <span className="bg-gradient-to-r from-yellow-900 via-orange-900 to-red-900 bg-clip-text text-transparent">
                    Total: {selectedTickets.length * 250} MXN
                  </span>
                </div>
                <div className="text-base text-yellow-800 font-semibold ml-14">
                  Selecciona tu criptomoneda preferida:
                </div>
              </div>

              {/* 🔥 RECOMENDADAS - Enhanced Section */}
              <div className="mb-8 p-5 bg-gradient-to-br from-red-50 via-orange-50 to-pink-50 rounded-3xl border-2 border-red-200/70 shadow-xl ring-2 ring-red-100/50">
                <div className="flex items-center gap-3 text-red-800 font-black text-base mb-5">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-lg" />
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse delay-150 shadow-md" />
                  </div>
                  <span className="bg-gradient-to-r from-red-700 via-orange-700 to-pink-700 bg-clip-text text-transparent">
                    🔥 RECOMENDADAS - RÁPIDAS Y ECONÓMICAS
                  </span>
                </div>
                
                <div className="space-y-4">
                  {/* BTC - Enhanced Premium Card */}
                  <div className="group relative bg-gradient-to-br from-orange-50 via-yellow-50 to-amber-50 backdrop-blur-sm pt-8 pb-6 px-6 rounded-3xl border-3 border-orange-300/70 hover:border-orange-400/90 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] ring-2 ring-orange-200/40 hover:ring-orange-300/60 overflow-hidden">
                    {/* Enhanced Badge BTC - Properly Contained */}
                    <div className="absolute top-3 right-3 z-10">
                      <div className="bg-gradient-to-r from-orange-500 via-yellow-500 to-amber-500 text-white text-xs font-black px-2 py-1 rounded-full shadow-lg transform rotate-12 border border-white backdrop-blur-sm">
                        💎 POPULAR
                      </div>
                    </div>
                    
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-100/50 via-yellow-100/50 to-amber-100/50 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl ring-4 ring-orange-200/60 group-hover:ring-orange-300/80 transition-all duration-300">
                          <CryptoIcon symbol="BTC" size={64} />
                        </div>
                        <div>
                          <div className="font-black text-orange-900 text-2xl mb-1">Bitcoin</div>
                          <div className="text-sm text-orange-700 font-bold bg-orange-100/60 px-3 py-1 rounded-full">
                            BTC Network • La más confiable
                          </div>
                        </div>
                      </div>
                      <div className="text-right space-y-3">
                        <div className="bg-gradient-to-r from-orange-100 to-yellow-100 p-3 rounded-2xl border border-orange-200/60 shadow-inner">
                          <div className="font-mono font-black text-orange-900 text-2xl leading-none">
                            {cryptoLoading || !convertedAmounts ? (
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
                                <span className="text-lg">Cargando...</span>
                              </div>
                            ) : (
                              `${convertedAmounts?.BTC?.toFixed(8) || '...'} BTC`
                            )}
                          </div>
                          <div className="text-sm text-orange-700 font-bold mt-1">
                            ≈ ${selectedTickets.length * 250} MXN
                          </div>
                        </div>
                        <button
                          onClick={() => convertedAmounts?.BTC && navigator.clipboard.writeText(convertedAmounts.BTC.toString())}
                          className="w-full px-5 py-3 rounded-2xl text-sm font-black transition-all duration-300 ring-2 shadow-xl active:scale-95 bg-gradient-to-r from-orange-200 to-yellow-200 text-orange-900 hover:from-orange-300 hover:to-yellow-300 ring-orange-400/60 hover:shadow-2xl hover:scale-105 border border-orange-300/50"
                        >
                          <Copy size={14} className="inline mr-2" />
                          Copiar Monto BTC
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* SOL - Enhanced Premium Card */}
                  <div className="group relative bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 backdrop-blur-sm pt-8 pb-6 px-6 rounded-3xl border-3 border-violet-300/70 hover:border-violet-400/90 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] ring-2 ring-violet-200/40 hover:ring-violet-300/60 overflow-hidden">
                    {/* Enhanced Badge SOL - Properly Contained */}
                    <div className="absolute top-3 left-3 z-10">
                      <div className="bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 text-white text-xs font-black px-2 py-1 rounded-full shadow-lg transform -rotate-12 border border-white backdrop-blur-sm">
                        ⚡ RÁPIDA
                      </div>
                    </div>
                    
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-100/50 via-purple-100/50 to-indigo-100/50 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl ring-4 ring-violet-200/60 group-hover:ring-violet-300/80 transition-all duration-300">
                          <CryptoIcon symbol="SOL" size={64} />
                        </div>
                        <div>
                          <div className="font-black text-violet-900 text-2xl mb-1">Solana</div>
                          <div className="text-sm text-violet-700 font-bold bg-violet-100/60 px-3 py-1 rounded-full">
                            SOL Network • Ultra rápida
                          </div>
                        </div>
                      </div>
                      <div className="text-right space-y-3">
                        <div className="bg-gradient-to-r from-violet-100 to-purple-100 p-3 rounded-2xl border border-violet-200/60 shadow-inner">
                          <div className="font-mono font-black text-violet-900 text-2xl leading-none">
                            {cryptoLoading || !convertedAmounts ? (
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 border-3 border-violet-500 border-t-transparent rounded-full animate-spin" />
                                <span className="text-lg">Cargando...</span>
                              </div>
                            ) : (
                              `${convertedAmounts?.SOL?.toFixed(4) || '...'} SOL`
                            )}
                          </div>
                          <div className="text-sm text-violet-700 font-bold mt-1">
                            ≈ ${selectedTickets.length * 250} MXN
                          </div>
                        </div>
                        <button
                          onClick={() => convertedAmounts?.SOL && navigator.clipboard.writeText(convertedAmounts.SOL.toString())}
                          className="w-full px-5 py-3 rounded-2xl text-sm font-black transition-all duration-300 ring-2 shadow-xl active:scale-95 bg-gradient-to-r from-violet-200 to-purple-200 text-violet-900 hover:from-violet-300 hover:to-purple-300 ring-violet-400/60 hover:shadow-2xl hover:scale-105 border border-violet-300/50"
                        >
                          <Copy size={14} className="inline mr-2" />
                          Copiar Monto SOL
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Otras Opciones - Enhanced Secondary Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-slate-700 font-bold text-lg mb-4">
                  <div className="p-2 bg-gradient-to-r from-slate-400 to-slate-500 rounded-lg shadow-md">
                    <div className="text-white font-black text-sm">💰</div>
                  </div>
                  <span>Otras opciones disponibles:</span>
                </div>

                <div className="grid gap-4">
                  {/* USDT - Enhanced */}
                  <div className="group relative bg-gradient-to-r from-green-50 to-emerald-50 backdrop-blur-sm p-5 rounded-2xl border-2 border-green-200/70 hover:border-green-300/80 hover:shadow-xl transition-all duration-300 hover:scale-[1.01]">
                    <div className="absolute inset-0 bg-gradient-to-r from-green-100/30 to-emerald-100/30 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ring-3 ring-green-200/50">
                          <CryptoIcon symbol="USDT" size={48} />
                        </div>
                        <div>
                          <div className="font-black text-green-800 text-lg">USDT (Tether)</div>
                          <div className="text-sm text-green-600 font-semibold bg-green-100/60 px-2 py-1 rounded-full">TRC20 Network</div>
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        <div className="bg-green-100/60 p-2 rounded-xl border border-green-200/50">
                          <div className="font-mono font-black text-green-800 text-lg">
                            {cryptoLoading || !convertedAmounts ? '...' : `${convertedAmounts?.USDT?.toFixed(2) || '...'} USDT`}
                          </div>
                          <div className="text-xs text-green-600 font-bold">
                            ≈ ${selectedTickets.length * 250} MXN
                          </div>
                        </div>
                        <button
                          onClick={() => convertedAmounts?.USDT && navigator.clipboard.writeText(convertedAmounts.USDT.toString())}
                          className="px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 ring-2 shadow-lg active:scale-95 bg-gradient-to-r from-green-200 to-emerald-200 text-green-800 hover:from-green-300 hover:to-emerald-300 ring-green-300/50 hover:shadow-xl"
                        >
                          <Copy size={12} className="inline mr-2" />
                          Copiar USDT
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* USDC - Enhanced */}
                  <div className="group relative bg-gradient-to-r from-blue-50 to-cyan-50 backdrop-blur-sm p-5 rounded-2xl border-2 border-blue-200/70 hover:border-blue-300/80 hover:shadow-xl transition-all duration-300 hover:scale-[1.01]">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-100/30 to-cyan-100/30 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ring-3 ring-blue-200/50">
                          <CryptoIcon symbol="USDC" size={48} />
                        </div>
                        <div>
                          <div className="font-black text-blue-800 text-lg">USDC (USD Coin)</div>
                          <div className="text-sm text-blue-600 font-semibold bg-blue-100/60 px-2 py-1 rounded-full">ERC20 Network</div>
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        <div className="bg-blue-100/60 p-2 rounded-xl border border-blue-200/50">
                          <div className="font-mono font-black text-blue-800 text-lg">
                            {cryptoLoading || !convertedAmounts ? '...' : `${convertedAmounts?.USDC?.toFixed(2) || '...'} USDC`}
                          </div>
                          <div className="text-xs text-blue-600 font-bold">
                            ≈ ${selectedTickets.length * 250} MXN
                          </div>
                        </div>
                        <button
                          onClick={() => convertedAmounts?.USDC && navigator.clipboard.writeText(convertedAmounts.USDC.toString())}
                          className="px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 ring-2 shadow-lg active:scale-95 bg-gradient-to-r from-blue-200 to-cyan-200 text-blue-800 hover:from-blue-300 hover:to-cyan-300 ring-blue-300/50 hover:shadow-xl"
                        >
                          <Copy size={12} className="inline mr-2" />
                          Copiar USDC
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ETH - Enhanced */}
                  <div className="group relative bg-gradient-to-r from-purple-50 to-indigo-50 backdrop-blur-sm p-5 rounded-2xl border-2 border-purple-200/70 hover:border-purple-300/80 hover:shadow-xl transition-all duration-300 hover:scale-[1.01]">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-100/30 to-indigo-100/30 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ring-3 ring-purple-200/50">
                          <CryptoIcon symbol="ETH" size={48} />
                        </div>
                        <div>
                          <div className="font-black text-purple-800 text-lg">Ethereum</div>
                          <div className="text-sm text-purple-600 font-semibold bg-purple-100/60 px-2 py-1 rounded-full">ERC20 Network</div>
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        <div className="bg-purple-100/60 p-2 rounded-xl border border-purple-200/50">
                          <div className="font-mono font-black text-purple-800 text-lg">
                            {cryptoLoading || !convertedAmounts ? '...' : `${convertedAmounts?.ETH?.toFixed(6) || '...'} ETH`}
                          </div>
                          <div className="text-xs text-purple-600 font-bold">
                            ≈ ${selectedTickets.length * 250} MXN
                          </div>
                        </div>
                        <button
                          onClick={() => convertedAmounts?.ETH && navigator.clipboard.writeText(convertedAmounts.ETH.toString())}
                          className="px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 ring-2 shadow-lg active:scale-95 bg-gradient-to-r from-purple-200 to-indigo-200 text-purple-800 hover:from-purple-300 hover:to-indigo-300 ring-purple-300/50 hover:shadow-xl"
                        >
                          <Copy size={12} className="inline mr-2" />
                          Copiar ETH
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Wallet Address - Dramatically Enhanced */}
              <div className="mt-8 p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl border-2 border-slate-700/60 shadow-2xl ring-2 ring-slate-600/30">
                <div className="space-y-4">
                  {/* Header with Icon */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl shadow-lg ring-2 ring-blue-400/30">
                      <div className="text-white font-bold text-lg">📧</div>
                    </div>
                    <div>
                      <div className="text-slate-200 font-black text-xl">Dirección de Wallet Binance</div>
                      <div className="text-slate-400 text-sm font-semibold">Envía a esta dirección exacta</div>
                    </div>
                  </div>

                  {/* QR Code Placeholder */}
                  <div className="flex flex-col md:flex-row gap-6 items-center">
                    <div className="flex-shrink-0">
                      <div className="w-32 h-32 bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl flex flex-col items-center justify-center border-2 border-slate-600/50 shadow-xl">
                        <div className="text-slate-400 text-3xl mb-2">📱</div>
                        <div className="text-slate-400 text-xs font-bold text-center px-2">QR próximamente</div>
                      </div>
                    </div>

                    {/* Wallet Address */}
                    <div className="flex-1 space-y-4">
                      <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-5 rounded-2xl border border-slate-600/50 shadow-inner">
                        <div className="text-slate-300 font-bold text-sm mb-2 uppercase tracking-wide">Email de Wallet:</div>
                        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-600/30">
                          <div className="font-mono font-bold text-white text-xl break-all leading-relaxed tracking-wide">
                            rifadesilverado2024@gmail.com
                          </div>
                        </div>
                      </div>

                      {/* Copy Button - Enhanced */}
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText('rifadesilverado2024@gmail.com');
                          // Visual feedback could be added here
                        }}
                        className="w-full px-6 py-4 rounded-2xl text-base font-black transition-all duration-300 ring-3 shadow-xl active:scale-95 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 text-white hover:from-blue-600 hover:via-purple-600 hover:to-indigo-600 ring-blue-400/50 hover:shadow-2xl hover:scale-105 border border-blue-400/30"
                      >
                        <Copy size={16} className="inline mr-3" />
                        Copiar Dirección de Wallet
                      </button>
                    </div>
                  </div>

                  {/* Trust Indicators */}
                  <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-700/50">
                    <div className="flex items-center gap-2 bg-green-900/30 text-green-300 px-3 py-2 rounded-full text-xs font-bold border border-green-700/50">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      Verificado
                    </div>
                    <div className="flex items-center gap-2 bg-blue-900/30 text-blue-300 px-3 py-2 rounded-full text-xs font-bold border border-blue-700/50">
                      <div className="w-2 h-2 bg-blue-400 rounded-full" />
                      Binance Pay
                    </div>
                    <div className="flex items-center gap-2 bg-purple-900/30 text-purple-300 px-3 py-2 rounded-full text-xs font-bold border border-purple-700/50">
                      <div className="w-2 h-2 bg-purple-400 rounded-full" />
                      Procesamiento Rápido
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Regular Payment Method Details */}
          {method.id !== 'binance' && method.accountDetails && (
            <div className="space-y-3">
              {method.accountDetails.split('\n').map((line: string, index: number) => (
                <div key={index} className="group relative bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-slate-200/60 hover:border-slate-300/60 hover:shadow-lg transition-all duration-200">
                  <div className="absolute inset-0 bg-gradient-to-r from-white/60 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  <div className="relative flex items-center justify-between">
                    <span className="text-slate-800 text-sm flex-1 mr-3 font-mono font-medium">{line}</span>
                    <button
                      onClick={() => {
                        const textToCopy = line.split(': ')[1] || line;
                        navigator.clipboard.writeText(textToCopy);
                      }}
                      className="px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 ring-1 shadow-sm active:scale-95 bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 hover:from-slate-200 hover:to-slate-300 ring-slate-200/50 hover:shadow-md"
                    >
                      <Copy size={12} className="inline mr-1.5" />
                      Copiar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Enhanced Instructions Section */}
          {method.id === 'binance' ? (
            <div className="mt-6 space-y-4">
              {/* Main Instruction Card */}
              <div className="relative bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 p-6 rounded-3xl border-2 border-amber-200/80 shadow-xl ring-2 ring-amber-100/50">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-100/30 via-orange-100/30 to-red-100/30 rounded-3xl" />
                <div className="relative space-y-4">
                  {/* Header with Strong Icon */}
                  <div className="flex items-center gap-4 mb-3">
                    <div className="p-3 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-2xl shadow-xl ring-2 ring-amber-300/50">
                      <FileText size={20} className="text-white" />
                    </div>
                    <div>
                      <div className="text-amber-900 font-black text-xl">Instrucciones de Pago</div>
                      <div className="text-amber-700 font-bold text-sm">Sigue estos pasos exactamente</div>
                    </div>
                  </div>

                  {/* Step-by-step Instructions */}
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-white/60 rounded-xl border border-amber-200/50">
                      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center text-white font-black text-sm shadow-lg">
                        1
                      </div>
                      <div className="text-amber-900 font-bold text-base leading-relaxed">
                        Copia el <span className="bg-amber-200/60 px-2 py-1 rounded-lg font-black">monto EXACTO</span> de tu criptomoneda preferida
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-white/60 rounded-xl border border-amber-200/50">
                      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white font-black text-sm shadow-lg">
                        2
                      </div>
                      <div className="text-amber-900 font-bold text-base leading-relaxed">
                        Envía a la dirección: <span className="bg-slate-800 text-white px-2 py-1 rounded-lg font-mono text-sm">rifadesilverado2024@gmail.com</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-white/60 rounded-xl border border-amber-200/50">
                      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center text-white font-black text-sm shadow-lg">
                        3
                      </div>
                      <div className="text-amber-900 font-bold text-base leading-relaxed">
                        Sube el <span className="bg-green-200/60 px-2 py-1 rounded-lg font-black">comprobante de pago</span> en el siguiente paso
                      </div>
                    </div>
                  </div>

                  {/* Important Note */}
                  <div className="mt-4 p-4 bg-gradient-to-r from-red-100 to-pink-100 rounded-2xl border-2 border-red-200/70 shadow-inner">
                    <div className="flex items-center gap-3">
                      <div className="text-red-600 text-2xl">⚠️</div>
                      <div>
                        <div className="text-red-900 font-black text-sm">IMPORTANTE</div>
                        <div className="text-red-800 font-bold text-sm">El monto debe ser exacto para procesar tu compra correctamente</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative bg-gradient-to-r from-blue-50 to-blue-100/80 backdrop-blur-sm p-4 rounded-2xl border border-blue-200/60 ring-1 ring-blue-200/30">
              <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent rounded-2xl" />
              <p className="relative text-blue-800 text-sm font-medium flex items-start gap-3">
                <div className="p-1.5 bg-blue-500 rounded-lg shadow-sm">
                  <FileText size={12} className="text-white" />
                </div>
                <span className="leading-relaxed">
                  Realiza tu transferencia y sube el comprobante en el siguiente paso
                </span>
              </p>
            </div>
          )}
        </div>
      </div>
    )}
  </div>
);

interface CustomerDataStepProps {
  customerData: CustomerData;
  onDataChange: (data: React.SetStateAction<CustomerData>) => void;
  validationErrors: ValidationErrors;
  mexicanStates: string[];
}

const CustomerDataStep: React.FC<CustomerDataStepProps> = ({
  customerData,
  onDataChange,
  validationErrors,
  mexicanStates
}) => {
  const [fieldFocus, setFieldFocus] = useState<string>('');
  const [isFormValid, setIsFormValid] = useState(false);

  // Real-time form validation
  useEffect(() => {
    const requiredFields = ['name', 'phone', 'email', 'city'];
    const allFieldsFilled = requiredFields.every(field => customerData[field]?.trim());
    const noErrors = Object.keys(validationErrors).length === 0;
    setIsFormValid(allFieldsFilled && noErrors);
  }, [customerData, validationErrors]);

  // Smart phone formatting
  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.startsWith('52')) {
      return `+${cleaned}`;
    }
    if (cleaned.length === 10) {
      return `+52 ${cleaned}`;
    }
    return value;
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in-50 slide-in-from-bottom-4 duration-500 max-w-full overflow-hidden">
      {/* Premium Header with Trust Indicators */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4 max-w-full"
      >
        <div className="relative w-20 h-20 mx-auto">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-orange-600 rounded-3xl shadow-2xl shadow-orange-500/30 animate-pulse" />
          <div className="relative w-full h-full bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl flex items-center justify-center">
            <Users size={32} className="text-white drop-shadow-lg" />
          </div>
        </div>
        <div className="space-y-3">
          <h3 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            Información de entrega
          </h3>
          <p className="text-slate-600 text-base font-medium max-w-md mx-auto leading-relaxed">
            Datos seguros para contactarte cuando seas el ganador
          </p>

          {/* Trust Indicators */}
          <div className="flex items-center justify-center gap-6 pt-2">
            <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="font-bold">100% Seguro</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="font-bold">Datos Protegidos</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Enhanced Progress Indicator */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50 border-2 border-orange-200/60 rounded-3xl p-6 shadow-lg shadow-orange-200/30 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-white/40 to-transparent rounded-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl shadow-lg">
                <FileText size={16} className="text-white" />
              </div>
              <span className="text-base font-black text-orange-900">Progreso del formulario</span>
            </div>
            <span className="text-sm font-black text-orange-700 bg-orange-100 px-3 py-1.5 rounded-full">
              {Object.values(customerData).filter(v => v?.trim()).length}/5 campos
            </span>
          </div>
          <div className="w-full bg-orange-200/60 rounded-full h-3 shadow-inner">
            <motion.div
              className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 h-3 rounded-full shadow-lg"
              initial={{ width: 0 }}
              animate={{ width: `${(Object.values(customerData).filter(v => v?.trim()).length / 5) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          {isFormValid && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center justify-center gap-3 mt-4 text-emerald-700 bg-emerald-50 rounded-2xl p-3 border border-emerald-200"
            >
              <CheckCircle size={20} className="text-emerald-600" />
              <span className="text-sm font-black">¡Formulario completo y listo!</span>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Premium Form Fields Container - Enhanced with Perfect Containment */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative bg-white rounded-3xl border-2 border-slate-200/60 p-6 sm:p-8 shadow-xl shadow-slate-200/50 overflow-hidden max-w-full"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white to-slate-50/30 rounded-3xl" />
        <div className="relative space-y-6 sm:space-y-8 max-w-full overflow-hidden">

          {/* Full Name Field - Premium Design */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-3"
          >
            <label className="flex items-center gap-3 text-base font-black text-slate-800">
              <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Users size={18} className="text-white" />
              </div>
              <span>Nombre completo *</span>
            </label>
            <div className="relative group">
              <input
                type="text"
                value={customerData.name}
                onChange={(e) => onDataChange(prev => ({ ...prev, name: e.target.value }))}
                onFocus={() => setFieldFocus('name')}
                onBlur={() => setFieldFocus('')}
                className={cn(
                  'w-full pl-6 pr-14 py-5 rounded-2xl border-2 text-base font-medium transition-all duration-300',
                  'bg-gradient-to-r from-slate-50 to-white backdrop-blur-sm placeholder:text-slate-400 text-slate-900',
                  'focus:outline-none focus:ring-4 hover:shadow-xl touch-manipulation',
                  fieldFocus === 'name' && 'transform scale-[1.02]',
                  validationErrors.name
                    ? 'border-red-300 focus:ring-red-200/50 focus:border-red-500 shadow-red-100'
                    : 'border-slate-300/60 focus:ring-orange-200/60 focus:border-orange-500 hover:border-orange-300/80 shadow-lg'
                )}
                placeholder="Ingresa tu nombre completo"
                autoComplete="name"
              />
              {customerData.name && !validationErrors.name && (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className="absolute right-5 top-1/2 -translate-y-1/2 z-10"
                >
                  <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                    <CheckCircle size={18} className="text-white" />
                  </div>
                </motion.div>
              )}
            </div>
            {fieldFocus === 'name' && !customerData.name && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-orange-50 border border-orange-200 rounded-xl p-3"
              >
                <p className="text-orange-700 text-sm font-medium flex items-center gap-2">
                  <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">💡</span>
                  </div>
                  Ingresa tu nombre completo como aparece en tu identificación oficial
                </p>
              </motion.div>
            )}
            {validationErrors.name && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-50 border border-red-200 rounded-xl p-3"
              >
                <p className="text-red-700 text-sm font-bold flex items-center gap-2">
                  <AlertCircle size={16} className="text-red-500" />
                  {validationErrors.name}
                </p>
              </motion.div>
            )}
          </motion.div>

          {/* Phone Field - Premium Design */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-3"
          >
            <label className="flex items-center gap-3 text-base font-black text-slate-800">
              <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-green-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Phone size={18} className="text-white" />
              </div>
              <span>Teléfono WhatsApp *</span>
            </label>
            <div className="relative group">
              <input
                type="tel"
                value={customerData.phone}
                onChange={(e) => {
                  const formatted = formatPhoneNumber(e.target.value);
                  onDataChange(prev => ({ ...prev, phone: formatted }));
                }}
                onFocus={() => setFieldFocus('phone')}
                onBlur={() => setFieldFocus('')}
                className={cn(
                  'w-full pl-6 pr-14 py-5 rounded-2xl border-2 text-base font-medium transition-all duration-300',
                  'bg-gradient-to-r from-slate-50 to-white backdrop-blur-sm placeholder:text-slate-400 text-slate-900',
                  'focus:outline-none focus:ring-4 hover:shadow-xl touch-manipulation',
                  fieldFocus === 'phone' && 'transform scale-[1.02]',
                  validationErrors.phone
                    ? 'border-red-300 focus:ring-red-200/50 focus:border-red-500 shadow-red-100'
                    : 'border-slate-300/60 focus:ring-emerald-200/60 focus:border-emerald-500 hover:border-emerald-300/80 shadow-lg'
                )}
                placeholder="+523343461630"
                autoComplete="tel"
              />
              {customerData.phone && !validationErrors.phone && (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className="absolute right-5 top-1/2 -translate-y-1/2 z-10"
                >
                  <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                    <CheckCircle size={18} className="text-white" />
                  </div>
                </motion.div>
              )}
            </div>
            {fieldFocus === 'phone' && !customerData.phone && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-50 border border-emerald-200 rounded-xl p-3"
              >
                <p className="text-emerald-700 text-sm font-medium flex items-center gap-2">
                  <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">📱</span>
                  </div>
                  Número con WhatsApp para confirmaciones instantáneas y entrega del premio
                </p>
              </motion.div>
            )}
            {validationErrors.phone && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-50 border border-red-200 rounded-xl p-3"
              >
                <p className="text-red-700 text-sm font-bold flex items-center gap-2">
                  <AlertCircle size={16} className="text-red-500" />
                  {validationErrors.phone}
                </p>
              </motion.div>
            )}
          </motion.div>

          {/* Email and City - Premium Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Email Field - Premium Design */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-3"
            >
              <label className="flex items-center gap-3 text-base font-black text-slate-800">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Mail size={18} className="text-white" />
                </div>
                <span>Email *</span>
              </label>
              <div className="relative group">
                <input
                  type="email"
                  value={customerData.email}
                  onChange={(e) => onDataChange(prev => ({ ...prev, email: e.target.value }))}
                  onFocus={() => setFieldFocus('email')}
                  onBlur={() => setFieldFocus('')}
                  className={cn(
                    'w-full pl-6 pr-14 py-5 rounded-2xl border-2 text-base font-medium transition-all duration-300',
                    'bg-gradient-to-r from-slate-50 to-white backdrop-blur-sm placeholder:text-slate-400 text-slate-900',
                    'focus:outline-none focus:ring-4 hover:shadow-xl touch-manipulation',
                    fieldFocus === 'email' && 'transform scale-[1.02]',
                    validationErrors.email
                      ? 'border-red-300 focus:ring-red-200/50 focus:border-red-500 shadow-red-100'
                      : 'border-slate-300/60 focus:ring-blue-200/60 focus:border-blue-500 hover:border-blue-300/80 shadow-lg'
                  )}
                  placeholder="tu@email.com"
                  autoComplete="email"
                />
                {customerData.email && !validationErrors.email && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="absolute right-5 top-1/2 -translate-y-1/2 z-10"
                  >
                    <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                      <CheckCircle size={18} className="text-white" />
                    </div>
                  </motion.div>
                )}
              </div>
              {fieldFocus === 'email' && !customerData.email && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-blue-50 border border-blue-200 rounded-xl p-3"
                >
                  <p className="text-blue-700 text-sm font-medium flex items-center gap-2">
                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">📧</span>
                    </div>
                    Para enviarte información importante del sorteo y confirmaciones
                  </p>
                </motion.div>
              )}
              {validationErrors.email && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-red-50 border border-red-200 rounded-xl p-3"
                >
                  <p className="text-red-700 text-sm font-bold flex items-center gap-2">
                    <AlertCircle size={16} className="text-red-500" />
                    {validationErrors.email}
                  </p>
                </motion.div>
              )}
            </motion.div>

            {/* City Field - Premium Design */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-3"
            >
              <label className="flex items-center gap-3 text-base font-black text-slate-800">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-violet-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <MapPin size={18} className="text-white" />
                </div>
                <span>Ciudad *</span>
              </label>
              <div className="relative group">
                <input
                  type="text"
                  value={customerData.city}
                  onChange={(e) => onDataChange(prev => ({ ...prev, city: e.target.value }))}
                  onFocus={() => setFieldFocus('city')}
                  onBlur={() => setFieldFocus('')}
                  className={cn(
                    'w-full pl-6 pr-14 py-5 rounded-2xl border-2 text-base font-medium transition-all duration-300',
                    'bg-gradient-to-r from-slate-50 to-white backdrop-blur-sm placeholder:text-slate-400 text-slate-900',
                    'focus:outline-none focus:ring-4 hover:shadow-xl touch-manipulation',
                    fieldFocus === 'city' && 'transform scale-[1.02]',
                    validationErrors.city
                      ? 'border-red-300 focus:ring-red-200/50 focus:border-red-500 shadow-red-100'
                      : 'border-slate-300/60 focus:ring-purple-200/60 focus:border-purple-500 hover:border-purple-300/80 shadow-lg'
                  )}
                  placeholder="Ciudad de México"
                  autoComplete="address-level2"
                />
                {customerData.city && !validationErrors.city && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="absolute right-5 top-1/2 -translate-y-1/2 z-10"
                  >
                    <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                      <CheckCircle size={18} className="text-white" />
                    </div>
                  </motion.div>
                )}
              </div>
              {fieldFocus === 'city' && !customerData.city && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-purple-50 border border-purple-200 rounded-xl p-3"
                >
                  <p className="text-purple-700 text-sm font-medium flex items-center gap-2">
                    <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">🏙️</span>
                    </div>
                    Ciudad donde realizaremos la entrega del premio si resultas ganador
                  </p>
                </motion.div>
              )}
              {validationErrors.city && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-red-50 border border-red-200 rounded-xl p-3"
                >
                  <p className="text-red-700 text-sm font-bold flex items-center gap-2">
                    <AlertCircle size={16} className="text-red-500" />
                    {validationErrors.city}
                  </p>
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* State Field - Premium Design */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
            className="space-y-3"
          >
            <label className="flex items-center gap-3 text-base font-black text-slate-800">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Building2 size={18} className="text-white" />
              </div>
              <span>Estado</span>
            </label>
            <div className="relative group">
              <select
                value={customerData.state}
                onChange={(e) => onDataChange(prev => ({ ...prev, state: e.target.value }))}
                onFocus={() => setFieldFocus('state')}
                onBlur={() => setFieldFocus('')}
                className={cn(
                  'w-full pl-6 pr-14 py-5 rounded-2xl border-2 text-base font-medium transition-all duration-300 appearance-none cursor-pointer',
                  'bg-gradient-to-r from-slate-50 to-white backdrop-blur-sm text-slate-900',
                  'focus:outline-none focus:ring-4 hover:shadow-xl touch-manipulation',
                  fieldFocus === 'state' && 'transform scale-[1.02]',
                  'border-slate-300/60 focus:ring-indigo-200/60 focus:border-indigo-500 hover:border-indigo-300/80 shadow-lg'
                )}
              >
                {mexicanStates.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                <motion.div
                  animate={{ rotate: fieldFocus === 'state' ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="w-6 h-6 bg-indigo-500 rounded-lg flex items-center justify-center"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </motion.div>
              </div>
            </div>
          </motion.div>

        </div>
      </motion.div>

      {/* Security & Trust Footer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="relative bg-gradient-to-r from-slate-50 via-white to-slate-50 border-2 border-slate-200/60 rounded-3xl p-6 shadow-lg overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-white/60 to-transparent rounded-3xl" />
        <div className="relative">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-r from-emerald-500 to-green-500 rounded-2xl shadow-lg">
              <CheckCircle size={24} className="text-white" />
            </div>
            <h4 className="text-xl font-black text-slate-800">100% Seguro y Confiable</h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="flex flex-col items-center gap-2 p-4 bg-white/80 rounded-2xl border border-slate-200/50">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">🔒</span>
              </div>
              <span className="text-sm font-bold text-slate-700">Datos protegidos</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 bg-white/80 rounded-2xl border border-slate-200/50">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">⚡</span>
              </div>
              <span className="text-sm font-bold text-slate-700">Proceso rápido</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 bg-white/80 rounded-2xl border border-slate-200/50">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">🏆</span>
              </div>
              <span className="text-sm font-bold text-slate-700">Entrega garantizada</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Security Notice */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4"
      >
        <div className="flex items-center gap-3 text-blue-800">
          <div className="p-2 bg-blue-500 rounded-xl">
            <CheckCircle size={16} className="text-white" />
          </div>
          <div>
            <h4 className="font-bold text-sm">Tus datos están seguros</h4>
            <p className="text-xs text-blue-600 mt-1">
              Solo usamos tu información para contactarte y entregar tu premio. No compartimos datos con terceros.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

interface PaymentProofStepProps {
  selectedPaymentMethod: string;
  mainPaymentMethods: any[];
  customerData: CustomerData;
  selectedTickets: number[];
  totalPrice: number;
  paymentScreenshot: File | null;
  previewUrl: string;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: () => void;
  validationError?: string;
  copiedField: string;
  onCopyToClipboard: (text: string, field: string) => void;
}

const PaymentProofStep: React.FC<PaymentProofStepProps> = ({
  selectedPaymentMethod,
  mainPaymentMethods,
  customerData,
  selectedTickets,
  totalPrice,
  paymentScreenshot,
  previewUrl,
  onFileChange,
  onRemoveFile,
  validationError,
  copiedField,
  onCopyToClipboard
}) => (
  <div className="space-y-8 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
    <StepHeader
      icon={<Camera size={28} />}
      title="Sube tu comprobante"
      description="Captura de pantalla de tu transferencia"
      color="pink"
    />

    {/* File Upload Area */}
    <div className="group relative border-2 border-dashed border-slate-300/60 rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-slate-50 to-slate-100/50 hover:from-slate-100 hover:to-slate-200/50 backdrop-blur-sm transition-all duration-500 hover:border-slate-400/60 hover:shadow-xl">
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative text-center">
        {!previewUrl ? (
          <>
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300 rounded-2xl animate-pulse" />
              <div className="relative w-full h-full bg-gradient-to-br from-slate-300 to-slate-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Upload size={32} className="text-white drop-shadow-sm" />
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-lg sm:text-xl font-bold text-slate-900">
                Selecciona tu comprobante
              </h4>
              <p className="text-slate-600 font-medium">
                JPG, PNG o cualquier imagen (máx. 10MB)
              </p>
              
              <input
                type="file"
                id="screenshot-upload"
                accept="image/*"
                onChange={onFileChange}
                className="hidden"
              />
              
              <label
                htmlFor="screenshot-upload"
                className="cursor-pointer inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-2xl font-bold transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/25 hover:scale-105 active:scale-95 ring-2 ring-blue-500/20"
              >
                <Upload size={16} />
                Seleccionar archivo
              </label>
            </div>
          </>
        ) : (
          <div className="space-y-6 animate-in fade-in-50 zoom-in-95 duration-300">
            <div className="flex items-center justify-between">
              <span className="text-emerald-700 font-bold flex items-center gap-3 text-lg">
                <div className="p-2 bg-emerald-500 rounded-xl shadow-lg shadow-emerald-500/25">
                  <CheckCircle size={18} className="text-white" />
                </div>
                Comprobante cargado
              </span>
              <button
                onClick={onRemoveFile}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-200/80 transition-all duration-200 hover:scale-110 active:scale-95"
              >
                <X size={18} />
              </button>
            </div>
            <div className="relative">
              <img
                src={previewUrl}
                alt="Comprobante de pago"
                className="w-full max-w-sm mx-auto rounded-2xl shadow-xl border-2 border-slate-200/60 max-h-48 object-cover ring-1 ring-slate-200/30"
              />
              <div className="absolute inset-0 rounded-2xl ring-1 ring-slate-300/30 pointer-events-none" />
            </div>
            <p className="text-sm text-slate-700 font-medium truncate bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-slate-200/60 inline-block">
              {paymentScreenshot?.name}
            </p>
          </div>
        )}
      </div>

      {validationError && (
        <div className="relative mt-6 bg-gradient-to-r from-red-50 to-red-100/80 backdrop-blur-sm border border-red-200/60 rounded-2xl p-4 text-center ring-1 ring-red-200/30 animate-in fade-in-50 slide-in-from-top-2 duration-300">
          <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent rounded-2xl" />
          <div className="relative text-red-800 text-sm font-bold flex items-center justify-center gap-2">
            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
              <X size={12} className="text-white" />
            </div>
            {validationError}
          </div>
        </div>
      )}
    </div>

    {/* Purchase Summary */}
    <div className="relative bg-gradient-to-br from-slate-50 to-slate-100/50 backdrop-blur-sm rounded-2xl p-6 ring-1 ring-slate-200/50 shadow-lg">
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent rounded-2xl" />
      <div className="relative">
        <h4 className="font-bold text-slate-900 mb-6 flex items-center gap-3 text-lg">
          <div className="p-2 bg-gradient-to-br from-mexican-green to-cactus-green rounded-xl shadow-lg shadow-mexican-green/25">
            <CheckCircle size={18} className="text-white" />
          </div>
          <span className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            Resumen de tu compra
          </span>
        </h4>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="group relative bg-white/80 backdrop-blur-sm p-5 rounded-2xl text-center ring-1 ring-slate-200/50 hover:ring-slate-300/60 hover:shadow-lg transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <div className="text-sm text-slate-600 font-semibold mb-2">Números</div>
              <div className="text-2xl font-black bg-gradient-to-br from-slate-800 to-slate-600 bg-clip-text text-transparent">
                {selectedTickets.length}
              </div>
            </div>
          </div>
          <div className="group relative bg-white/80 backdrop-blur-sm p-5 rounded-2xl text-center ring-1 ring-emerald-200/50 hover:ring-emerald-300/60 hover:shadow-lg transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <div className="text-sm text-emerald-700 font-semibold mb-2">Total</div>
              <div className="text-2xl font-black bg-gradient-to-br from-mexican-red to-sunset-orange bg-clip-text text-transparent">
                {formatPrice(totalPrice)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl space-y-4 text-sm ring-1 ring-slate-200/50">
          <div className="flex justify-between items-center">
            <span className="text-slate-600 font-medium flex items-center gap-2">
              <CreditCard size={14} className="text-blue-500" />
              Método:
            </span>
            <span className="font-bold text-slate-900 truncate ml-2">
              {mainPaymentMethods.find(m => m.id === selectedPaymentMethod)?.name}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600 font-medium flex items-center gap-2">
              <Users size={14} className="text-violet-500" />
              Comprador:
            </span>
            <span className="font-bold text-slate-900 truncate ml-2">{customerData.name}</span>
          </div>
        </div>
      </div>
    </div>

    {/* Payment Account Information */}
    {(() => {
      const selectedMethod = mainPaymentMethods.find(m => m.id === selectedPaymentMethod);
      if (!selectedMethod) return null;

      return (
        <div className="relative bg-gradient-to-br from-emerald-50 to-emerald-100/80 backdrop-blur-sm border border-emerald-200/60 rounded-2xl p-6 ring-1 ring-emerald-200/30 shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent rounded-2xl" />
          <div className="relative">
            <h4 className="font-bold text-emerald-900 mb-6 flex items-center gap-3 text-lg">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg shadow-emerald-500/25">
                <CreditCard size={18} className="text-white" />
              </div>
              <span className="bg-gradient-to-r from-emerald-900 to-emerald-700 bg-clip-text text-transparent">
                Datos para tu transferencia - {selectedMethod.name}
              </span>
            </h4>

            <div className="bg-white/90 backdrop-blur-sm p-5 rounded-2xl space-y-4 ring-1 ring-emerald-200/50 shadow-md">
              {selectedMethod.id === 'binance' ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center group">
                    <span className="text-emerald-700 font-semibold flex items-center gap-2">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                      Email Binance Pay:
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">
                        {selectedMethod.account}
                      </span>
                      <button
                        onClick={() => onCopyToClipboard(selectedMethod.account, 'binance-email')}
                        className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95"
                      >
                        {copiedField === 'binance-email' ? <CheckCircle size={16} /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                    <p className="text-sm text-emerald-800 font-medium">
                      💡 <strong>Importante:</strong> Transfiere exactamente <strong className="text-emerald-900">{formatPrice(totalPrice)}</strong>
                      al email de Binance Pay mostrado arriba.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedMethod.accountDetails?.split('\n').map((line: string, index: number) => {
                    const [label, ...valueParts] = line.split(':');
                    const value = valueParts.join(':').trim();

                    if (!value) return null;

                    return (
                      <div key={index} className="flex justify-between items-center group">
                        <span className="text-emerald-700 font-semibold flex items-center gap-2">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                          {label.trim()}:
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">
                            {value}
                          </span>
                          <button
                            onClick={() => onCopyToClipboard(value, `${selectedMethod.id}-${index}`)}
                            className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95"
                          >
                            {copiedField === `${selectedMethod.id}-${index}` ? <CheckCircle size={16} /> : <Copy size={16} />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                    <p className="text-sm text-emerald-800 font-medium">
                      💡 <strong>Importante:</strong> Transfiere exactamente <strong className="text-emerald-900">{formatPrice(totalPrice)}</strong>
                      a la cuenta mostrada arriba.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    })()}

    {/* Final Instructions */}
    <div className="relative bg-gradient-to-r from-blue-50 to-blue-100/80 backdrop-blur-sm border border-blue-200/60 rounded-2xl p-6 ring-1 ring-blue-200/30 shadow-lg">
      <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent rounded-2xl" />
      <div className="relative flex gap-4">
        <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg shadow-blue-500/25 flex-shrink-0">
          <FileText size={20} className="text-white" />
        </div>
        <div className="text-blue-800 space-y-2">
          <p className="font-bold text-lg">¿Qué sigue?</p>
          <p className="text-sm font-medium leading-relaxed">
            Recibirás confirmación por email. Revisaremos tu comprobante en máximo 24 horas
            y te contactaremos para confirmar tus números.
          </p>
        </div>
      </div>
    </div>
  </div>
);

export default PurchaseWizard;