'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';

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

const paymentMethods = [
  { 
    id: 'binance', 
    name: 'Binance Pay', 
    logo: '/logos/binance.svg',
    details: {
      type: 'crypto',
      address: 'TQhPr3q4K5zJ8xVm2nF7wX9pL4uY6tR3sA',
      network: 'TRC20 (USDT)',
      instructions: 'Envía el monto exacto en USDT a la dirección mostrada'
    }
  },
  { 
    id: 'oxxo', 
    name: 'OXXO', 
    logo: '/logos/oxxo.png',
    details: {
      type: 'store',
      reference: 'RIFA-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      instructions: 'Presenta esta referencia en cualquier tienda OXXO y paga el monto exacto'
    }
  },
  { 
    id: 'azteca', 
    name: 'Banco Azteca', 
    logo: '/logos/bancoazteca.png',
    details: {
      type: 'bank',
      account: '5204 1234 5678 9012',
      clabe: '127180012345678901',
      holder: 'RIFAS MEXICANAS SA DE CV',
      instructions: 'Transferencia bancaria o depósito en sucursal'
    }
  },
  { 
    id: 'bancoppel', 
    name: 'BanCoppel', 
    logo: '/logos/bancoppel.png',
    details: {
      type: 'bank',
      account: '4152 3140 0987 6543',
      clabe: '137180098765432109',
      holder: 'RIFAS MEXICANAS SA DE CV',
      instructions: 'Transferencia SPEI o depósito en ventanilla'
    }
  }
];

const estados = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche',
  'Chiapas', 'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima',
  'Durango', 'Estado de México', 'Guanajuato', 'Guerrero', 'Hidalgo',
  'Jalisco', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca',
  'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa',
  'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas'
];

export default function ComprehensivePurchaseModal({ isOpen, onClose, initialTickets = 25, hasDiscount = false }: Props) {
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
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

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
      // Set initial tickets amount
      setTickets(initialTickets);
      
      const savedData = localStorage.getItem('purchase-progress');
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          // Only restore saved data if no initial tickets specified
          if (initialTickets === 25) {
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
  }, [isOpen, initialTickets]);

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

  // Handlers
  const handleTicketSelect = (amount: number) => {
    setTickets(amount);
    setCustomTickets('');
    setErrors({ ...errors, tickets: '' });
  };

  const handleCustomTickets = (value: string) => {
    const num = parseInt(value);
    if (value === '' || (num >= 2 && num <= 10000)) {
      setCustomTickets(value);
      if (num) setTickets(num);
      setErrors({ ...errors, tickets: '' });
    } else {
      setErrors({ ...errors, tickets: 'Mínimo 2 boletos, máximo 10,000' });
    }
  };

  const handlePaymentSelect = (methodId: string) => {
    setSelectedPayment(methodId);
    setErrors({ ...errors, payment: '' });
  };

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

  const handleInputChange = (field: keyof CustomerData, value: string) => {
    setCustomerData({ ...customerData, [field]: value });
    
    // Validación en tiempo real
    if (field === 'email' && value && !validateEmail(value)) {
      setErrors({ ...errors, [field]: 'Email inválido' });
    } else if (field === 'telefono' && value && !validatePhone(value)) {
      setErrors({ ...errors, [field]: 'Teléfono inválido (formato: +52XXXXXXXXXX)' });
    } else {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Solo validar lo esencial
    if (tickets < 2) {
      newErrors.tickets = 'Mínimo 2 boletos';
    }

    if (!selectedPayment) {
      newErrors.payment = 'Selecciona un método de pago';
    }

    // Solo validar nombre y teléfono/email (uno de los dos)
    if (!customerData.nombre.trim()) {
      newErrors.nombre = 'Ingresa tu nombre';
    }
    
    if (!customerData.telefono.trim() && !customerData.email.trim()) {
      newErrors.contacto = 'Ingresa tu teléfono o email';
    }

    if (!acceptedTerms) {
      newErrors.terms = 'Debes aceptar los términos y condiciones';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    // Si no están completos los datos mínimos, mostrar mensaje amigable
    if (!validateForm()) {
      const missingData = [];
      if (tickets < 2) missingData.push('cantidad de boletos');
      if (!selectedPayment) missingData.push('método de pago');
      if (!customerData.nombre.trim()) missingData.push('nombre');
      if (!customerData.telefono.trim() && !customerData.email.trim()) missingData.push('teléfono o email');
      if (!acceptedTerms) missingData.push('aceptar términos y condiciones');
      
      alert(`¡Casi listo! Solo completa: ${missingData.join(', ')}`);
      return;
    }

    setIsLoading(true);

    // Estructura simplificada para backend
    const purchaseData = {
      boletos: {
        cantidad: tickets,
        precioUnitario: 10,
        total: calculatePrice()
      },
      metodoPago: selectedPaymentMethod?.name || '',
      datosCliente: {
        nombre: customerData.nombre,
        telefono: customerData.telefono || 'No proporcionado',
        email: customerData.email || 'No proporcionado',
        estado: customerData.estado || 'No especificado',
        ciudad: customerData.ciudad || 'No especificada',
        infoAdicional: customerData.infoAdicional
      },
      comprobante: uploadedFile.archivo ? 'Archivo subido' : 'Enviará después',
      timestamp: new Date().toLocaleString(),
      hasDiscount
    };

    try {
      // Simular procesamiento
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Orden creada:', purchaseData);
      
      // Mostrar efecto de éxito
      setShowSuccess(true);
      setIsLoading(false);
      
      // Limpiar datos guardados
      localStorage.removeItem('purchase-progress');
      
      // Cerrar automáticamente después del confeti
      setTimeout(() => {
        onClose();
        setShowSuccess(false);
      }, 3000);
      
    } catch (error) {
      console.error('Error:', error);
      alert('Ups, algo salió mal. Inténtalo de nuevo.');
      setIsLoading(false);
    }
  };

  // Función para calcular precio con descuentos
  const calculatePrice = () => {
    if (!hasDiscount) {
      return tickets * 10; // Precio completo
    }
    
    // Aplicar descuentos solo cuando viene de promoción
    if (tickets >= 100) return Math.floor(tickets * 10 * 0.65); // 35% descuento
    if (tickets >= 50) return Math.floor(tickets * 10 * 0.70); // 30% descuento
    if (tickets >= 25) return Math.floor(tickets * 10 * 0.75); // 25% descuento
    if (tickets >= 10) return Math.floor(tickets * 10 * 0.80); // 20% descuento
    if (tickets >= 5) return Math.floor(tickets * 10 * 0.90); // 10% descuento
    return tickets * 10; // Sin descuento para menos de 5
  };

  const getDiscount = () => {
    if (!hasDiscount) return 0;
    
    if (tickets >= 100) return 35;
    if (tickets >= 50) return 30;
    if (tickets >= 25) return 25;
    if (tickets >= 10) return 20;
    if (tickets >= 5) return 10;
    return 0;
  };

  const openWhatsApp = () => {
    const message = '¡Hola! Tengo dudas sobre la compra de boletos para la rifa.';
    const whatsappUrl = `https://wa.me/5212345678910?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleConfirmAndContinue = () => {
    if (!validateForm()) {
      const missingData = [];
      if (tickets < 2) missingData.push('cantidad de boletos');
      if (!selectedPayment) missingData.push('método de pago');
      if (!customerData.nombre.trim()) missingData.push('nombre');
      if (!customerData.telefono.trim() && !customerData.email.trim()) missingData.push('teléfono o email');
      if (!acceptedTerms) missingData.push('aceptar términos y condiciones');
      
      alert(`¡Casi listo! Solo completa: ${missingData.join(', ')}`);
      return;
    }
    
    setIsConfirmed(true);
  };

  const selectedPaymentMethod = paymentMethods.find(p => p.id === selectedPayment);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-black bg-opacity-60 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[95vh] overflow-hidden bg-white rounded-xl shadow-2xl animate-bounce-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-purple-200 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600">
          <div>
            <h2 className="text-xl font-bold text-white">🎯 Compra Rápida de Boletos</h2>
            <div className="flex items-center mt-1 space-x-3 text-purple-100">
              <div className="text-sm flex items-center">
                ⏰ <span className="font-mono font-bold ml-1">{formatTime(timeLeft)}</span>
              </div>
              <div className="text-sm flex items-center">
                📊 <span className="font-bold ml-1">{Math.round(progress)}% completo</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3 bg-gray-100">
          <div 
            className="h-full bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Content */}
        <div className="max-h-[calc(95vh-100px)] overflow-y-auto p-4 space-y-6">
          {/* Sección de Boletos */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center">
              <span className="mr-2">🎫</span>
              Selecciona tus boletos
            </h3>
            <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
              <p className="text-sm text-gray-700 font-medium text-center">
                💡 Mínimo 2 boletos • Máximo 10,000 • <span className="font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">$10 USD por boleto</span>
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[2, 5, 10, 25, 50, 100].map((amount) => (
                <button
                  key={amount}
                  onClick={() => handleTicketSelect(amount)}
                  className={`p-3 rounded-lg border-2 font-bold transition-all text-center ${
                    tickets === amount
                      ? 'border-purple-500 bg-purple-100 text-purple-800 shadow-lg scale-105'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-purple-400 hover:bg-purple-50 hover:text-purple-700'
                  }`}
                >
                  <div className="text-lg">{amount}</div>
                  <div className="text-xs text-gray-500">boletos</div>
                </button>
              ))}
            </div>
            
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">O ingresa cantidad personalizada:</label>
              <input
                type="number"
                placeholder="Cantidad personalizada"
                value={customTickets}
                onChange={(e) => handleCustomTickets(e.target.value)}
                className="w-full p-3 border-2 border-gray-300 rounded-lg font-medium text-center focus:border-emerald-500 focus:outline-none bg-white text-gray-900 placeholder-gray-400"
                min="2"
                max="10000"
              />
            </div>
            
            {errors.tickets && <p className="text-red-600 text-sm font-medium bg-red-50 p-2 rounded">{errors.tickets}</p>}
            
            <div className="p-4 bg-gradient-to-r from-emerald-500 to-green-500 rounded-lg border-2 border-emerald-400 shadow-lg">
              <div className="space-y-2">
                <p className="text-lg font-bold text-white text-center">
                  🎯 {tickets.toLocaleString()} boletos | Total: ${calculatePrice().toLocaleString()} USD
                </p>
                {hasDiscount && getDiscount() > 0 && (
                  <div className="flex items-center justify-between bg-white/20 rounded p-2">
                    <span className="text-sm text-emerald-100 line-through">
                      Precio normal: ${(tickets * 10).toLocaleString()} USD
                    </span>
                    <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse">
                      🔥 ¡Ahorras {getDiscount()}%!
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Métodos de Pago */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center">
              <span className="mr-2">💳</span>
              Método de pago
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => handlePaymentSelect(method.id)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedPayment === method.id
                      ? 'border-emerald-500 bg-emerald-50 shadow-lg scale-105'
                      : 'border-gray-300 bg-white hover:border-emerald-400 hover:shadow-md hover:bg-emerald-50'
                  }`}
                >
                  <div className="flex items-center justify-center h-10 mb-2">
                    <Image
                      src={method.logo}
                      alt={method.name}
                      width={40}
                      height={40}
                      className="max-h-10 w-auto"
                    />
                  </div>
                  <p className="font-bold text-gray-800 text-sm">{method.name}</p>
                </button>
              ))}
            </div>
            {errors.payment && <p className="text-red-600 text-sm font-medium bg-red-50 p-2 rounded">{errors.payment}</p>}
            
            {/* Detalles del método de pago seleccionado */}
            {selectedPaymentMethod && (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-emerald-50 rounded-lg border-2 border-emerald-200 shadow-inner">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                  <span className="mr-2">📋</span>
                  Datos para {selectedPaymentMethod.name}
                </h4>
                
                {selectedPaymentMethod.details.type === 'crypto' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Red:</span>
                      <span className="font-mono text-sm bg-white px-2 py-1 rounded border text-gray-900">{selectedPaymentMethod.details.network}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700 block mb-2">Dirección:</span>
                      <div className="p-3 bg-white border-2 border-emerald-300 rounded-lg font-mono text-sm break-all text-gray-900 select-all">
                        {selectedPaymentMethod.details.address}
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-emerald-100 p-3 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">Monto a enviar:</span>
                      <span className="font-bold text-lg text-emerald-700">${calculatePrice()} USDT</span>
                    </div>
                    <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                      💡 {selectedPaymentMethod.details.instructions}
                    </p>
                  </div>
                )}
                
                {selectedPaymentMethod.details.type === 'store' && (
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-700 block mb-2">Referencia:</span>
                      <div className="p-4 bg-white border-2 border-orange-300 rounded-lg font-mono text-xl font-bold text-center text-gray-900 select-all">
                        {selectedPaymentMethod.details.reference}
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-emerald-100 p-3 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">Monto a pagar:</span>
                      <span className="font-bold text-lg text-emerald-700">${calculatePrice()} USD</span>
                    </div>
                    <p className="text-sm text-gray-600 bg-orange-50 p-3 rounded-lg border border-orange-200">
                      🏪 {selectedPaymentMethod.details.instructions}
                    </p>
                  </div>
                )}
                
                {selectedPaymentMethod.details.type === 'bank' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Titular:</span>
                      <span className="font-bold text-gray-900">{selectedPaymentMethod.details.holder}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Cuenta:</span>
                      <span className="font-mono bg-white px-2 py-1 rounded border text-gray-900">{selectedPaymentMethod.details.account}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700 block mb-2">CLABE:</span>
                      <div className="p-3 bg-white border-2 border-blue-300 rounded-lg font-mono text-sm text-gray-900 select-all">
                        {selectedPaymentMethod.details.clabe}
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-emerald-100 p-3 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">Monto a transferir:</span>
                      <span className="font-bold text-lg text-emerald-700">${calculatePrice()} USD</span>
                    </div>
                    <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
                      🏦 {selectedPaymentMethod.details.instructions}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Upload de Comprobante */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-gray-900 flex items-center">
              <span className="mr-2">📸</span>
              Comprobante de pago
            </h3>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 border-2 border-dashed rounded-lg text-center cursor-pointer transition-all ${
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

          {/* Formulario de Datos Simplificado */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center">
              <span className="mr-2">👤</span>
              Para contactarte (solo lo esencial)
            </h3>
            
            <div className="p-4 bg-gradient-to-r from-blue-50 to-emerald-50 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-700 text-center">
                💡 Solo necesitamos tu nombre y una forma de contactarte. ¡Todo lo demás es opcional!
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  value={customerData.nombre}
                  onChange={(e) => handleInputChange('nombre', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                  placeholder="Tu nombre"
                />
                {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Apellidos *
                </label>
                <input
                  type="text"
                  value={customerData.apellidos}
                  onChange={(e) => handleInputChange('apellidos', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                  placeholder="Tus apellidos"
                />
                {errors.apellidos && <p className="text-red-500 text-xs mt-1">{errors.apellidos}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Teléfono *
                </label>
                <input
                  type="tel"
                  value={customerData.telefono}
                  onChange={(e) => handleInputChange('telefono', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                  placeholder="+52 55 1234 5678"
                />
                {errors.telefono && <p className="text-red-500 text-xs mt-1">{errors.telefono}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={customerData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                  placeholder="tu@email.com"
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Estado/Región *
                </label>
                <select
                  value={customerData.estado}
                  onChange={(e) => handleInputChange('estado', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                >
                  <option value="">Selecciona tu estado</option>
                  {estados.map((estado) => (
                    <option key={estado} value={estado}>{estado}</option>
                  ))}
                </select>
                {errors.estado && <p className="text-red-500 text-xs mt-1">{errors.estado}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Ciudad *
                </label>
                <input
                  type="text"
                  value={customerData.ciudad}
                  onChange={(e) => handleInputChange('ciudad', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                  placeholder="Tu ciudad"
                />
                {errors.ciudad && <p className="text-red-500 text-xs mt-1">{errors.ciudad}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Información adicional
                </label>
                <textarea
                  value={customerData.infoAdicional}
                  onChange={(e) => handleInputChange('infoAdicional', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                  rows={2}
                  placeholder="Información adicional (opcional)"
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {customerData.infoAdicional.length}/500 caracteres
                </p>
              </div>
            </div>
          </div>
          
          {/* Resumen Final y Confirmación */}
          {(tickets >= 2 && selectedPayment && customerData.nombre && (customerData.telefono || customerData.email)) && (
            <div className="space-y-4 p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border-2 border-emerald-200 shadow-inner">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <span className="mr-2">📋</span>
                Resumen de tu orden
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Columna izquierda: Detalles de compra */}
                <div className="space-y-3">
                  <div className="bg-white p-3 rounded-lg border border-emerald-200">
                    <h4 className="font-bold text-emerald-800 mb-2">🎫 Boletos</h4>
                    <p className="text-gray-800">
                      <span className="font-bold text-lg">{tickets.toLocaleString()}</span> boletos × $10 USD
                    </p>
                    {hasDiscount && getDiscount() > 0 && (
                      <p className="text-green-600 font-medium text-sm">
                        ✨ Descuento aplicado: {getDiscount()}%
                      </p>
                    )}
                    <p className="text-xl font-bold text-emerald-700 mt-2">
                      Total: ${calculatePrice().toLocaleString()} USD
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
                <div className="space-y-3">
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
                    className="w-full bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 hover:from-green-600 hover:via-emerald-600 hover:to-green-700 text-white text-2xl font-black py-6 px-8 rounded-2xl shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 border-4 border-green-400 hover:border-green-500 animate-pulse hover:animate-none"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center space-x-3">
                        <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Procesando tu compra...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-3">
                        <span className="text-3xl">🚀</span>
                        <span>ENVIAR MI ORDEN</span>
                        <span className="text-3xl">🎯</span>
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

        {/* Footer simplificado */}
        <div className="border-t border-emerald-200 bg-gradient-to-r from-emerald-50 to-blue-50 p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
            <button
              onClick={openWhatsApp}
              className="flex items-center space-x-2 text-green-600 hover:text-green-700 font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.306"/>
              </svg>
              <span>💬 ¿Dudas? Escríbenos por WhatsApp</span>
            </button>

            <button
              onClick={onClose}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
        
        {/* Pantalla de éxito con confeti */}
        {showSuccess && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex items-center justify-center z-50 rounded-xl">
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
                  {tickets} boletos • ${calculatePrice().toLocaleString()} USD
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