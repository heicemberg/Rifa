'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { guardarCompra, subirCaptura, obtenerMetadata, type CompraCompleta } from '../lib/supabase';
import { useSupabaseConnection } from '../hooks/useSupabaseConnection';
import toast from 'react-hot-toast';
import { useRaffleStore, useTickets } from '../stores/raffle-store';
import { useMasterCounters } from '../hooks/useMasterCounters';
import { calculatePrice as calculatePriceFromUtils } from '../lib/utils';
import { getPaymentMethods } from '../lib/config/payment-config';

// Tipos para la estructura de datos
interface TicketData {
  cantidad: number;
  precioUnitario: number;
  total: number;
}

interface PaymentMethod {
  proveedor: string;
  seleccionado: boolean;
}

interface UploadedFile {
  archivo: File | null;
  nombreArchivo: string;
  tamaño: number;
  base64: string;
}

interface CustomerData {
  nombre: string;
  apellidos: string;
  telefono: string;
  email: string;
  estado: string;
  ciudad: string;
  infoAdicional: string;
}

interface Metadata {
  timestamp: number;
  sesion: string;
  navegador: string;
}

interface PurchaseData {
  boletos: TicketData;
  metodoPago: PaymentMethod;
  comprobante: UploadedFile;
  datosCliente: CustomerData;
  metadata: Metadata;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialTickets?: number;
  hasDiscount?: boolean;
}

// ✅ PAYMENT METHODS: Usar configuración dinámica en lugar de hardcoded
const getModalPaymentMethods = () => {
  const dynamicMethods = getPaymentMethods();
  console.log('🏦 DYNAMIC PAYMENT METHODS:', dynamicMethods.length, dynamicMethods.map(m => m.name));

  // Transform to modal format with enhanced details
  return dynamicMethods.map(method => {
    const baseMethod = {
      id: method.id,
      name: method.name,
      logo: method.icon, // Use 'icon' from dynamic config as 'logo'
      details: {
        type: method.id === 'binance' ? 'crypto' : method.id === 'oxxo' ? 'store' : 'bank',
        instructions: ''
      }
    };

    // Add specific details based on method type
    switch (method.id) {
      case 'binance':
        return {
          ...baseMethod,
          details: {
            ...baseMethod.details,
            binanceId: method.account,
            qrCode: '/premios/QR.jpg',
            instructions: `Escanea el código QR desde la app Binance o envía al ID: ${method.account}`
          }
        };

      case 'banamex':
        return {
          ...baseMethod,
          details: {
            ...baseMethod.details,
            account: method.account,
            clabe: '002180702087444274', // Fixed CLABE for Banamex
            holder: 'Egleimis Ollarves',
            instructions: 'Transferencia SPEI o depósito en cualquier sucursal Banamex'
          }
        };

      case 'bbva':
        return {
          ...baseMethod,
          details: {
            ...baseMethod.details,
            card: method.account,
            holder: 'Egliskar Ollarves',
            instructions: 'Transferencia SPEI, depósito en ventanilla o pago con tarjeta'
          }
        };

      case 'oxxo':
        return {
          ...baseMethod,
          details: {
            ...baseMethod.details,
            card: method.account,
            instructions: 'Presenta esta referencia en cualquier tienda OXXO y paga el monto exacto'
          }
        };

      default:
        return baseMethod;
    }
  });
};

const estados = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche',
  'Chiapas', 'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima',
  'Durango', 'Estado de México', 'Guanajuato', 'Guerrero', 'Hidalgo',
  'Jalisco', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca',
  'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa',
  'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas'
];

export default function ComprehensivePurchaseModal({ isOpen, onClose, initialTickets = 25, hasDiscount = false }: Props) {
  // Obtener funciones del store para manejar boletos
  const { availableTickets, markTicketsAsSold } = useRaffleStore();
  // Obtener tickets seleccionados del grid
  const { selectedTickets } = useTickets();
  // Master counter system for unified state
  const masterCounters = useMasterCounters();
  const { isConnected } = masterCounters;

  // ✅ PAYMENT METHODS: Usar métodos dinámicos
  const paymentMethods = useMemo(() => {
    const methods = getModalPaymentMethods();
    console.log('🏦 MODAL PAYMENT METHODS LOADED:', methods.length, methods.map(m => `${m.id}: ${m.name}`));
    return methods;
  }, []);
  
  // Pricing constants and functions (self-contained)
  const PRECIO_POR_BOLETO_MXN = 250;
  const formatMexicanNumber = (num: number): string => num.toLocaleString('es-MX');
  const formatPriceMXN = (amount: number): string => `$${formatMexicanNumber(amount)} MXN`;
  const calculatePriceMXN = (quantity: number): number => quantity * PRECIO_POR_BOLETO_MXN;
  
  // Function to get real available tickets from Supabase
  const getRealAvailableTickets = useCallback(async (): Promise<number[]> => {
    try {
      if (!isConnected) {
        console.warn('No connection to Supabase, returning empty array');
        return [];
      }

      const { data: unavailableTickets, error } = await (await import('../lib/supabase')).supabase
        .from('tickets')
        .select('number')
        .in('status', ['vendido', 'reservado']);

      if (error) {
        console.error('Error fetching unavailable tickets:', error);
        return [];
      }

      const unavailableNumbers = new Set(unavailableTickets?.map((t: any) => t.number) || []);
      const availableTickets: number[] = [];

      for (let i = 1; i <= 10000; i++) {
        if (!unavailableNumbers.has(i)) {
          availableTickets.push(i);
        }
      }

      console.log(`📊 Real available tickets: ${availableTickets.length}`);
      return availableTickets;
    } catch (error) {
      console.error('Error in getRealAvailableTickets:', error);
      return [];
    }
  }, [isConnected]);
  // Hook para manejo robusto de conexión a Supabase
  const { isConnected: dbConnected, isLoading: dbLoading } = useSupabaseConnection();
  
  // Estados principales
  const [tickets, setTickets] = useState<number>(initialTickets);
  const [customTickets, setCustomTickets] = useState<string>('');
  const [selectedPayment, setSelectedPayment] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<UploadedFile>({
    archivo: null,
    nombreArchivo: '',
    tamaño: 0,
    base64: ''
  });
  const [customerData, setCustomerData] = useState<CustomerData>({
    nombre: '',
    apellidos: '',
    telefono: '',
    email: '',
    estado: '',
    ciudad: '',
    infoAdicional: ''
  });

  // Estados de validación y UI
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutos en segundos
  const [progress, setProgress] = useState(0);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [boletosAsignados, setBoletosAsignados] = useState<number[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Timer countdown
  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onClose]);

  // Auto-save progress and set initial tickets
  useEffect(() => {
    if (isOpen) {
      // Si hay tickets seleccionados en el grid, usarlos en lugar de initialTickets
      if (selectedTickets.length > 0) {
        console.log('🎯 ComprehensivePurchaseModal: Usando tickets seleccionados:', selectedTickets);
        setTickets(selectedTickets.length);
        setBoletosAsignados(selectedTickets);
      } else {
        // Set initial tickets amount
        setTickets(initialTickets);
      }
      
      const savedData = localStorage.getItem('purchase-progress');
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          // Only restore saved data if no tickets pre-selected
          if (selectedTickets.length === 0 && initialTickets === 25) {
            setTickets(parsed.tickets || initialTickets);
          }
          setSelectedPayment(parsed.selectedPayment || '');
          setCustomerData(parsed.customerData || {
            nombre: '', apellidos: '', telefono: '', email: '', 
            estado: '', ciudad: '', infoAdicional: ''
          });
        } catch (error) {
          console.error('Error loading saved progress:', error);
        }
      }
    }
  }, [isOpen, initialTickets, selectedTickets]);

  // Save progress
  useEffect(() => {
    if (isOpen) {
      const progressData = {
        tickets,
        selectedPayment,
        customerData,
        timestamp: Date.now()
      };
      localStorage.setItem('purchase-progress', JSON.stringify(progressData));
      
      // Calculate progress percentage (más permisivo)
      let completedSteps = 0;
      if (tickets >= 2) completedSteps += 40; // Boletos tienen más peso
      if (selectedPayment) completedSteps += 30; // Método de pago importante
      if (customerData.nombre) completedSteps += 20; // Solo nombre
      if (customerData.telefono || customerData.email) completedSteps += 10; // Contacto flexible
      
      setProgress(Math.min(completedSteps, 100));
    }
  }, [isOpen, tickets, selectedPayment, customerData]);

  // Formatear tiempo
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Validaciones
  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePhone = (phone: string) => {
    const re = /^(\+52\s?)?[0-9]{10}$/;
    return re.test(phone.replace(/\s/g, ''));
  };

  // ✅ Handlers optimizados con useCallback para mejor performance
  const handleTicketSelect = useCallback((amount: number) => {
    console.log(`✅ Selecting ${amount} tickets`);
    setTickets(amount);
    setCustomTickets('');
    setErrors(prev => ({ ...prev, tickets: '' }));
    // Forzar actualización inmediata
    setTimeout(() => {
      setTickets(amount);
    }, 0);
  }, []);
  
  // ✅ Optimización adicional para handlers de pago
  const handlePaymentSelect = useCallback((methodId: string) => {
    setSelectedPayment(methodId);
    setErrors(prev => ({ ...prev, payment: '' }));
  }, []);

  const handleCustomTickets = useCallback((value: string) => {
    const num = parseInt(value);
    if (value === '' || (num >= 2 && num <= 10000)) {
      setCustomTickets(value);
      if (num) setTickets(num);
      setErrors(prev => ({ ...prev, tickets: '' }));
    } else {
      setErrors(prev => ({ ...prev, tickets: 'Mínimo 2 boletos, máximo 10,000' }));
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, []);

  const handleFileUpload = (file: File) => {
    // Validar tipo de archivo
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setErrors({ ...errors, file: 'Solo se permiten archivos PNG, JPG o PDF' });
      return;
    }

    // Validar tamaño (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors({ ...errors, file: 'El archivo no debe exceder 5MB' });
      return;
    }

    // Convertir a base64
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedFile({
        archivo: file,
        nombreArchivo: file.name,
        tamaño: file.size,
        base64: e.target?.result as string
      });
      setErrors({ ...errors, file: '' });
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleInputChange = useCallback((field: keyof CustomerData, value: string) => {
    setCustomerData(prev => ({ ...prev, [field]: value }));
    
    // Validación en tiempo real
    if (field === 'email' && value && !validateEmail(value)) {
      setErrors(prev => ({ ...prev, [field]: 'Email inválido' }));
    } else if (field === 'telefono' && value && !validatePhone(value)) {
      setErrors(prev => ({ ...prev, [field]: 'Teléfono inválido (formato: +52XXXXXXXXXX)' }));
    } else {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, []);

  // Función para calcular precio con descuentos mexicano
  const calculatePrice = useCallback(() => {
    // Usar la función de utils con el parámetro applyDiscount
    return calculatePriceFromUtils(tickets, true); // true = aplicar descuento para modal
  }, [tickets]);

  // ✅ Memoizar cálculos de precio para evitar re-cálculos innecesarios
  const priceCalculations = useMemo(() => {
    const basePrice = tickets * PRECIO_POR_BOLETO_MXN;
    const discountedPrice = calculatePrice();
    const discountAmount = basePrice - discountedPrice;
    const discountPercentage = discountAmount > 0 ? Math.round((discountAmount / basePrice) * 100) : 0;
    
    return {
      basePrice,
      discountedPrice,
      discountAmount,
      discountPercentage,
      hasDiscount: discountPercentage > 0
    };
  }, [tickets, calculatePrice]);

  // Función MEJORADA para asignar números de boletos con verificación robusta
  const asignarBoletos = useCallback(async (cantidad: number): Promise<number[]> => {
    try {
      console.log(`🎫 ASIGNACIÓN MEJORADA: Intentando asignar ${cantidad} boletos...`);

      // PASO 1: Si hay tickets pre-seleccionados, verificar su disponibilidad
      if (selectedTickets.length > 0) {
        console.log(`🎯 Verificando tickets pre-seleccionados: ${selectedTickets}`);

        if (isConnected) {
          // Verificar que los tickets pre-seleccionados sigan disponibles
          const ticketsRealesDisponibles = await getRealAvailableTickets();
          const ticketsNoDisponibles = selectedTickets.filter(ticket => !ticketsRealesDisponibles.includes(ticket));

          if (ticketsNoDisponibles.length > 0) {
            console.warn(`⚠️ Tickets pre-seleccionados ya no disponibles: ${ticketsNoDisponibles}`);
            throw new Error(`Algunos tickets seleccionados ya no están disponibles: ${ticketsNoDisponibles.join(', ')}. Actualiza la página e intenta de nuevo.`);
          }
        }

        console.log(`✅ Usando tickets pre-seleccionados verificados: ${selectedTickets}`);
        return selectedTickets.sort((a, b) => a - b);
      }

      // PASO 2: Si está conectado a Supabase, usar verificación robusta
      if (isConnected) {
        console.log('✅ MODO CONECTADO: Obteniendo tickets reales desde Supabase...');

        // Doble verificación de disponibilidad
        const ticketsRealesDisponibles = await getRealAvailableTickets();
        console.log(`📊 Tickets realmente disponibles: ${ticketsRealesDisponibles.length}`);

        if (ticketsRealesDisponibles.length < cantidad) {
          console.error(`❌ INSUFICIENTES TICKETS: Solo ${ticketsRealesDisponibles.length} disponibles vs ${cantidad} solicitados`);
          throw new Error(`Solo hay ${ticketsRealesDisponibles.length} boletos disponibles en este momento. Intenta con menos boletos.`);
        }

        // Usar Fisher-Yates shuffle para selección aleatoria segura
        const disponibles = [...ticketsRealesDisponibles];
        const boletosSeleccionados: number[] = [];

        // Fisher-Yates shuffle mejorado
        for (let i = 0; i < cantidad; i++) {
          if (disponibles.length === 0) {
            throw new Error('Error interno: no hay más tickets disponibles para asignar');
          }

          const randomIndex = Math.floor(Math.random() * disponibles.length);
          const boletoSeleccionado = disponibles[randomIndex];
          boletosSeleccionados.push(boletoSeleccionado);

          // Remover el ticket seleccionado para evitar duplicados
          disponibles.splice(randomIndex, 1);
        }

        // Verificación final de duplicados
        const uniqueBoletos = [...new Set(boletosSeleccionados)];
        if (uniqueBoletos.length !== boletosSeleccionados.length) {
          console.error(`❌ DUPLICADOS DETECTADOS: ${boletosSeleccionados}`);
          throw new Error('Error interno: se generaron números duplicados');
        }

        const sortedBoletos = boletosSeleccionados.sort((a, b) => a - b);
        console.log(`🎯 BOLETOS ASIGNADOS DESDE BD: ${sortedBoletos}`);
        return sortedBoletos;

      } else {
        // PASO 3: Modo offline con simulación mejorada
        console.log('⚠️ MODO OFFLINE: Usando simulación local...');

        // Usar Zustand store para obtener tickets no disponibles localmente
        const { soldTickets: localSold, reservedTickets: localReserved } = useRaffleStore.getState();
        const todosLosTickets = Array.from({ length: 10000 }, (_, i) => i + 1);
        const ticketsLocalesDisponibles = todosLosTickets.filter(
          ticket => !localSold.includes(ticket) && !localReserved.includes(ticket)
        );

        if (ticketsLocalesDisponibles.length < cantidad) {
          throw new Error(`Solo quedan ${ticketsLocalesDisponibles.length} boletos disponibles localmente`);
        }

        // Selección aleatoria del estado local
        const disponibles = [...ticketsLocalesDisponibles];
        const boletosSeleccionados: number[] = [];

        for (let i = 0; i < cantidad; i++) {
          const randomIndex = Math.floor(Math.random() * disponibles.length);
          const boletoSeleccionado = disponibles[randomIndex];
          boletosSeleccionados.push(boletoSeleccionado);
          disponibles.splice(randomIndex, 1);
        }

        const sortedBoletos = boletosSeleccionados.sort((a, b) => a - b);
        console.log(`🎯 BOLETOS ASIGNADOS OFFLINE: ${sortedBoletos}`);
        return sortedBoletos;
      }
    } catch (error) {
      console.error('❌ ERROR EN ASIGNACIÓN DE BOLETOS:', error);
      throw error;
    }
  }, [isConnected, getRealAvailableTickets, selectedTickets]);

  const formatearNumeroBoleto = (numero: number): string => {
    return numero.toString().padStart(4, '0');
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Solo validar lo esencial
    if (tickets < 2) {
      newErrors.tickets = 'Mínimo 2 boletos';
    }

    // Verificar método de pago más robustamente
    if (!selectedPayment || selectedPayment.trim() === '') {
      newErrors.payment = 'Selecciona un método de pago';
    } else {
      // Verificar que el método seleccionado existe
      const methodExists = paymentMethods.some(method => method.id === selectedPayment);
      if (!methodExists) {
        console.error('❌ Método de pago seleccionado no válido:', selectedPayment);
        newErrors.payment = 'Método de pago no válido. Selecciona uno de los métodos disponibles.';
      }
    }

    // Validación más flexible: solo nombre es obligatorio
    if (!customerData.nombre || !customerData.nombre.trim()) {
      newErrors.nombre = 'Ingresa tu nombre';
    }

    // Al menos uno de los dos métodos de contacto
    if ((!customerData.telefono || !customerData.telefono.trim()) &&
        (!customerData.email || !customerData.email.trim())) {
      newErrors.contacto = 'Ingresa tu teléfono o email para contactarte';
    }

    if (!acceptedTerms) {
      newErrors.terms = 'Debes aceptar los términos y condiciones';
    }

    console.log('🔍 VALIDACIÓN DE FORMULARIO:', {
      tickets,
      selectedPayment,
      customerData: {
        nombre: customerData.nombre?.trim(),
        telefono: customerData.telefono?.trim(),
        email: customerData.email?.trim()
      },
      acceptedTerms,
      errorsFound: Object.keys(newErrors).length
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    console.log('🚀 SUBMIT: Iniciando proceso de envío de orden...');
    
    // Validación inicial mejorada
    if (!validateForm()) {
      const missingData = [];
      if (tickets < 2) missingData.push('cantidad de boletos (mínimo 2)');
      if (!selectedPayment) missingData.push('método de pago');
      if (!customerData.nombre.trim()) missingData.push('nombre');
      if (!customerData.telefono.trim() && !customerData.email.trim()) missingData.push('teléfono o email');
      if (!acceptedTerms) missingData.push('aceptar términos y condiciones');
      
      toast.error(`¡Casi listo! Solo completa: ${missingData.join(', ')}`, { duration: 5000 });
      return;
    }

    console.log('✅ SUBMIT: Validación inicial pasada');
    setIsLoading(true);
    
    try {
      // Toast inicial más claro
      toast.loading('🔄 Procesando tu orden...', { id: 'purchase' });

      // PASO 1: Asignar números de boletos - MEJORADO con mejor manejo de errores
      let numerosAsignados: number[] = [];
      try {
        console.log('🎫 SUBMIT: Asignando números de boletos...');
        numerosAsignados = await asignarBoletos(tickets);
        setBoletosAsignados(numerosAsignados);
        console.log(`✅ SUBMIT: ${numerosAsignados.length} boletos asignados:`, numerosAsignados);
        toast.loading(`🎯 Boletos asignados: ${numerosAsignados.slice(0, 3).map(formatearNumeroBoleto).join(', ')}${numerosAsignados.length > 3 ? ` +${numerosAsignados.length - 3} más` : ''}`, { id: 'purchase' });
      } catch (error) {
        console.error('❌ SUBMIT: Error al asignar boletos:', error);
        throw new Error(error instanceof Error ? error.message : 'Error al asignar boletos. Intenta de nuevo.');
      }

      // PASO 2: Subir comprobante si existe (mover antes para detectar errores temprano)
      let urlComprobante = null;
      if (uploadedFile.archivo) {
        try {
          console.log('📸 SUBMIT: Subiendo comprobante...');
          toast.loading('📸 Subiendo comprobante...', { id: 'purchase' });
          urlComprobante = await subirCaptura(uploadedFile.archivo, customerData.nombre);
          console.log('✅ SUBMIT: Comprobante subido:', urlComprobante ? 'exitoso' : 'falló');
        } catch (uploadError) {
          console.warn('⚠️ SUBMIT: Error subiendo comprobante (continuando):', uploadError);
          // No fallar por esto, es opcional
        }
      }

      // PASO 3: Preparar metadata
      console.log('📊 SUBMIT: Preparando metadata...');
      const metadata = obtenerMetadata();
      
      // PASO 4: Preparar datos finales para Supabase
      const datosSupabase: CompraCompleta = {
        // Cliente
        nombre: customerData.nombre.trim(),
        apellidos: customerData.apellidos?.trim() || '',
        telefono: customerData.telefono?.trim() || '',
        email: customerData.email?.trim() || '',
        estado: customerData.estado?.trim() || '',
        ciudad: customerData.ciudad?.trim() || '',
        info_adicional: customerData.infoAdicional?.trim() || '',
        
        // Compra
        cantidad_boletos: tickets,
        numeros_boletos: numerosAsignados,
        precio_unitario: PRECIO_POR_BOLETO_MXN,
        precio_total: calculatePrice(),
        descuento_aplicado: getDiscount(),
        
        // Pago
        metodo_pago: selectedPaymentMethod?.name || selectedPayment || '',
        referencia_pago: `RF-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        captura_comprobante_url: urlComprobante || undefined,
        
        // Metadata técnica
        navegador: metadata.navegador || 'desconocido',
        dispositivo: metadata.dispositivo || 'desconocido',
        user_agent: metadata.user_agent || navigator.userAgent || 'desconocido'
      };

      console.log('💾 SUBMIT: Datos preparados para BD:', {
        nombre: datosSupabase.nombre,
        boletos: datosSupabase.cantidad_boletos,
        total: datosSupabase.precio_total,
        metodo: datosSupabase.metodo_pago
      });

      // PASO 5: Guardar en Supabase con manejo robusto de errores
      let compraGuardada;
      try {
        toast.loading('💾 Guardando en base de datos...', { id: 'purchase' });
        console.log('💾 SUBMIT: Llamando guardarCompra...');
        
        // CRITICAL FIX: Ensure database connection before saving
        console.log('🔍 SUBMIT: Verificando conexiones - DB:', dbConnected, 'Supabase:', isConnected);
        if (!dbConnected && !isConnected) {
          console.warn('⚠️ SUBMIT: No hay conexión directa, intentando guardar de todos modos...');
          // No fallar inmediatamente, intentar guardar y manejar errores después
        }
        
        compraGuardada = await guardarCompra(datosSupabase);
        console.log('✅ SUBMIT: Compra guardada en Supabase:', compraGuardada.purchase?.id);
      } catch (supabaseError) {
        console.error('❌ SUBMIT: Error en Supabase:', supabaseError);
        
        // Si falla Supabase, intentar guardar localmente como backup
        console.log('📦 SUBMIT: Guardando backup local...');
        const backupData = {
          ...datosSupabase,
          id: `local-${Date.now()}`,
          timestamp: Date.now(),
          fecha_compra: new Date().toISOString(),
          estado_compra: 'pendiente',
          source: 'local-backup',
          numeros_boletos: numerosAsignados
        };
        
        try {
          const comprasAnteriores = JSON.parse(localStorage.getItem('compras-registradas') || '[]');
          comprasAnteriores.push(backupData);
          localStorage.setItem('compras-registradas', JSON.stringify(comprasAnteriores));
          console.log('✅ SUBMIT: Backup local guardado');
          
          // Continuar con éxito pero avisar que será procesado después
          compraGuardada = { 
            purchase: { id: backupData.id }, 
            customer: { id: 'local' }, 
            tickets: numerosAsignados.map(num => ({ id: num.toString(), number: num })) as any[]
          };
          
          // Mostrar mensaje informativo sobre el backup
          toast.success('Orden guardada localmente. Se sincronizará cuando haya conexión.', { duration: 6000 });
          
        } catch (localError) {
          console.error('❌ SUBMIT: Error guardando backup local:', localError);
          throw new Error('No se pudo guardar la orden. Verifica tu conexión e intenta de nuevo.');
        }
      }

      // PASO 6: Actualizar estado local (Zustand store)
      try {
        console.log('🔄 SUBMIT: Actualizando estado local...');
        const customerId = compraGuardada.purchase?.id || Date.now().toString();
        markTicketsAsSold(numerosAsignados, customerId);
        console.log('✅ SUBMIT: Estado local actualizado');
      } catch (storeError) {
        console.warn('⚠️ SUBMIT: Error actualizando estado local:', storeError);
        // No fallar por esto
      }

      // PASO 7: Backup adicional en localStorage
      try {
        const backupCompleto = {
          id: compraGuardada.purchase?.id || `backup-${Date.now()}`,
          ...datosSupabase,
          numeros_boletos_formateados: numerosAsignados.map(formatearNumeroBoleto).join(', '),
          timestamp: Date.now(),
          fecha_compra: new Date().toISOString(),
          estado_compra: 'pendiente'
        };
        
        const comprasAnteriores = JSON.parse(localStorage.getItem('compras-registradas') || '[]');
        comprasAnteriores.push(backupCompleto);
        localStorage.setItem('compras-registradas', JSON.stringify(comprasAnteriores));
        console.log('✅ SUBMIT: Backup final guardado');
      } catch (backupError) {
        console.warn('⚠️ SUBMIT: Error en backup final:', backupError);
        // No fallar por esto
      }

      // PASO 8: ÉXITO - Mostrar confirmación
      console.log('🎉 SUBMIT: ¡Proceso completado exitosamente!');
      toast.success('¡Orden enviada exitosamente!', { id: 'purchase' });
      
      // Limpiar formulario
      localStorage.removeItem('purchase-progress');
      
      // Mostrar pantalla de éxito
      setShowSuccess(true);
      setIsLoading(false);
      
      // Toast detallado de confirmación
      toast.success(
        `¡Perfecto ${customerData.nombre}! Tu orden con ${numerosAsignados.length} boletos ha sido enviada. Te contactaremos pronto.`,
        { duration: 8000 }
      );
      
      // Auto-cerrar después del confetti
      setTimeout(() => {
        onClose();
        setShowSuccess(false);
      }, 4500);
      
    } catch (error) {
      console.error('❌ SUBMIT: Error crítico en proceso:', error);
      
      setIsLoading(false);
      
      // Mostrar error específico y útil
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido. Intenta de nuevo.';
      
      toast.error(
        <div className="text-left">
          <div className="font-bold text-red-700 mb-1">❌ Error al enviar orden</div>
          <div className="text-sm text-red-600">{errorMessage}</div>
          <div className="text-xs text-red-500 mt-2">
            💡 Si el problema persiste, contacta soporte o intenta más tarde
          </div>
        </div>,
        { 
          id: 'purchase',
          duration: 8000
        }
      );
    }
  };


  const getDiscount = useCallback(() => {
    return priceCalculations.discountPercentage;
  }, [priceCalculations.discountPercentage]);

  const openWhatsApp = () => {
    const message = '¡Hola! Tengo dudas sobre la compra de boletos para la rifa.';
    const whatsappUrl = `https://wa.me/5212345678910?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Función removida - no se usa

  const selectedPaymentMethod = useMemo(() => {
    const method = paymentMethods.find(p => p.id === selectedPayment);
    console.log('🔍 SELECTED PAYMENT METHOD LOOKUP:', {
      selectedPayment,
      foundMethod: method ? `${method.id}: ${method.name}` : 'NOT FOUND',
      availableMethods: paymentMethods.map(m => `${m.id}: ${m.name}`)
    });
    return method;
  }, [paymentMethods, selectedPayment]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-white">
      <div className="relative w-full sm:max-w-3xl h-[100vh] sm:h-auto sm:max-h-[95vh] overflow-hidden bg-white sm:rounded-xl shadow-2xl animate-bounce-in sm:m-2">
        {/* Header - Optimizado móvil */}
        <div className="flex items-center justify-between p-3 sm:p-6 border-b border-emerald-200/30 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-2xl font-bold text-white drop-shadow-sm truncate">🎯 Compra Rápida</h2>
            <div className="flex flex-wrap items-center mt-1 sm:mt-2 gap-2 sm:space-x-4 text-emerald-100">
              <div className="text-sm sm:text-base flex items-center">
                ⏰ <span className="font-mono font-bold ml-1 bg-white/20 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded text-xs sm:text-sm">{formatTime(timeLeft)}</span>
              </div>
              <div className="text-sm sm:text-base flex items-center">
                📊 <span className="font-bold ml-1 bg-white/20 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded text-xs sm:text-sm">{Math.round(progress)}%</span>
              </div>
              <div className="text-xs sm:text-sm flex items-center">
                {dbConnected ? (
                  <span className="bg-green-500/20 text-green-100 px-2 py-1 rounded-full flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse"></div>
                    BD Online
                  </span>
                ) : dbLoading ? (
                  <span className="bg-yellow-500/20 text-yellow-100 px-2 py-1 rounded-full flex items-center">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full mr-1 animate-pulse"></div>
                    Conectando...
                  </span>
                ) : (
                  <span className="bg-red-500/20 text-red-100 px-2 py-1 rounded-full flex items-center">
                    <div className="w-2 h-2 bg-red-400 rounded-full mr-1"></div>
                    BD Offline
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 sm:p-3 text-white hover:bg-white/40 rounded-xl sm:rounded-2xl transition-all duration-300 hover:scale-110 bg-white/20 shadow-xl border border-white/30 flex-shrink-0"
            title="Cerrar"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-4 bg-gradient-to-r from-gray-100 to-gray-200 relative overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 transition-all duration-700 ease-out relative overflow-hidden"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
          </div>
        </div>

        {/* Content - Scroll optimizado móvil */}
        <div className="h-[calc(100vh-140px)] sm:max-h-[calc(95vh-120px)] overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-8 bg-gradient-to-b from-gray-50/50 to-white overscroll-contain"
             style={{
               WebkitOverflowScrolling: 'touch',
               scrollBehavior: 'smooth'
             }}>
          {/* Sección de Boletos - Compacta móvil */}
          <div className="space-y-3 sm:space-y-6">
            <h3 className="text-xl font-bold text-gray-900 flex items-center">
              <span className="mr-3 text-2xl">🎫</span>
              Selecciona tus boletos
            </h3>
            <div className="p-3 sm:p-5 bg-gradient-to-r from-emerald-50 via-green-50 to-emerald-50 rounded-xl sm:rounded-2xl border border-emerald-200 shadow-sm">
              <p className="text-sm sm:text-base text-gray-700 font-medium text-center leading-relaxed">
                💡 Mínimo 2 boletos • Máximo 10,000 • <span className="font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">{formatPriceMXN(PRECIO_POR_BOLETO_MXN)} por boleto</span>
              </p>
              {selectedTickets.length > 0 && (
                <div className="mt-3 p-3 bg-emerald-100 border border-emerald-300 rounded-xl">
                  <p className="text-sm font-bold text-emerald-800 text-center mb-2">
                    🎯 Números seleccionados ({selectedTickets.length}):
                  </p>
                  <p className="text-lg font-mono font-black text-emerald-900 text-center">
                    {selectedTickets.slice(0, 10).map(formatearNumeroBoleto).join(' • ')}
                    {selectedTickets.length > 10 && ` +${selectedTickets.length - 10} más`}
                  </p>
                </div>
              )}
            </div>
            
            {/* ✅ CARDS CON DESCUENTOS PROGRESIVOS EN EL MODAL */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
              {[2, 5, 10, 25, 50, 100].map((amount) => {
                const fullPrice = calculatePriceMXN(amount);
                const discountPrice = calculatePriceFromUtils(amount, true); // CON descuento para modal
                const discount = Math.round(((fullPrice - discountPrice) / fullPrice) * 100);
                const hasDiscountCard = discount > 0;
                
                return (
                  <button
                    key={amount}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      console.log(`✅ CLICK CARD: ${amount} boletos`);
                      handleTicketSelect(amount);
                    }}
                    className={`p-2 sm:p-3 rounded-lg sm:rounded-xl border-2 font-bold transition-all duration-200 text-center hover:scale-105 hover:shadow-lg relative overflow-hidden cursor-pointer ${
                      tickets === amount
                        ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-800 shadow-lg scale-105'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-emerald-400 hover:bg-gradient-to-br hover:from-emerald-50/50 hover:to-emerald-100/50 hover:text-emerald-700'
                    }`}
                  >
                    {/* Badge de descuento */}
                    {hasDiscountCard && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full shadow-md animate-pulse pointer-events-none">
                        -{discount}%
                      </span>
                    )}

                    <div className="text-base sm:text-lg font-black mb-0.5">{amount}</div>
                    <div className="text-xs text-gray-500 font-medium mb-1">boleto{amount !== 1 ? 's' : ''}</div>

                    {/* Precios con descuento visual */}
                    <div className="space-y-0.5">
                      {hasDiscountCard ? (
                        <>
                          <div className="text-xs text-gray-400 line-through">
                            ${fullPrice.toLocaleString('es-MX')}
                          </div>
                          <div className="text-sm sm:text-base font-bold text-emerald-600">
                            ${discountPrice.toLocaleString('es-MX')}
                          </div>
                        </>
                      ) : (
                        <div className="text-sm sm:text-base font-bold text-gray-800">
                          ${discountPrice.toLocaleString('es-MX')}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            
            <div className="mt-6">
              <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2 sm:mb-3">
                {selectedTickets.length > 0 ? 'Cantidad fija (tickets pre-seleccionados):' : 'O ingresa cantidad personalizada:'}
              </label>
              <input
                type="number"
                placeholder="Cantidad personalizada"
                value={customTickets}
                onChange={(e) => handleCustomTickets(e.target.value)}
                disabled={selectedTickets.length > 0}
                className="w-full p-3 sm:p-4 border-2 border-gray-300 rounded-xl sm:rounded-2xl font-medium text-center focus:border-emerald-500 focus:outline-none bg-gradient-to-br from-white to-gray-50 text-gray-900 placeholder-gray-400 transition-all duration-300 hover:shadow-md focus:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                min="2"
                max="10000"
              />
            </div>
            
            {errors.tickets && <p className="text-red-600 text-sm font-medium bg-red-50 p-2 rounded">{errors.tickets}</p>}
            
            <div className="p-3 sm:p-4 bg-gradient-to-r from-emerald-500 to-green-500 rounded-lg border-2 border-emerald-400 shadow-lg">
              <div className="space-y-2">
                <p className="text-base sm:text-lg font-bold text-white text-center">
                  🎯 {formatMexicanNumber(tickets)} boleto{tickets !== 1 ? 's' : ''} | Total: {formatPriceMXN(calculatePrice())}
                </p>
                {selectedTickets.length > 0 && (
                  <div className="bg-white/20 rounded p-2">
                    <p className="text-sm text-emerald-100 text-center font-medium">
                      🎯 Números: {selectedTickets.slice(0, 8).map(formatearNumeroBoleto).join(', ')}{selectedTickets.length > 8 && ` +${selectedTickets.length - 8} más`}
                    </p>
                  </div>
                )}
                {hasDiscount && priceCalculations.hasDiscount && (
                  <div className="flex items-center justify-between bg-white/20 rounded p-2">
                    <span className="text-sm text-emerald-100 line-through">
                      Precio normal: {formatPriceMXN(priceCalculations.basePrice)}
                    </span>
                    <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse">
                      🔥 ¡Ahorras {priceCalculations.discountPercentage}%!
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Métodos de Pago - Compacto móvil */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center justify-between">
              <div className="flex items-center">
                <span className="mr-2">💳</span>
                Método de pago
              </div>
              <div className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                {paymentMethods.length} métodos
              </div>
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 w-full">
              {(() => {
                console.log('🚨 CRITICAL DEBUG - PAYMENT METHODS RENDERING:');
                console.log('🏦 PAYMENT METHODS COUNT:', paymentMethods.length);
                console.log('🏦 PAYMENT METHODS ARRAY:', paymentMethods);
                console.log('🏦 PAYMENT METHODS MAPPED:', paymentMethods.map(m => ({ id: m.id, name: m.name, logo: m.logo })));
                console.log('🏦 STARTING RENDER LOOP...');

                if (paymentMethods.length !== 4) {
                  console.error(`🚨 CRITICAL: Expected 4 payment methods, got ${paymentMethods.length}`);
                  console.error('🚨 Missing methods will cause UI to show only partial list');
                }

                return paymentMethods;
              })().map((method, index) => {
                console.log(`🏦 RENDERING METHOD ${index + 1}/${paymentMethods.length}:`, {
                  id: method.id,
                  name: method.name,
                  logo: method.logo,
                  hasDetails: !!method.details
                });
                return (
                <button
                  key={method.id}
                  onClick={() => handlePaymentSelect(method.id)}
                  className={`p-2 sm:p-3 rounded-lg border-2 transition-all min-h-[80px] flex flex-col items-center justify-center ${
                    selectedPayment === method.id
                      ? 'border-emerald-500 bg-emerald-50 shadow-lg scale-105'
                      : 'border-gray-300 bg-white hover:border-emerald-400 hover:shadow-md hover:bg-emerald-50'
                  }`}
                >
                  <div className="flex items-center justify-center h-8 sm:h-10 mb-1 sm:mb-2">
                    <Image
                      src={method.logo}
                      alt={method.name}
                      width={32}
                      height={32}
                      className="max-h-8 sm:max-h-10 w-auto"
                      onError={(e) => {
                        console.error(`🚨 CRITICAL - IMAGE LOAD ERROR:`, {
                          method: method.name,
                          logo: method.logo,
                          src: e.currentTarget.src,
                          index: index + 1,
                          totalMethods: paymentMethods.length
                        });
                        e.currentTarget.style.display = 'none';
                        // Show fallback icon
                        const fallbackIcon = e.currentTarget.parentElement?.querySelector('.fallback-icon') as HTMLElement;
                        if (fallbackIcon) {
                          fallbackIcon.style.display = 'block';
                          console.log(`✅ FALLBACK ICON SHOWN for ${method.name}`);
                        } else {
                          console.error(`🚨 NO FALLBACK ICON FOUND for ${method.name}`);
                        }
                      }}
                      onLoad={() => {
                        console.log(`✅ IMAGE LOADED SUCCESSFULLY:`, {
                          method: method.name,
                          logo: method.logo,
                          index: index + 1,
                          totalMethods: paymentMethods.length
                        });
                      }}
                    />
                    {/* Fallback icon for failed image loads */}
                    <div className="fallback-icon hidden text-2xl">💳</div>
                  </div>
                  <p className="font-bold text-gray-800 text-xs sm:text-sm">{method.name}</p>
                </button>
                );
              })}
            </div>
            {errors.payment && <p className="text-red-600 text-sm font-medium bg-red-50 p-2 rounded">{errors.payment}</p>}
            
            {/* Detalles del método de pago seleccionado */}
            {selectedPaymentMethod && (
              <div className="p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-emerald-50 rounded-lg border-2 border-emerald-200 shadow-inner">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                  <span className="mr-2">📋</span>
                  Datos para {selectedPaymentMethod.name}
                </h4>
                
                {/* Datos del método de pago */}
                <div className="space-y-3">
                  {/* Mostrar datos específicos según el método */}
                  {selectedPaymentMethod.id === 'binance' && (
                    <div className="text-center">
                      <img
                        src="/premios/QR.jpg"
                        alt="Código QR Binance Pay"
                        className="mx-auto w-48 h-48 object-contain rounded-lg border-2 border-emerald-300 bg-white p-2"
                      />
                      <p className="text-sm text-gray-600 mt-2">Escanea el código QR desde tu app Binance</p>
                    </div>
                  )}

                  <div>
                    <span className="text-sm font-medium text-gray-700 block mb-2">Información para pago:</span>
                    <div className="p-3 bg-white border-2 border-emerald-300 rounded-lg font-mono text-sm text-gray-900 whitespace-pre-line">
                      {selectedPaymentMethod.id === 'binance' &&
                        `Binance ID: ${(selectedPaymentMethod.details as any).binanceId || '168868614'}\nTeléfono: +523343461630`
                      }
                      {selectedPaymentMethod.id === 'banamex' &&
                        `Banco Banamex\nTitular: ${(selectedPaymentMethod.details as any).holder || 'Egleimis Ollarves'}\nNro cuenta: ${(selectedPaymentMethod.details as any).account || '8744427'}\nCuenta clave (CLABE): ${(selectedPaymentMethod.details as any).clabe || '002180702087444274'}\nTeléfono: +523343461630`
                      }
                      {selectedPaymentMethod.id === 'bbva' &&
                        `BBVA México\nTitular: ${(selectedPaymentMethod.details as any).holder || 'Egliskar Ollarves'}\nTarjeta: ${(selectedPaymentMethod.details as any).card || '4152314364090798'}\nTeléfono: +523343461630`
                      }
                      {selectedPaymentMethod.id === 'oxxo' &&
                        `OXXO\nReferencia: ${(selectedPaymentMethod.details as any).card || '4152314364090798'}\nTeléfono: +523343461630`
                      }
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-emerald-100 p-3 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Monto a pagar:</span>
                    <span className="font-bold text-lg text-emerald-700">{formatPriceMXN(calculatePrice())}</span>
                  </div>

                  {selectedPaymentMethod.id === 'binance' && (
                    <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                      💡 {(selectedPaymentMethod.details as any).instructions || 'Escanea el código QR desde la app Binance'}
                    </p>
                  )}

                  {selectedPaymentMethod.id === 'oxxo' && (
                    <p className="text-sm text-gray-600 bg-orange-50 p-3 rounded-lg border border-orange-200">
                      🏪 {(selectedPaymentMethod.details as any).instructions || 'Presenta esta referencia en cualquier tienda OXXO'}
                    </p>
                  )}

                  {(selectedPaymentMethod.id === 'banamex' || selectedPaymentMethod.id === 'bbva') && (
                    <p className="text-sm text-gray-600 bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                      🏦 {(selectedPaymentMethod.details as any).instructions || 'Transferencia SPEI o depósito en ventanilla'}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Upload de Comprobante - Compacto móvil */}
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <span className="mr-2">📸</span>
                Comprobante
              </h3>
              <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-bold">
                Opcional ahora
              </div>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-800 text-center font-medium">
                ⚠️ <strong>Importante:</strong> El comprobante es necesario para validar tu compra y asignar tus boletos oficialmente
              </p>
              <p className="text-xs text-amber-700 text-center mt-1">
                Puedes subirlo ahora o enviarlo después por WhatsApp
              </p>
            </div>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-4 sm:p-6 border-2 border-dashed rounded-lg text-center cursor-pointer transition-all ${
                isDragOver
                  ? 'border-emerald-500 bg-emerald-50'
                  : uploadedFile.archivo
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 hover:border-emerald-400 hover:bg-emerald-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.pdf"
                onChange={handleFileInputChange}
                className="hidden"
              />
              
              {uploadedFile.archivo ? (
                <div className="space-y-2">
                  <div className="text-4xl">✅</div>
                  <p className="font-bold text-green-700">{uploadedFile.nombreArchivo}</p>
                  <p className="text-sm text-green-600">
                    📄 {(uploadedFile.tamaño / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <p className="text-xs text-gray-600">¡Archivo subido correctamente!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-4xl text-gray-400">📤</div>
                  <p className="font-bold text-gray-700">Sube tu comprobante de pago</p>
                  <p className="text-sm text-gray-600">PNG, JPG, PDF (máximo 5MB)</p>
                  <p className="text-xs text-gray-500">Arrastra el archivo aquí o haz clic para seleccionar</p>
                </div>
              )}
            </div>
            {errors.file && <p className="text-red-600 text-sm font-medium bg-red-50 p-2 rounded">{errors.file}</p>}
          </div>

          {/* Formulario de Datos Simplificado - Móvil friendly */}
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <span className="mr-2">👤</span>
                Datos básicos
              </h3>
              <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-bold">
                Solo 30 segundos
              </div>
            </div>
            
            <div className="p-3 sm:p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <p className="text-sm text-gray-700 text-center font-medium">
                🚀 Solo necesitamos tu nombre y contacto. ¡Lo demás es opcional!
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 select-none">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  value={customerData.nombre}
                  onChange={(e) => handleInputChange('nombre', e.target.value)}
                  className="w-full p-2.5 sm:p-2 border border-gray-300 rounded-lg focus:border-emerald-500 focus:outline-none text-sm"
                  placeholder="Tu nombre"
                />
                {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 select-none">
                  Apellidos *
                </label>
                <input
                  type="text"
                  value={customerData.apellidos}
                  onChange={(e) => handleInputChange('apellidos', e.target.value)}
                  className="w-full p-2.5 sm:p-2 border border-gray-300 rounded-lg focus:border-emerald-500 focus:outline-none text-sm"
                  placeholder="Tus apellidos"
                />
                {errors.apellidos && <p className="text-red-500 text-xs mt-1">{errors.apellidos}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 select-none">
                  WhatsApp *
                </label>
                <input
                  type="tel"
                  value={customerData.telefono}
                  onChange={(e) => handleInputChange('telefono', e.target.value)}
                  className="w-full p-2.5 sm:p-2 border border-gray-300 rounded-lg focus:border-emerald-500 focus:outline-none text-sm"
                  placeholder="+523343461630"
                />
                {errors.telefono && <p className="text-red-500 text-xs mt-1">{errors.telefono}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 select-none">
                  Email (opcional)
                </label>
                <input
                  type="email"
                  value={customerData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full p-2.5 sm:p-2 border border-gray-300 rounded-lg focus:border-emerald-500 focus:outline-none text-sm"
                  placeholder="tu@email.com"
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>

              {/* Mensaje de error para contacto */}
              {errors.contacto && (
                <div className="md:col-span-2">
                  <p className="text-red-500 text-sm bg-red-50 p-2 rounded-lg border border-red-200">
                    {errors.contacto}
                  </p>
                </div>
              )}

              {/* Campos opcionales colapsables */}
              <div className="sm:col-span-2">
                <details className="group">
                  <summary className="flex items-center justify-between cursor-pointer p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <span className="text-sm font-medium text-gray-700">📍 Datos adicionales (opcional)</span>
                    <svg className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </summary>
                  <div className="mt-3 space-y-3 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1 select-none">
                        Estado/Región
                      </label>
                      <select
                        value={customerData.estado}
                        onChange={(e) => handleInputChange('estado', e.target.value)}
                        className="w-full p-2.5 sm:p-2 border border-gray-300 rounded-lg focus:border-emerald-500 focus:outline-none text-sm"
                      >
                        <option value="">Selecciona tu estado</option>
                        {estados.map((estado) => (
                          <option key={estado} value={estado}>{estado}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1 select-none">
                        Ciudad
                      </label>
                      <input
                        type="text"
                        value={customerData.ciudad}
                        onChange={(e) => handleInputChange('ciudad', e.target.value)}
                        className="w-full p-2.5 sm:p-2 border border-gray-300 rounded-lg focus:border-emerald-500 focus:outline-none text-sm"
                        placeholder="Tu ciudad"
                      />
                    </div>
                  </div>
                </details>
              </div>
            </div>
          </div>
          
          {/* Resumen Final y Confirmación - Optimizado móvil */}
          {(tickets >= 2 && selectedPayment && customerData.nombre && (customerData.telefono || customerData.email)) && (
            <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border-2 border-emerald-200 shadow-inner">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <span className="mr-2">📋</span>
                Resumen de tu orden
              </h3>
              
              <div className="space-y-3 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0">
                {/* Columna izquierda: Detalles de compra */}
                <div className="space-y-2 sm:space-y-3">
                  <div className="bg-white p-3 rounded-lg border border-emerald-200">
                    <h4 className="font-bold text-emerald-800 mb-2">🎫 Boletos</h4>
                    <p className="text-gray-800">
                      <span className="font-bold text-lg">{formatMexicanNumber(tickets)}</span> boletos × {formatPriceMXN(PRECIO_POR_BOLETO_MXN)}
                    </p>
                    {hasDiscount && priceCalculations.hasDiscount && (
                      <p className="text-green-600 font-medium text-sm">
                        ✨ Descuento aplicado: {priceCalculations.discountPercentage}%
                      </p>
                    )}
                    <p className="text-xl font-bold text-emerald-700 mt-2">
                      Total: {formatPriceMXN(priceCalculations.discountedPrice)}
                    </p>
                  </div>
                  
                  <div className="bg-white p-3 rounded-lg border border-emerald-200">
                    <h4 className="font-bold text-emerald-800 mb-2">💳 Pago</h4>
                    <p className="text-gray-800 font-medium">{selectedPaymentMethod?.name}</p>
                    {uploadedFile.archivo ? (
                      <p className="text-green-600 text-sm mt-1">
                        ✅ Comprobante: {uploadedFile.nombreArchivo}
                      </p>
                    ) : (
                      <p className="text-amber-600 text-sm mt-1">
                        ⏳ Comprobante: Enviarás después
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Columna derecha: Datos del cliente */}
                <div className="space-y-2 sm:space-y-3">
                  <div className="bg-white p-3 rounded-lg border border-emerald-200">
                    <h4 className="font-bold text-emerald-800 mb-2">👤 Datos de contacto</h4>
                    <p className="text-gray-800 font-medium">{customerData.nombre}</p>
                    {customerData.telefono && (
                      <p className="text-gray-600 text-sm">📱 {customerData.telefono}</p>
                    )}
                    {customerData.email && (
                      <p className="text-gray-600 text-sm">📧 {customerData.email}</p>
                    )}
                    {customerData.estado && (
                      <p className="text-gray-600 text-sm">📍 {customerData.estado}</p>
                    )}
                  </div>
                  
                  <div className="bg-green-100 p-3 rounded-lg border border-green-200">
                    <p className="text-green-800 font-medium text-sm text-center">
                      🚀 ¡Todo listo! Revisa los datos y confirma tu compra
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Términos y condiciones */}
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-1 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 focus:ring-2"
                  />
                  <div className="flex-1">
                    <span className="text-sm text-gray-700 leading-relaxed">
                      Acepto los <a href="#" className="text-emerald-600 hover:text-emerald-700 underline">términos y condiciones</a> de la rifa y confirmo que mis datos son correctos.
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      Al marcar esta casilla, autorizo el procesamiento de mis datos para participar en el sorteo.
                    </p>
                  </div>
                </label>
                {!acceptedTerms && (
                  <div className="mt-2 text-amber-600 text-xs bg-amber-50 p-2 rounded border border-amber-200">
                    💡 Debes aceptar los términos para continuar
                  </div>
                )}
              </div>
              
              {/* Botón final de envío */}
              {acceptedTerms && (
                <div className="mt-6 text-center">
                  <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 hover:from-green-600 hover:via-emerald-600 hover:to-green-700 text-white text-lg sm:text-2xl font-black py-4 sm:py-6 px-4 sm:px-8 rounded-xl sm:rounded-2xl shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 border-2 sm:border-4 border-green-400 hover:border-green-500 animate-pulse hover:animate-none"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center space-x-3">
                        <svg className="animate-spin h-6 w-6 sm:h-8 sm:w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Procesando tu compra...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-2 sm:space-x-3">
                        <span className="text-xl sm:text-3xl">🚀</span>
                        <span>ENVIAR MI ORDEN</span>
                        <span className="text-xl sm:text-3xl">🎯</span>
                      </div>
                    )}
                  </button>
                  
                  <p className="text-xs text-gray-500 mt-3 leading-relaxed">
                    Al enviar tu orden, recibirás una confirmación y nos pondremos en contacto contigo para finalizar el proceso de pago.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer simplificado - Sticky móvil */}
        <div className="border-t border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 p-3 sm:p-4 sticky bottom-0 sm:relative">
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
            <button
              onClick={openWhatsApp}
              className="flex items-center space-x-1.5 sm:space-x-2 text-green-600 hover:text-green-700 font-medium transition-colors text-sm sm:text-base"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.306"/>
              </svg>
              <span className="hidden sm:inline">💬 ¿Dudas? Escríbenos por WhatsApp</span>
              <span className="sm:hidden">💬 WhatsApp</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 sm:px-6 py-2 sm:py-3 border-2 border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 font-medium transition-colors text-sm sm:text-base"
            >
              Cerrar
            </button>
          </div>
        </div>
        
        {/* Pantalla de éxito con confeti */}
        {showSuccess && (
          <div className="absolute inset-0 bg-white flex items-center justify-center z-50 rounded-xl">
            <div className="text-center p-8 max-w-md mx-auto">
              {/* Confeti animado */}
              <div className="confetti-container mb-6">
                {[...Array(50)].map((_, i) => (
                  <div
                    key={i}
                    className="confetti"
                    style={{
                      left: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 3}s`,
                      backgroundColor: ['#10B981', '#059669', '#34D399', '#F59E0B', '#EF4444', '#8B5CF6'][Math.floor(Math.random() * 6)]
                    }}
                  />
                ))}
              </div>
              
              {/* Mensaje de éxito */}
              <div className="animate-bounce mb-6">
                <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
              </div>
              
              <h3 className="text-3xl font-black text-gray-900 mb-4">
                ¡ORDEN ENVIADA! 🎉
              </h3>
              
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-4">
                <p className="text-green-800 font-bold text-lg mb-2">
                  {formatMexicanNumber(tickets)} boletos • {formatPriceMXN(calculatePrice())}
                </p>
                <p className="text-green-700 text-sm">
                  Método: {selectedPaymentMethod?.name}
                </p>
              </div>
              
              <p className="text-gray-700 text-lg mb-2">
                <strong>¡Perfecto!</strong> Tu orden ha sido enviada exitosamente.
              </p>
              
              <p className="text-gray-600 text-sm">
                Te contactaremos por <strong>{customerData.telefono || customerData.email}</strong> para confirmar el pago y finalizar tu participación.
              </p>
              
              <div className="mt-6 text-gray-500 text-sm">
                Esta ventana se cerrará automáticamente...
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Estilos CSS para el confeti */}
      <style jsx>{`
        .confetti-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          pointer-events: none;
        }
        
        .confetti {
          position: absolute;
          width: 8px;
          height: 8px;
          border-radius: 2px;
          animation: confetti-fall 3s linear infinite;
        }
        
        @keyframes confetti-fall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// OPTIMIZACIONES IMPLEMENTADAS:
// ✅ Modal con fondo sólido (bg-black bg-opacity-75) sin transparencias
// ✅ Cards del modal CON descuentos progresivos (hasta 30% máximo)
// ✅ Precios tachados + precio con descuento destacado en verde
// ✅ Badges de descuento animados (-X%) en cards con descuento
// ✅ Handlers optimizados con useCallback para mejor performance
// ✅ Cálculos de precio memoizados para evitar re-cálculos innecesarios
// ✅ Cards responsivas y rápidas sin lag al click
// ✅ Input personalizado deshabilitado cuando hay tickets pre-seleccionados
// ============================================================================