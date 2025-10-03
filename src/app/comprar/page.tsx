// ============================================================================
// PÁGINA DE CHECKOUT PARA RIFA DE CAMIONETA
// ============================================================================

'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

// Importar desde archivos anteriores
import { useRaffleStore } from '../../stores/raffle-store';
import { PAYMENT_METHODS } from '../../lib/constants';
import type { PaymentMethodType } from '../../lib/types';
import { 
  validateEmail, 
  validateWhatsApp, 
  formatPrice, 
  generateId,
  formatTicketNumber,
  cn 
} from '../../lib/utils';

// ============================================================================
// TIPOS
// ============================================================================

type CheckoutStep = 'datos' | 'pago' | 'comprobante' | 'exito';

interface FormData {
  name: string;
  email: string;
  whatsapp: string;
  paymentMethod: PaymentMethodType;
}

interface FormErrors {
  name?: string;
  email?: string;
  whatsapp?: string;
  paymentMethod?: string;
}

// ============================================================================
// COMPONENTE BREADCRUMB
// ============================================================================

const Breadcrumb: React.FC<{ currentStep: CheckoutStep }> = ({ }) => {

  const breadcrumbItems = [
    { label: 'Inicio', href: '/', active: false },
    { label: 'Selección', href: '/', active: false },
    { label: 'Checkout', href: '/comprar', active: true }
  ];

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
      {breadcrumbItems.map((item, index) => (
        <React.Fragment key={item.label}>
          {index > 0 && (
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
          {item.active ? (
            <span className="font-medium text-blue-600">{item.label}</span>
          ) : (
            <Link href={item.href} className="hover:text-blue-600 transition-colors">
              {item.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

// ============================================================================
// COMPONENTE PROGRESS BAR
// ============================================================================

const ProgressBar: React.FC<{ currentStep: CheckoutStep }> = ({ currentStep }) => {
  const steps = [
    { key: 'datos', label: 'Datos', icon: '👤' },
    { key: 'pago', label: 'Pago', icon: '💳' },
    { key: 'comprobante', label: 'Comprobante', icon: '📸' },
    { key: 'exito', label: 'Éxito', icon: '🎉' }
  ];

  const currentIndex = steps.findIndex(step => step.key === currentStep);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.key} className="flex items-center">
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300',
                {
                  'bg-blue-600 text-white': index <= currentIndex,
                  'bg-gray-200 text-gray-500': index > currentIndex
                }
              )}
            >
              {step.icon}
            </div>
            <div className="ml-3 hidden sm:block">
              <div
                className={cn(
                  'text-sm font-medium',
                  {
                    'text-blue-600': index === currentIndex,
                    'text-gray-900': index < currentIndex,
                    'text-gray-500': index > currentIndex
                  }
                )}
              >
                {step.label}
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className="flex-1 mx-4">
                <div className="h-1 bg-gray-200 rounded-full">
                  <div
                    className={cn(
                      'h-1 rounded-full transition-all duration-500',
                      {
                        'bg-blue-600': index < currentIndex,
                        'bg-gray-200': index >= currentIndex
                      }
                    )}
                    style={{
                      width: index < currentIndex ? '100%' : '0%'
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENTE RESUMEN DE COMPRA
// ============================================================================

const PurchaseSummary: React.FC<{
  selectedTickets: number[];
  totalPrice: number;
}> = ({ selectedTickets, totalPrice }) => {
  const originalPrice = selectedTickets.length * 50;
  const discount = originalPrice - totalPrice;
  const discountPercentage = originalPrice > 0 ? Math.round((discount / originalPrice) * 100) : 0;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 sticky top-6">
      <h3 className="text-xl font-bold text-gray-800 mb-6">
        📋 Resumen de Compra
      </h3>

      {/* Lista de tickets seleccionados */}
      <div className="mb-6">
        <h4 className="font-semibold text-gray-700 mb-3">Boletos seleccionados:</h4>
        <div className="max-h-32 overflow-y-auto bg-gray-50 rounded-lg p-3">
          <div className="grid grid-cols-6 gap-2">
            {selectedTickets.slice(0, 24).map(ticket => (
              <div
                key={ticket}
                className="bg-purple-100 text-purple-800 text-xs font-bold py-1 px-2 rounded text-center"
              >
                {formatTicketNumber(ticket)}
              </div>
            ))}
          </div>
          {selectedTickets.length > 24 && (
            <div className="text-center text-gray-500 text-sm mt-2">
              + {selectedTickets.length - 24} boletos más
            </div>
          )}
        </div>
      </div>

      {/* Desglose de precios */}
      <div className="space-y-3 border-t pt-4">
        <div className="flex justify-between text-gray-600">
          <span>Cantidad de boletos:</span>
          <span className="font-medium">{selectedTickets.length}</span>
        </div>

        {discount > 0 && (
          <>
            <div className="flex justify-between text-gray-600">
              <span>Precio original:</span>
              <span className="line-through">{formatPrice(originalPrice)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Descuento ({discountPercentage}%):</span>
              <span className="font-medium">-{formatPrice(discount)}</span>
            </div>
          </>
        )}

        <div className="flex justify-between text-lg font-bold text-gray-800 border-t pt-3">
          <span>Total a pagar:</span>
          <span className="text-green-600">{formatPrice(totalPrice)}</span>
        </div>
      </div>

      {/* Información adicional */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h5 className="font-semibold text-blue-800 mb-2">ℹ️ Información importante:</h5>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Tus boletos se reservarán por 30 minutos</li>
          <li>• El pago debe ser por el monto exacto</li>
          <li>• Recibirás confirmación por WhatsApp</li>
          <li>• Sorteo: 31 Dic 2024, 8:00 PM</li>
        </ul>
      </div>
    </div>
  );
};

// ============================================================================
// STEP 1: FORMULARIO DE DATOS
// ============================================================================

const DatosStep: React.FC<{
  formData: FormData;
  errors: FormErrors;
  onFormChange: (data: Partial<FormData>) => void;
  onNext: () => void;
  loading: boolean;
}> = ({ formData, errors, onFormChange, onNext, loading }) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-6">
        👤 Información Personal
      </h3>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Nombre */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nombre completo *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => onFormChange({ name: e.target.value })}
            className={cn(
              'w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors',
              {
                'border-red-300 bg-red-50': errors.name,
                'border-gray-300': !errors.name
              }
            )}
            placeholder="Ej: Juan Pérez García"
            disabled={loading}
          />
          {errors.name && (
            <p className="text-red-600 text-sm mt-1">{errors.name}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Correo electrónico *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => onFormChange({ email: e.target.value })}
            className={cn(
              'w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors',
              {
                'border-red-300 bg-red-50': errors.email,
                'border-gray-300': !errors.email
              }
            )}
            placeholder="correo@ejemplo.com"
            disabled={loading}
          />
          {errors.email && (
            <p className="text-red-600 text-sm mt-1">{errors.email}</p>
          )}
        </div>

        {/* WhatsApp */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            WhatsApp *
          </label>
          <input
            type="tel"
            value={formData.whatsapp}
            onChange={(e) => onFormChange({ whatsapp: e.target.value })}
            className={cn(
              'w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors',
              {
                'border-red-300 bg-red-50': errors.whatsapp,
                'border-gray-300': !errors.whatsapp
              }
            )}
            placeholder="+523343461630"
            disabled={loading}
          />
          {errors.whatsapp && (
            <p className="text-red-600 text-sm mt-1">{errors.whatsapp}</p>
          )}
          <p className="text-sm text-gray-500 mt-1">
            Formato: +52 seguido de 10 dígitos
          </p>
        </div>

        {/* Métodos de Pago */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Método de pago *
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PAYMENT_METHODS.filter(method => method.enabled).map((method) => (
              <label
                key={method.id}
                className={cn(
                  'flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md',
                  {
                    'border-blue-500 bg-blue-50': formData.paymentMethod === method.id,
                    'border-gray-200 hover:border-gray-300': formData.paymentMethod !== method.id
                  }
                )}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method.id}
                  checked={formData.paymentMethod === method.id}
                  onChange={(e) => onFormChange({ paymentMethod: e.target.value as PaymentMethodType })}
                  className="sr-only"
                  disabled={loading}
                />
                <Image
                  src={method.icon}
                  alt={method.name}
                  width={32}
                  height={32}
                  className="mr-3"
                />
                <span className="font-medium text-gray-800">{method.name}</span>
              </label>
            ))}
          </div>
          {errors.paymentMethod && (
            <p className="text-red-600 text-sm mt-1">{errors.paymentMethod}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className={cn(
            'w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200',
            {
              'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg': !loading,
              'bg-gray-400 text-gray-600 cursor-not-allowed': loading
            }
          )}
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Procesando...
            </div>
          ) : (
            'Continuar al Pago →'
          )}
        </button>
      </form>
    </div>
  );
};

// ============================================================================
// STEP 2: INSTRUCCIONES DE PAGO
// ============================================================================

const PagoStep: React.FC<{
  paymentMethod: PaymentMethodType;
  totalPrice: number;
  onNext: () => void;
  onBack: () => void;
}> = ({ paymentMethod, totalPrice, onNext, onBack }) => {
  const method = PAYMENT_METHODS.find(m => m.id === paymentMethod);
  
  if (!method) return null;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-6">
        💳 Instrucciones de Pago
      </h3>

      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Image src={method.icon} alt={method.name} width={40} height={40} />
          <span className="text-lg font-semibold text-gray-700">{method.name}</span>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-3xl font-bold text-blue-800 mb-1">
            {formatPrice(totalPrice)}
          </div>
          <div className="text-sm text-blue-600">
            Monto exacto a pagar
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h4 className="font-bold text-gray-800">📋 Pasos a seguir:</h4>
        
        {method.id === 'binance' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <ol className="space-y-2 text-sm">
              <li><strong>1.</strong> Abre tu app de Binance</li>
              <li><strong>2.</strong> Ve a &quot;Pay&quot; → &quot;Enviar&quot;</li>
              <li><strong>3.</strong> Envía exactamente <strong>{formatPrice(totalPrice)}</strong> a:</li>
            </ol>
            <div className="bg-white border rounded-lg p-3 mt-3 font-mono text-sm break-all">
              {method.account}
            </div>
          </div>
        )}

        {(method.id === 'banamex' || method.id === 'bbva') && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <ol className="space-y-2 text-sm">
              <li><strong>1.</strong> Transfiere desde tu app bancaria</li>
              <li><strong>2.</strong> Monto exacto: <strong>{formatPrice(totalPrice)}</strong></li>
              <li><strong>3.</strong> Cuenta destino:</li>
            </ol>
            <div className="bg-white border rounded-lg p-3 mt-3 font-mono text-sm">
              {method.account}
            </div>
            <p className="text-sm mt-2"><strong>Concepto:</strong> &quot;Rifa Silverado&quot;</p>
          </div>
        )}

        {method.id === 'oxxo' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <ol className="space-y-2 text-sm">
              <li><strong>1.</strong> Ve a cualquier OXXO</li>
              <li><strong>2.</strong> Di &quot;Quiero hacer un depósito&quot;</li>
              <li><strong>3.</strong> Monto exacto: <strong>{formatPrice(totalPrice)}</strong></li>
              <li><strong>4.</strong> Referencia:</li>
            </ol>
            <div className="bg-white border rounded-lg p-3 mt-3 font-mono text-sm">
              {method.account}
            </div>
          </div>
        )}

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-sm text-purple-800">
            <strong>💡 Importante:</strong> Guarda tu comprobante de pago para subirlo en el siguiente paso.
            El monto debe ser exacto para agilizar la verificación.
          </p>
        </div>
      </div>

      <div className="flex gap-4 mt-8">
        <button
          onClick={onBack}
          className="flex-1 bg-gray-200 text-gray-800 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
        >
          ← Atrás
        </button>
        <button
          onClick={onNext}
          className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors"
        >
          Ya pagué →
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// STEP 3: UPLOAD COMPROBANTE
// ============================================================================

const ComprobanteStep: React.FC<{
  onNext: () => void;
  onBack: () => void;
  loading: boolean;
}> = ({ onNext, onBack, loading }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, []);

  const handleFileSelect = (file: File) => {
    if (file.type.startsWith('image/')) {
      setUploadedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleSubmit = () => {
    if (uploadedFile) {
      onNext();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-6">
        📸 Subir Comprobante de Pago
      </h3>

      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer',
          {
            'border-blue-400 bg-blue-50': isDragging,
            'border-gray-300 hover:border-gray-400': !isDragging && !uploadedFile,
            'border-green-400 bg-green-50': uploadedFile
          }
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={loading}
        />

        {!uploadedFile ? (
          <div>
            <div className="text-6xl mb-4">📱</div>
            <p className="text-lg font-medium text-gray-700 mb-2">
              Arrastra tu comprobante aquí
            </p>
            <p className="text-sm text-gray-500 mb-4">
              o haz click para seleccionar archivo
            </p>
            <div className="bg-blue-600 text-white px-6 py-2 rounded-lg inline-block">
              Seleccionar archivo
            </div>
          </div>
        ) : (
          <div>
            <div className="text-6xl mb-4">✅</div>
            <p className="text-lg font-medium text-green-700 mb-2">
              ¡Archivo cargado correctamente!
            </p>
            <p className="text-sm text-gray-600 mb-4">
              {uploadedFile.name}
            </p>
            {previewUrl && (
              <div className="max-w-sm mx-auto">
                <Image
                  src={previewUrl}
                  alt="Preview del comprobante"
                  width={300}
                  height={200}
                  className="rounded-lg shadow-md object-cover"
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
        <h4 className="font-bold text-yellow-800 mb-2">💡 Consejos para un comprobante perfecto:</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• Asegúrate que se vea claramente el monto pagado</li>
          <li>• Incluye fecha y hora de la transacción</li>
          <li>• La imagen debe estar enfocada y completa</li>
          <li>• Formatos aceptados: JPG, PNG, HEIC</li>
          <li>• Tamaño máximo: 5MB</li>
        </ul>
      </div>

      <div className="flex gap-4 mt-8">
        <button
          onClick={onBack}
          disabled={loading}
          className="flex-1 bg-gray-200 text-gray-800 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50"
        >
          ← Atrás
        </button>
        <button
          onClick={handleSubmit}
          disabled={!uploadedFile || loading}
          className={cn(
            'flex-1 py-3 px-6 rounded-lg font-semibold transition-colors',
            {
              'bg-purple-600 text-white hover:bg-purple-700': uploadedFile && !loading,
              'bg-gray-300 text-gray-500 cursor-not-allowed': !uploadedFile || loading
            }
          )}
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Procesando...
            </div>
          ) : (
            'Finalizar Compra →'
          )}
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// STEP 4: ÉXITO
// ============================================================================

const ExitoStep: React.FC<{
  customerData: FormData;
  selectedTickets: number[];
  totalPrice: number;
}> = ({ customerData, selectedTickets, totalPrice }) => {
  const router = useRouter();

  const handleContinue = () => {
    router.push('/');
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 text-center">
      <div className="text-8xl mb-6">🎉</div>
      
      <h3 className="text-3xl font-bold text-green-700 mb-4">
        ¡Compra Exitosa!
      </h3>
      
      <p className="text-lg text-gray-600 mb-8">
        Tu compra ha sido registrada y está siendo verificada
      </p>

      <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8 text-left">
        <h4 className="font-bold text-green-800 mb-4 text-center">📋 Resumen de tu compra:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Comprador:</strong><br />
            {customerData.name}
          </div>
          <div>
            <strong>Email:</strong><br />
            {customerData.email}
          </div>
          <div>
            <strong>WhatsApp:</strong><br />
            {customerData.whatsapp}
          </div>
          <div>
            <strong>Método de pago:</strong><br />
            {PAYMENT_METHODS.find(m => m.id === customerData.paymentMethod)?.name}
          </div>
          <div>
            <strong>Boletos:</strong><br />
            {selectedTickets.length} tickets
          </div>
          <div>
            <strong>Total pagado:</strong><br />
            <span className="text-green-700 font-bold">{formatPrice(totalPrice)}</span>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <h4 className="font-bold text-blue-800 mb-3">📱 Próximos pasos:</h4>
        <div className="text-sm text-blue-700 space-y-2 text-left">
          <p>✅ <strong>1. Verificación:</strong> Revisaremos tu pago en las próximas 24 horas</p>
          <p>✅ <strong>2. Confirmación:</strong> Te enviaremos confirmación por WhatsApp y email</p>
          <p>✅ <strong>3. Reserva:</strong> Tus boletos quedan reservados hasta la confirmación</p>
          <p>✅ <strong>4. Sorteo:</strong> 31 de Diciembre 2024 a las 8:00 PM</p>
        </div>
      </div>

      <div className="space-y-4">
        <button
          onClick={handleContinue}
          className="w-full bg-green-600 text-white py-4 px-6 rounded-lg font-bold text-lg hover:bg-green-700 transition-colors"
        >
          🏠 Volver al Inicio
        </button>
        
        <p className="text-sm text-gray-500">
          ¿Tienes dudas? Contáctanos por WhatsApp: +52-55-1234-5678
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function CheckoutPage() {
  const router = useRouter();
  
  // Estado del store
  const {
    selectedTickets,
    totalSelected,
    totalPrice,
    setCustomerData,
    reserveTickets
  } = useRaffleStore();

  // Estado local
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('datos');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    whatsapp: '',
    paymentMethod: 'banamex'
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // Redirect si no hay tickets seleccionados
  useEffect(() => {
    if (totalSelected === 0) {
      router.push('/');
    }
  }, [totalSelected, router]);

  // Validación del formulario
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'El nombre debe tener al menos 2 caracteres';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!formData.whatsapp.trim()) {
      newErrors.whatsapp = 'El WhatsApp es requerido';
    } else if (!validateWhatsApp(formData.whatsapp)) {
      newErrors.whatsapp = 'Formato de WhatsApp inválido (+52XXXXXXXXXX)';
    }

    if (!formData.paymentMethod) {
      newErrors.paymentMethod = 'Selecciona un método de pago';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handlers de navegación entre pasos
  const handleNextStep = useCallback(async () => {
    if (currentStep === 'datos') {
      if (!validateForm()) return;
      setLoading(true);
      
      // Simular validación del servidor
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setCurrentStep('pago');
      setLoading(false);
    } else if (currentStep === 'pago') {
      setCurrentStep('comprobante');
    } else if (currentStep === 'comprobante') {
      setLoading(true);
      
      // Simular upload y procesamiento
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Crear customer y reservar tickets
      const customerId = generateId();
      
      setCustomerData({
        id: customerId,
        name: formData.name,
        email: formData.email,
        whatsapp: formData.whatsapp,
        selectedTickets: selectedTickets.map(String),
        totalAmount: totalPrice,
        paymentMethod: formData.paymentMethod,
        status: 'pending',
        createdAt: new Date()
      });

      reserveTickets(selectedTickets, customerId);
      
      setCurrentStep('exito');
      setLoading(false);
    }
  }, [currentStep, formData, selectedTickets, totalPrice, setCustomerData, reserveTickets, validateForm]);

  const handlePrevStep = useCallback(() => {
    if (currentStep === 'pago') {
      setCurrentStep('datos');
    } else if (currentStep === 'comprobante') {
      setCurrentStep('pago');
    }
  }, [currentStep]);

  const handleFormChange = useCallback((data: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
    
    // Limpiar errores relacionados
    const newErrors = { ...errors };
    Object.keys(data).forEach(key => {
      delete newErrors[key as keyof FormErrors];
    });
    setErrors(newErrors);
  }, [errors]);

  // No renderizar si no hay tickets seleccionados
  if (totalSelected === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <Breadcrumb currentStep={currentStep} />

        {/* Progress Bar */}
        <ProgressBar currentStep={currentStep} />

        {/* Layout Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna Izquierda - Resumen (Desktop) / Abajo (Mobile) */}
          <div className="lg:order-1 order-2">
            <PurchaseSummary
              selectedTickets={selectedTickets}
              totalPrice={totalPrice}
            />
          </div>

          {/* Columna Derecha - Formulario */}
          <div className="lg:col-span-2 lg:order-2 order-1">
            {currentStep === 'datos' && (
              <DatosStep
                formData={formData}
                errors={errors}
                onFormChange={handleFormChange}
                onNext={handleNextStep}
                loading={loading}
              />
            )}

            {currentStep === 'pago' && (
              <PagoStep
                paymentMethod={formData.paymentMethod}
                totalPrice={totalPrice}
                onNext={handleNextStep}
                onBack={handlePrevStep}
              />
            )}

            {currentStep === 'comprobante' && (
              <ComprobanteStep
                onNext={handleNextStep}
                onBack={handlePrevStep}
                loading={loading}
              />
            )}

            {currentStep === 'exito' && (
              <ExitoStep
                customerData={formData}
                selectedTickets={selectedTickets}
                totalPrice={totalPrice}
              />
            )}
          </div>
        </div>

        {/* Información de Seguridad */}
        {currentStep !== 'exito' && (
          <div className="mt-12 max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h4 className="font-bold text-gray-800 mb-4 text-center">
                🔒 Tu información está segura
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-3xl mb-2">🛡️</div>
                  <h5 className="font-semibold text-gray-700 mb-1">Datos Protegidos</h5>
                  <p className="text-sm text-gray-600">Tu información personal está encriptada y protegida</p>
                </div>
                <div>
                  <div className="text-3xl mb-2">⚖️</div>
                  <h5 className="font-semibold text-gray-700 mb-1">100% Legal</h5>
                  <p className="text-sm text-gray-600">Rifa autorizada y regulada por las autoridades</p>
                </div>
                <div>
                  <div className="text-3xl mb-2">📞</div>
                  <h5 className="font-semibold text-gray-700 mb-1">Soporte 24/7</h5>
                  <p className="text-sm text-gray-600">Atención al cliente disponible en todo momento</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}