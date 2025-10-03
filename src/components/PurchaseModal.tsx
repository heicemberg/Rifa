// ============================================================================
// MODAL COMPLETO DE COMPRA CON FLUJO DE PAGO
// ============================================================================

'use client';

import React, { useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { cn } from '../lib/utils';
import OptimizedTicketGrid from './OptimizedTicketGrid';

// ============================================================================
// TIPOS
// ============================================================================

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTickets: number[];
  soldTickets: number[];
  reservedTickets: number[];
  onToggleTicket: (ticketNumber: number) => void;
  onSelectRandom: (count: number) => void;
  totalPrice: number;
}

type PurchaseStep = 'tickets' | 'payment' | 'upload' | 'details' | 'success';

interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  account: string;
  details: string;
}

interface UserDetails {
  name: string;
  email: string;
  whatsapp: string;
  city: string;
}

// ============================================================================
// DATOS DE MÉTODOS DE PAGO
// ============================================================================

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'binance',
    name: 'Binance Pay',
    icon: '/logos/binance.svg',
    account: 'rifadesilverado2024@gmail.com',
    details: 'Email Binance Pay: rifadesilverado2024@gmail.com\nEnvía el monto exacto y conserva el comprobante'
  },
  {
    id: 'banamex',
    name: 'Banco Banamex',
    icon: '/logos/banamex.svg',
    account: '8744427',
    details: 'Banco Banamex\nCuenta: 8744427\nCLABE: 002180702087444274\nTitular: Egleimis Ollarves'
  },
  {
    id: 'bbva',
    name: 'BBVA México',
    icon: '/logos/bbva.svg',
    account: '4152314364090798',
    details: 'BBVA México\nTarjeta: 4152314364090798\nTitular: Egliskar Ollarves'
  },
  {
    id: 'oxxo',
    name: 'OXXO',
    icon: '/logos/oxxo.svg',
    account: 'RIF-SIL-2024-001',
    details: 'Referencia OXXO: RIF-SIL-2024-001\nMonto exacto del pago\nConserva tu comprobante\nVe a cualquier OXXO'
  }
];

// ============================================================================
// UTILIDADES
// ============================================================================

const formatPrice = (amount: number): string => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  }
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const PurchaseModal: React.FC<PurchaseModalProps> = ({
  isOpen,
  onClose,
  selectedTickets,
  soldTickets,
  reservedTickets,
  onToggleTicket,
  onSelectRandom,
  totalPrice
}) => {
  const [currentStep, setCurrentStep] = useState<PurchaseStep>('tickets');
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [userDetails, setUserDetails] = useState<UserDetails>({
    name: '',
    email: '',
    whatsapp: '',
    city: ''
  });
  const [copyFeedback, setCopyFeedback] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset modal
  const resetModal = useCallback(() => {
    setCurrentStep('tickets');
    setSelectedPayment(null);
    setUploadedFile(null);
    setPreviewUrl('');
    setUserDetails({ name: '', email: '', whatsapp: '', city: '' });
    setCopyFeedback('');
    setLoading(false);
  }, []);

  // Handle close
  const handleClose = useCallback(() => {
    resetModal();
    onClose();
  }, [resetModal, onClose]);

  // Handle copy
  const handleCopy = useCallback(async (text: string) => {
    const success = await copyToClipboard(text);
    setCopyFeedback(success ? '¡Copiado!' : 'Error al copiar');
    setTimeout(() => setCopyFeedback(''), 2000);
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback((file: File) => {
    if (file && file.type.startsWith('image/')) {
      setUploadedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  }, []);

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  // Handle form submission
  const handleFinalSubmit = useCallback(async () => {
    if (!userDetails.name || !userDetails.email || !userDetails.whatsapp || !uploadedFile) return;
    
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setCurrentStep('success');
    setLoading(false);
  }, [userDetails, uploadedFile]);

  if (!isOpen) return null;

  const stepTitles = {
    tickets: 'Selecciona tus Boletos',
    payment: 'Método de Pago',
    upload: 'Sube tu Comprobante',
    details: 'Datos de Contacto',
    success: '¡Compra Exitosa!'
  };

  const stepNumbers = {
    tickets: 1,
    payment: 2,
    upload: 3,
    details: 4,
    success: 5
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {stepTitles[currentStep]}
            </h2>
            <p className="text-sm text-gray-600">
              Paso {stepNumbers[currentStep]} de 5
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-3 bg-gray-50">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(stepNumbers[currentStep] / 5) * 100}%`
              }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Step 1: Ticket Selection */}
          {currentStep === 'tickets' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  🎫 Tu Selección Actual
                </h3>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                  <div>
                    <p className="text-lg text-gray-700">
                      {selectedTickets.length} boleto{selectedTickets.length !== 1 ? 's' : ''} seleccionado{selectedTickets.length !== 1 ? 's' : ''}
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatPrice(totalPrice)}
                    </p>
                  </div>
                  <button
                    onClick={() => setCurrentStep('payment')}
                    disabled={selectedTickets.length === 0}
                    className={cn(
                      'mt-4 sm:mt-0 px-6 py-3 rounded-lg font-bold transition-all',
                      selectedTickets.length > 0
                        ? 'bg-green-500 hover:bg-green-600 text-white'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    )}
                  >
                    Continuar al Pago →
                  </button>
                </div>
              </div>

              <OptimizedTicketGrid
                selectedTickets={selectedTickets}
                soldTickets={soldTickets}
                reservedTickets={reservedTickets}
                onToggleTicket={onToggleTicket}
                onSelectRandom={onSelectRandom}
              />
            </div>
          )}

          {/* Step 2: Payment Method */}
          {currentStep === 'payment' && (
            <div className="space-y-6">
              <div className="text-center bg-green-50 border border-green-200 rounded-xl p-6">
                <h3 className="text-xl font-bold text-green-800 mb-2">
                  💰 Total a Pagar: {formatPrice(totalPrice)}
                </h3>
                <p className="text-green-700">
                  {selectedTickets.length} boleto{selectedTickets.length !== 1 ? 's' : ''} seleccionado{selectedTickets.length !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedPayment(method)}
                    className={cn(
                      'border-2 rounded-xl p-6 text-left transition-all',
                      selectedPayment?.id === method.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-bold">{method.name.slice(0, 3)}</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-800">{method.name}</h4>
                        <p className="text-sm text-gray-600">{method.account}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {selectedPayment && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                  <h4 className="font-bold text-blue-800 mb-4">
                    📋 Instrucciones de Pago - {selectedPayment.name}
                  </h4>
                  
                  <div className="bg-white border rounded-lg p-4 mb-4">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                      {selectedPayment.details}
                    </pre>
                    <button
                      onClick={() => handleCopy(selectedPayment.details)}
                      className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                    >
                      📋 Copiar Datos
                    </button>
                  </div>

                  {copyFeedback && (
                    <div className="bg-green-100 border border-green-300 text-green-700 px-3 py-2 rounded text-sm mb-4">
                      {copyFeedback}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => setCurrentStep('tickets')}
                      className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                    >
                      ← Atrás
                    </button>
                    <button
                      onClick={() => setCurrentStep('upload')}
                      className="flex-1 bg-green-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-600 transition-colors"
                    >
                      Ya Pagué →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Upload Receipt */}
          {currentStep === 'upload' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">
                  📷 Sube tu Comprobante de Pago
                </h3>
                <p className="text-gray-600">
                  Toma una foto clara de tu comprobante para verificar tu pago
                </p>
              </div>

              <div
                className={cn(
                  'border-2 border-dashed rounded-xl p-8 text-center transition-colors',
                  uploadedFile ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-blue-400'
                )}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                {!uploadedFile ? (
                  <div>
                    <div className="text-4xl mb-4">📱</div>
                    <p className="text-lg font-medium text-gray-700 mb-2">
                      Arrastra tu imagen aquí
                    </p>
                    <p className="text-sm text-gray-500 mb-4">
                      o haz click para seleccionar
                    </p>
                    <div className="bg-blue-600 text-white px-4 py-2 rounded-lg inline-block">
                      Seleccionar Archivo
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-4xl mb-4">✅</div>
                    <p className="text-lg font-medium text-green-700 mb-2">
                      ¡Archivo Cargado!
                    </p>
                    <p className="text-sm text-gray-600 mb-4">
                      {uploadedFile.name}
                    </p>
                    {previewUrl && (
                      <Image
                        src={previewUrl}
                        alt="Preview"
                        width={300}
                        height={200}
                        className="max-w-full max-h-48 mx-auto rounded-lg shadow-md object-contain"
                      />
                    )}
                  </div>
                )}
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-bold text-yellow-800 mb-2">💡 Consejos:</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Asegúrate que se vea el monto claramente</li>
                  <li>• Incluye fecha y hora de la transacción</li>
                  <li>• La imagen debe estar enfocada y sin cortes</li>
                  <li>• Formatos aceptados: JPG, PNG, HEIC</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep('payment')}
                  className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  ← Atrás
                </button>
                <button
                  onClick={() => setCurrentStep('details')}
                  disabled={!uploadedFile}
                  className={cn(
                    'flex-1 py-3 px-4 rounded-lg font-medium transition-colors',
                    uploadedFile
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  )}
                >
                  Continuar →
                </button>
              </div>
            </div>
          )}

          {/* Step 4: User Details */}
          {currentStep === 'details' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">
                  👤 Datos de Contacto
                </h3>
                <p className="text-gray-600">
                  Completa tus datos para finalizar la compra
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    value={userDetails.name}
                    onChange={(e) => setUserDetails(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Juan Pérez"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={userDetails.email}
                    onChange={(e) => setUserDetails(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="juan@ejemplo.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    WhatsApp *
                  </label>
                  <input
                    type="tel"
                    value={userDetails.whatsapp}
                    onChange={(e) => setUserDetails(prev => ({ ...prev, whatsapp: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="+523343461630"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ciudad *
                  </label>
                  <input
                    type="text"
                    value={userDetails.city}
                    onChange={(e) => setUserDetails(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ciudad de México"
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-bold text-blue-800 mb-2">📋 Resumen de tu Compra</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <p>• Boletos: {selectedTickets.length}</p>
                  <p>• Total: {formatPrice(totalPrice)}</p>
                  <p>• Método: {selectedPayment?.name}</p>
                  <p>• Comprobante: ✅ Cargado</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep('upload')}
                  className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  ← Atrás
                </button>
                <button
                  onClick={handleFinalSubmit}
                  disabled={!userDetails.name || !userDetails.email || !userDetails.whatsapp || !userDetails.city || loading}
                  className={cn(
                    'flex-1 py-3 px-4 rounded-lg font-medium transition-colors',
                    userDetails.name && userDetails.email && userDetails.whatsapp && userDetails.city && !loading
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  )}
                >
                  {loading ? 'Procesando...' : 'Finalizar Compra ✨'}
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Success */}
          {currentStep === 'success' && (
            <div className="text-center space-y-6">
              <div>
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-3xl font-bold text-green-600 mb-4">
                  ¡Compra Exitosa!
                </h3>
                <p className="text-lg text-gray-700 mb-6">
                  Tu pago está siendo verificado. Recibirás confirmación por WhatsApp en menos de 30 minutos.
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <h4 className="font-bold text-green-800 mb-4">📋 Detalles de tu Compra</h4>
                <div className="text-left text-green-700 space-y-2">
                  <p>• <strong>Boletos:</strong> {selectedTickets.length}</p>
                  <p>• <strong>Total:</strong> {formatPrice(totalPrice)}</p>
                  <p>• <strong>Método:</strong> {selectedPayment?.name}</p>
                  <p>• <strong>Estado:</strong> Verificando pago...</p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h4 className="font-bold text-blue-800 mb-2">📱 ¿Qué sigue?</h4>
                <div className="text-blue-700 text-sm space-y-2">
                  <p>1. Verificaremos tu pago en menos de 30 minutos</p>
                  <p>2. Te enviaremos confirmación por WhatsApp</p>
                  <p>3. Tus boletos quedarán reservados en tu nombre</p>
                  <p>4. El sorteo será el 31 de Diciembre 2024</p>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-green-700 transition-colors"
              >
                ¡Entendido! 🚀
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PurchaseModal;