'use client';

import React, { useState, useEffect } from 'react';
import { obtenerCompras, actualizarEstadoCompra, type CompraConDetalles, type PurchaseStatus } from '../lib/supabase';
import { useAdminSync } from '../hooks/useAdminSync';
import { testMathConsistency, monitorSystemHealth } from '../hooks/useMasterCounters';
import toast from 'react-hot-toast';

// Importar test utilities para verificación matemática
import '../utils/testCounters';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Eye,
  ChevronDown,
  CheckSquare,
  Square,
  Zap,
  Users,
  Clock,
  DollarSign,
  Filter,
  Search,
  AlertTriangle,
  Shield,
  Calculator
} from 'lucide-react';
import AnalyticsDashboard from './AnalyticsDashboard';

// ============================================================================
// TIPOS LOCALES
// ============================================================================

// Los tipos ya están importados de supabase.ts

// ============================================================================
// COMPONENTE PRINCIPAL DEL PANEL DE ADMINISTRACIÓN
// ============================================================================

export default function AdminPanel() {
  const [compras, setCompras] = useState<CompraConDetalles[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<'todas' | PurchaseStatus>('todas');
  const [busqueda, setBusqueda] = useState('');
  const [selectedCompras, setSelectedCompras] = useState<Set<string>>(new Set());
  const [processingBatch, setProcessingBatch] = useState(false);
  const [processingIndividual, setProcessingIndividual] = useState<Set<string>>(new Set());
  const [expandedCompra, setExpandedCompra] = useState<string | null>(null);
  
  // Hook unificado para administración con sincronización avanzada
  const adminSync = useAdminSync();
  const { isConnected } = adminSync.sync;
  const { forceSync, onAdminConfirmation } = adminSync;

  // 🛡️ SISTEMA DE VALIDACIÓN MATEMÁTICA EN TIEMPO REAL
  const [mathValidation, setMathValidation] = useState({
    isValid: true,
    issues: [] as string[],
    lastCheck: new Date(),
    realSum: 10000,
    displaySum: 10000
  });

  // Cargar compras al montar el componente y cuando cambian los contadores
  useEffect(() => {
    cargarCompras();
  }, []);
  
  // Auto-refresh cuando los contadores reales cambian (indica nueva confirmación)
  useEffect(() => {
    const lastSoldCount = localStorage.getItem('admin-last-sold-count');
    const currentSoldCount = adminSync.real.soldCount;
    
    if (lastSoldCount && parseInt(lastSoldCount) !== currentSoldCount) {
      console.log('🔄 ADMIN: Detectado cambio en tickets vendidos, recargando compras...');
      cargarCompras();
    }
    
    localStorage.setItem('admin-last-sold-count', currentSoldCount.toString());
  }, [adminSync.real.soldCount]);

  const cargarCompras = async () => {
    console.log('📊 ADMIN: Cargando compras...');
    
    try {
      setLoading(true);
      
      // HYBRID APPROACH: Load from both sources
      let comprasSupabase: CompraConDetalles[] = [];
      let comprasLocales: CompraConDetalles[] = [];
      let supabaseError = null;
      
      // STEP 1: Try to load from Supabase
      if (isConnected) {
        try {
          console.log('🔄 ADMIN: Cargando desde Supabase...');
          comprasSupabase = await obtenerCompras() || [];
          console.log(`✅ ADMIN: ${comprasSupabase.length} compras desde Supabase`);
          
          // Sync ticket counters
          await forceSync();
        } catch (error) {
          console.error('❌ ADMIN: Error cargando desde Supabase:', error);
          supabaseError = error instanceof Error ? error.message : 'Error desconocido';
        }
      }
      
      // STEP 2: Always load localStorage as backup/complement
      try {
        console.log('📦 ADMIN: Cargando desde localStorage...');
        const datosLocalStorage = JSON.parse(localStorage.getItem('compras-registradas') || '[]');
        
        comprasLocales = datosLocalStorage.map((compra: any) => ({
          id: compra.id || `local-${Date.now()}`,
          customer_id: compra.customer_id || 'local',
          total_amount: compra.precio_total || 0,
          unit_price: compra.precio_unitario || 250,
          discount_applied: compra.descuento_aplicado || 0,
          payment_method: compra.metodo_pago || 'Desconocido',
          payment_reference: compra.referencia_pago || `RF-${Date.now()}`,
          payment_proof_url: compra.captura_comprobante_url || null,
          status: (compra.estado_compra || 'pendiente') as PurchaseStatus,
          created_at: compra.fecha_compra || new Date().toISOString(),
          notes: compra.source === 'local-backup' ? 'Guardado localmente (sin conexión)' : undefined,
          customer: {
            id: compra.customer_id || 'local',
            name: `${compra.nombre || ''} ${compra.apellidos || ''}`.trim() || 'Cliente Local',
            email: compra.email || '',
            phone: compra.telefono || '',
            city: compra.ciudad || '',
            state: compra.estado || ''
          },
          tickets: (compra.numeros_boletos || []).map((num: number) => ({
            id: `ticket-${num}`,
            number: num,
            status: 'reservado' as const, // Local orders start as reserved until confirmed
            customer_id: compra.customer_id || 'local',
            purchase_id: compra.id
          }))
        })) as CompraConDetalles[];
        
        console.log(`📦 ADMIN: ${comprasLocales.length} compras desde localStorage`);
      } catch (localError) {
        console.error('❌ ADMIN: Error cargando localStorage:', localError);
      }
      
      // STEP 3: Combine and deduplicate orders
      const todasLasCompras: CompraConDetalles[] = [];
      const idsVistos = new Set<string>();
      
      // Add Supabase orders first (they have priority)
      comprasSupabase.forEach(compra => {
        if (compra.id && !idsVistos.has(compra.id)) {
          todasLasCompras.push(compra);
          if (compra.id) idsVistos.add(compra.id);
        }
      });
      
      // Add local orders that aren't in Supabase
      comprasLocales.forEach(compra => {
        if (compra.id && !idsVistos.has(compra.id)) {
          // Mark as local-only
          todasLasCompras.push({
            ...compra,
            notes: (compra.notes || '') + ' [LOCAL ONLY]'
          });
          if (compra.id) idsVistos.add(compra.id);
        }
      });
      
      // Sort by creation date (newest first)
      todasLasCompras.sort((a, b) => 
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
      
      setCompras(todasLasCompras);
      
      // STEP 4: Show appropriate status message
      const supabaseCount = comprasSupabase.length;
      const localCount = comprasLocales.length;
      const totalCount = todasLasCompras.length;
      const visualPercentage = (totalCount / 10000) * 100; // Calculate visual percentage
      
      if (isConnected && !supabaseError) {
        toast.success(`✅ ${totalCount} órdenes cargadas (${supabaseCount} BD + ${localCount} locales) • ${visualPercentage.toFixed(1)}% mostrado`);
      } else if (supabaseError) {
        toast.error(`⚠️ BD no disponible: ${localCount} órdenes locales cargadas • Error: ${supabaseError}`, { duration: 6000 });
      } else {
        toast(`📦 ${localCount} órdenes desde localStorage (BD offline)`, { 
          icon: '⚠️',
          style: { background: '#fbbf24', color: '#92400e' }
        });
      }
      
      console.log(`📊 ADMIN: Total cargadas: ${totalCount} (${supabaseCount} BD + ${localCount} local)`);
      
      // ✅ TRIGGER STATS RECALCULATION after data load
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('admin-stats-update', {
            detail: { 
              source: 'data-reload',
              totalCount,
              supabaseCount,
              localCount,
              timestamp: new Date().toISOString()
            }
          }));
        }
      }, 200); // Give time for state to update
      
    } catch (error) {
      console.error('❌ ADMIN: Error crítico cargando compras:', error);
      toast.error(`Error crítico al cargar compras: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      setCompras([]);
    } finally {
      setLoading(false);
    }
  };

  const cambiarEstado = async (id: string, nuevoEstado: PurchaseStatus) => {
    // PREVENIR DOBLE CLIC: Verificar si ya está procesándose
    if (processingIndividual.has(id)) {
      console.log(`⚠️ ADMIN: Compra ${id} ya está siendo procesada, ignorando...`);
      return;
    }
    
    console.log(`🎯 ADMIN TICKET ACCEPTANCE STARTED:`, {
      purchaseId: id,
      newStatus: nuevoEstado,
      currentCounters: {
        real: adminSync.real.soldCount,
        display: adminSync.display.soldCount
      },
      timestamp: new Date().toLocaleTimeString()
    });
    
    // Marcar como procesándose
    setProcessingIndividual(prev => new Set([...prev, id]));
    
    try {
      if (isConnected) {
        console.log(`🔄 ADMIN: Actualizando compra ${id} a estado ${nuevoEstado}...`);
        
        // PREVENIR DOBLE CONFIRMACIÓN: Actualizar estado local INMEDIATAMENTE
        setCompras(prev => prev.map(compra => 
          (compra.id && compra.id === id) ? { ...compra, status: nuevoEstado } : compra
        ));

        // Actualizar en Supabase
        await actualizarEstadoCompra(id, nuevoEstado);
        toast.success(`Estado actualizado a: ${nuevoEstado}`);
        
        // Si se confirma una compra, usar sincronización avanzada
        if (nuevoEstado === 'confirmada') {
          console.log(`🎯 ADMIN: Compra confirmada - ejecutando sincronización avanzada...`);
          
          // Usar el nuevo sistema de sincronización admin
          await onAdminConfirmation();
          
          // Verificar que la sincronización fue exitosa
          console.log(`📊 ADMIN: Verificación post-confirmación:`);
          console.log(`   Real vendidos: ${adminSync.real.soldCount}`);
          console.log(`   Display: ${adminSync.display.soldCount} (${adminSync.display.soldPercentage.toFixed(1)}%)`);
          console.log(`   FOMO: ${adminSync.fomo.fomoAmount} tickets (diferencia: ${adminSync.fomo.difference})`);
          
          toast.success(`🎯 Confirmación procesada: ${adminSync.real.soldCount} reales + ${adminSync.fomo.fomoAmount} FOMO = ${adminSync.display.soldCount} mostrados`, {
            duration: 5000
          });
          
          // PASO 5: ENHANCED - Force immediate Zustand + Master Counter sync
          if (typeof window !== 'undefined') {
            console.log(`🔔 ADMIN: ENHANCED sync - Forcing immediate updates...`);
            
            // Force Master Counter update
            window.dispatchEvent(new CustomEvent('raffle-counters-updated', {
              detail: { 
                source: 'admin-confirmation',
                soldCount: adminSync.real.soldCount,
                timestamp: new Date().toISOString()
              }
            }));
            
            // CRITICAL: Force Zustand update directly if available
            const raffleStore = (window as any).__ZUSTAND_RAFFLE_STORE__;
            if (raffleStore && raffleStore.getState) {
              console.log(`🔄 ADMIN: Force updating Zustand store directly...`);
              
              // Trigger a refresh of the Zustand store data
              setTimeout(async () => {
                try {
                  const { data: ticketsData } = await (await import('../lib/supabase')).supabase
                    .from('tickets')
                    .select('number, status')
                    .in('status', ['vendido', 'reservado']);
                  
                  if (ticketsData) {
                    const soldNumbers = ticketsData.filter((t: any) => t.status === 'vendido').map((t: any) => t.number);
                    const reservedNumbers = ticketsData.filter((t: any) => t.status === 'reservado').map((t: any) => t.number);
                    
                    const state = raffleStore.getState();
                    state.setSoldTicketsFromDB(soldNumbers);
                    state.setReservedTicketsFromDB(reservedNumbers);
                    
                    console.log(`✅ ADMIN: Force Zustand sync completed - ${soldNumbers.length} sold, ${reservedNumbers.length} reserved`);
                  }
                } catch (err) {
                  console.error('❌ ADMIN: Failed to force update Zustand:', err);
                }
              }, 500); // Half second delay for DB propagation
            }
          }
        }
        
        // ✅ CRITICAL: Force immediate master counter update
        console.log(`🔄 ADMIN: Forzando actualización INMEDIATA del master counter...`);
        await forceSync();
        
        // Double refresh to ensure sync propagation
        setTimeout(async () => {
          console.log(`🔄 ADMIN: Segunda actualización para garantizar sincronización...`);
          await forceSync();
        }, 1000);
        
        // ✅ CRITICAL: Force admin stats update after confirmation
        console.log(`📊 ADMIN: Forcing stats recalculation...`);
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('admin-stats-update', {
              detail: { 
                source: 'admin-confirmation',
                purchaseId: id,
                newStatus: nuevoEstado,
                timestamp: new Date().toISOString()
              }
            }));
          }
        }, 500); // Give time for DB changes to propagate
        
        // ✅ FINAL VERIFICATION LOG
        setTimeout(() => {
          console.log(`🎯 ADMIN TICKET ACCEPTANCE COMPLETED:`, {
            purchaseId: id,
            newStatus: nuevoEstado,
            finalCounters: {
              real: adminSync.real.soldCount,
              display: adminSync.display.soldCount
            },
            timestamp: new Date().toLocaleTimeString()
          });
        }, 2000);
      } else {
        // Fallback a localStorage
        const comprasActuales = JSON.parse(localStorage.getItem('compras-registradas') || '[]');
        const comprasActualizadas = comprasActuales.map((compra: any) => 
          compra.id === id ? { ...compra, estado_compra: nuevoEstado } : compra
        );
        
        localStorage.setItem('compras-registradas', JSON.stringify(comprasActualizadas));
        toast(`Estado actualizado localmente a: ${nuevoEstado} (Supabase no disponible)`, {
          icon: '⚠️',
          style: { background: '#fbbf24', color: '#92400e' }
        });
      }
      
      cargarCompras(); // Recargar datos
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      toast.error('Error al actualizar el estado');
      
      // Revertir cambio local si falla la BD
      setCompras(prev => prev.map(compra => 
        (compra.id && compra.id === id) ? { ...compra, status: 'pendiente' } : compra
      ));
    } finally {
      // Limpiar estado de procesamiento
      setProcessingIndividual(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const agregarDatosPrueba = () => {
    const datosPrueba = [
      {
        id: '1',
        nombre: 'Juan Carlos',
        apellidos: 'Pérez García',
        telefono: '+523343461630',
        email: 'juan.perez@email.com',
        estado: 'CDMX',
        ciudad: 'Ciudad de México',
        info_adicional: 'Compra desde la página principal',
        cantidad_boletos: 5,
        numeros_boletos: [1234, 2567, 3890, 4123, 5678],
        numeros_boletos_formateados: '1234, 2567, 3890, 4123, 5678',
        precio_unitario: 200,
        precio_total: 900,
        descuento_aplicado: 10,
        metodo_pago: 'Binance Pay',
        archivo_subido: true,
        nombre_archivo: 'comprobante_juan.jpg',
        fecha_compra: new Date(Date.now() - 86400000).toISOString(), // Ayer
        estado_compra: 'confirmada' as const,
        timestamp: Date.now() - 86400000
      },
      {
        id: '2',
        nombre: 'María Fernanda',
        apellidos: 'López Rodríguez',
        telefono: '+52 33 9876 5432',
        email: 'maria.lopez@email.com',
        estado: 'Jalisco',
        ciudad: 'Guadalajara',
        info_adicional: '',
        cantidad_boletos: 10,
        numeros_boletos: [123, 456, 789, 1012, 1345, 1678, 1901, 2234, 2567, 2890],
        numeros_boletos_formateados: '0123, 0456, 0789, 1012, 1345, 1678, 1901, 2234, 2567, 2890',
        precio_unitario: 200,
        precio_total: 1600,
        descuento_aplicado: 20,
        metodo_pago: 'OXXO',
        archivo_subido: false,
        nombre_archivo: '',
        fecha_compra: new Date(Date.now() - 43200000).toISOString(), // Hace 12 horas
        estado_compra: 'pendiente' as const,
        timestamp: Date.now() - 43200000
      },
      {
        id: '3',
        nombre: 'Carlos Eduardo',
        apellidos: 'Martínez Sánchez',
        telefono: '+52 81 5555 1234',
        email: 'carlos.martinez@email.com',
        estado: 'Nuevo León',
        ciudad: 'Monterrey',
        info_adicional: 'Cliente frecuente',
        cantidad_boletos: 25,
        numeros_boletos: [3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010, 3011, 3012, 3013, 3014, 3015, 3016, 3017, 3018, 3019, 3020, 3021, 3022, 3023, 3024, 3025],
        numeros_boletos_formateados: '3001-3025 (25 boletos consecutivos)',
        precio_unitario: 200,
        precio_total: 3750,
        descuento_aplicado: 25,
        metodo_pago: 'Banco Azteca',
        archivo_subido: true,
        nombre_archivo: 'transferencia_carlos.png',
        fecha_compra: new Date().toISOString(),
        estado_compra: 'pendiente' as const,
        timestamp: Date.now()
      }
    ];

    localStorage.setItem('compras-registradas', JSON.stringify(datosPrueba));
    toast.success('Datos de prueba agregados exitosamente');
    cargarCompras();
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ============================================================================
  // FUNCIONES DE BATCH PARA ACCIONES MASIVAS
  // ============================================================================

  const toggleCompraSelection = (compraId: string) => {
    setSelectedCompras(prev => {
      const newSet = new Set(prev);
      if (newSet.has(compraId)) {
        newSet.delete(compraId);
      } else {
        newSet.add(compraId);
      }
      return newSet;
    });
  };

  const selectAllPendientes = () => {
    const pendientes = comprasFiltradas
      .filter(compra => compra.status === 'pendiente')
      .map(compra => compra.id!)
      .filter(id => id);
    
    setSelectedCompras(new Set(pendientes));
    toast.success(`${pendientes.length} compras pendientes seleccionadas`);
  };

  const clearSelection = () => {
    setSelectedCompras(new Set());
  };

  const processBatchApproval = async () => {
    if (selectedCompras.size === 0) {
      toast.error('Selecciona al menos una compra');
      return;
    }

    setProcessingBatch(true);
    const successCount = { value: 0 };
    const errorCount = { value: 0 };
    
    try {
      const selectedIds = Array.from(selectedCompras);
      
      // PREVENIR DOBLE CONFIRMACIÓN: Actualizar estado local INMEDIATAMENTE
      setCompras(prev => prev.map(compra => 
        (compra.id && selectedIds.includes(compra.id)) ? { ...compra, status: 'confirmada' } : compra
      ));
      
      toast.loading(`Procesando ${selectedIds.length} compras...`, { id: 'batch-processing' });

      // Procesar en paralelo para mayor velocidad
      await Promise.allSettled(
        selectedIds.map(async (compraId) => {
          try {
            await cambiarEstado(compraId, 'confirmada');
            successCount.value++;
          } catch (error) {
            console.error(`Error procesando compra ${compraId}:`, error);
            errorCount.value++;
          }
        })
      );

      // Limpiar selección y actualizar
      setSelectedCompras(new Set());
      await cargarCompras();

      toast.dismiss('batch-processing');
      
      if (errorCount.value === 0) {
        toast.success(`🎉 ${successCount.value} compras confirmadas exitosamente`);
      } else {
        toast.success(`✅ ${successCount.value} confirmadas, ❌ ${errorCount.value} errores`);
      }

    } catch (error) {
      console.error('Error en batch approval:', error);
      toast.dismiss('batch-processing');
      toast.error('Error procesando compras en lote');
    } finally {
      setProcessingBatch(false);
    }
  };

  const processBatchReject = async () => {
    if (selectedCompras.size === 0) {
      toast.error('Selecciona al menos una compra');
      return;
    }

    setProcessingBatch(true);
    const successCount = { value: 0 };
    
    try {
      const selectedIds = Array.from(selectedCompras);
      toast.loading(`Cancelando ${selectedIds.length} compras...`, { id: 'batch-reject' });

      await Promise.allSettled(
        selectedIds.map(async (compraId) => {
          try {
            await cambiarEstado(compraId, 'cancelada');
            successCount.value++;
          } catch (error) {
            console.error(`Error cancelando compra ${compraId}:`, error);
          }
        })
      );

      setSelectedCompras(new Set());
      await cargarCompras();
      
      toast.dismiss('batch-reject');
      toast.success(`${successCount.value} compras canceladas`);

    } catch (error) {
      console.error('Error en batch reject:', error);
      toast.dismiss('batch-reject');
      toast.error('Error cancelando compras');
    } finally {
      setProcessingBatch(false);
    }
  };

  const formatearPrecio = (precio: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(precio);
  };

  // Filtrar compras
  const comprasFiltradas = compras.filter(compra => {
    const coincideFiltro = filtro === 'todas' || compra.status === filtro;
    const coincideBusqueda = busqueda === '' || 
      compra.customer.name.toLowerCase().includes(busqueda.toLowerCase()) ||
      compra.customer.email.toLowerCase().includes(busqueda.toLowerCase()) ||
      compra.customer.phone.includes(busqueda);
    
    return coincideFiltro && coincideBusqueda;
  });

  // ✅ HYBRID STATS - Purchase data from compras + Ticket counts from master counter
  const [stats, setStats] = useState({
    total: 0,
    pendientes: 0,
    confirmadas: 0,
    canceladas: 0,
    ingresosTotales: 0,
    boletosVendidos: 0
  });

  // ✅ CRITICAL FIX APPLIED: Admin counter now uses DISPLAY logic (FOMO + real) 
  // This ensures when admin accepts tickets, the counter increases visibly
  // matching what users see on the main page (1422 -> 1472 for 50 tickets)
  useEffect(() => {
    const calculateStats = () => {
      // Purchase stats from compras (these update when admin refreshes data)
      const purchaseStats = {
        total: compras.length,
        pendientes: compras.filter(c => c.status === 'pendiente').length,
        confirmadas: compras.filter(c => c.status === 'confirmada').length,
        canceladas: compras.filter(c => c.status === 'cancelada').length,
        ingresosTotales: compras.reduce((sum, c) => sum + c.total_amount, 0)
      };
      
      // ✅ CRITICAL FIX: Use DISPLAY COUNTER (FOMO + real) to match main page logic
      const realCounterTickets = adminSync.real.soldCount || 0;
      const displayTickets = adminSync.display.soldCount || 0;
      
      const newStats = {
        ...purchaseStats,
        boletosVendidos: displayTickets // ✅ FIXED: Use display counter (FOMO + real) to match main page
      };
      
      console.log('📊 ADMIN STATS UPDATED (FIXED - USING DISPLAY COUNTER):', {
        total: newStats.total,
        confirmadas: newStats.confirmadas,
        boletosVendidos: newStats.boletosVendidos,
        realTickets: realCounterTickets,
        displayTickets: displayTickets,
        fomoEffect: displayTickets - realCounterTickets,
        source: 'purchases + display_counter (FOMO + real)',
        timestamp: new Date().toLocaleTimeString()
      });
      
      setStats(newStats);
    };

    // Initial calculation
    calculateStats();
    
    // Listen for global sync events to recalculate
    const handleSyncEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('🔔 ADMIN: Sync event received, recalculating hybrid stats...', customEvent.detail);
      setTimeout(calculateStats, 100); // Small delay to ensure data is updated
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('raffle-counters-updated', handleSyncEvent);
      window.addEventListener('purchase-status-changed', handleSyncEvent);
      window.addEventListener('admin-stats-update', handleSyncEvent);
      
      return () => {
        window.removeEventListener('raffle-counters-updated', handleSyncEvent);
        window.removeEventListener('purchase-status-changed', handleSyncEvent);
        window.removeEventListener('admin-stats-update', handleSyncEvent);
      };
    }
  }, [compras, adminSync.display.soldCount]); // ✅ FIXED: Depend on display counter (FOMO + real)

  // 🛡️ VALIDACIÓN MATEMÁTICA EN TIEMPO REAL
  useEffect(() => {
    const validateSystemMath = () => {
      console.log('🛡️ ADMIN: Ejecutando validación matemática en tiempo real...');
      
      try {
        // Ejecutar test de consistencia matemática
        const mathTest = testMathConsistency();
        
        // Monitorear salud del sistema
        const systemHealth = monitorSystemHealth();
        
        // Calcular sumas para validación
        const realSum = adminSync.real.soldCount + adminSync.real.availableCount + adminSync.real.reservedCount;
        const displaySum = adminSync.display.soldCount + adminSync.display.availableCount + adminSync.real.reservedCount;
        
        // Detectar problemas
        const issues: string[] = [];
        
        if (!mathTest) {
          issues.push('Inconsistencia matemática detectada en contadores maestros');
        }
        
        if (realSum !== 10000) {
          issues.push(`Math real incorrecta: ${realSum} ≠ 10,000`);
        }
        
        if (displaySum !== 10000) {
          issues.push(`Math display incorrecta: ${displaySum} ≠ 10,000`);
        }
        
        if (!systemHealth.healthy) {
          issues.push(...systemHealth.issues);
        }
        
        // Actualizar estado de validación
        setMathValidation({
          isValid: issues.length === 0,
          issues,
          lastCheck: new Date(),
          realSum,
          displaySum
        });
        
        // Mostrar alertas críticas
        if (issues.length > 0) {
          console.error('🚨 ADMIN: Problemas matemáticos detectados:', issues);
          toast.error(`🚨 Integridad matemática comprometida: ${issues.length} problema(s)`, {
            duration: 8000,
            position: 'top-center'
          });
        } else {
          console.log('✅ ADMIN: Validación matemática exitosa - sistema íntegro');
        }
        
      } catch (error) {
        console.error('❌ ADMIN: Error en validación matemática:', error);
        setMathValidation(prev => ({
          ...prev,
          isValid: false,
          issues: ['Error ejecutando validación matemática'],
          lastCheck: new Date()
        }));
      }
    };

    // Validación inicial
    validateSystemMath();
    
    // Validación periódica cada 15 segundos
    const validationInterval = setInterval(validateSystemMath, 15000);
    
    // Validar cuando cambien los contadores críticos
    const handleCounterChange = () => {
      console.log('🔄 ADMIN: Cambio en contadores detectado, revalidando...');
      setTimeout(validateSystemMath, 500);
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('raffle-counters-updated', handleCounterChange);
      window.addEventListener('admin-stats-update', handleCounterChange);
      
      return () => {
        clearInterval(validationInterval);
        window.removeEventListener('raffle-counters-updated', handleCounterChange);
        window.removeEventListener('admin-stats-update', handleCounterChange);
      };
    }
    
    return () => {
      clearInterval(validationInterval);
    };
  }, [adminSync.real.soldCount, adminSync.real.availableCount, adminSync.real.reservedCount, adminSync.display.soldCount]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando panel de administración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header con estado mejorado */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200/60"
        >
          <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-800 via-purple-700 to-blue-900 bg-clip-text text-transparent">
                ⚡ Panel Admin Ultra - Rifa Silverado Z71
              </h1>
              <p className="text-slate-600 text-lg">Gestión masiva de compras en tiempo real</p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                isConnected 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                  : 'bg-orange-100 text-orange-800 border border-orange-200'
              }`}>
                {isConnected ? '🟢 Supabase Conectado' : '🟡 Modo Offline'}
              </div>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={cargarCompras}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-blue-500/25"
              >
                <RefreshCw size={16} />
                Actualizar
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* 📊 ESTADÍSTICAS DE VENTAS REALES - Nueva sección para transparencia admin */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.03 }}
          className="bg-gradient-to-br from-emerald-800 via-emerald-900 to-teal-800 rounded-2xl p-6 text-white shadow-2xl border border-emerald-700"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-emerald-500 rounded-xl">
              <DollarSign className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">📊 ESTADÍSTICAS DE VENTAS REALES</h2>
              <p className="text-emerald-200 text-sm">Panel de transparencia completa para administrador</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 🎯 Tickets Reales (Base de Datos) */}
            <div className="bg-emerald-700/40 rounded-xl p-5 border border-emerald-600/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-500 rounded-lg">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-green-300">🎯 Tickets Reales (Base de Datos)</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-emerald-200">Vendidos confirmados:</span>
                  <span className="text-2xl font-bold text-white">{adminSync.real.soldCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-emerald-200">Reservados temporales:</span>
                  <span className="text-xl font-bold text-yellow-300">{adminSync.real.reservedCount.toLocaleString()}</span>
                </div>
                <div className="border-t border-emerald-600 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-200 font-medium">Total real ocupados:</span>
                    <span className="text-2xl font-bold text-green-300">
                      {(adminSync.real.soldCount + adminSync.real.reservedCount).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="mt-3 p-2 bg-emerald-800/50 rounded-lg">
                  <div className="text-xs text-emerald-300 mb-1">Porcentaje real vendido:</div>
                  <div className="text-lg font-bold text-white">{adminSync.real.soldPercentage.toFixed(2)}%</div>
                </div>
              </div>
            </div>

            {/* 🎭 Display para Usuarios */}
            <div className="bg-blue-700/40 rounded-xl p-5 border border-blue-600/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <Eye className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-blue-300">🎭 Display para Usuarios</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-blue-200">FOMO añadido:</span>
                  <span className="text-xl font-bold text-orange-300">+{adminSync.fomo.fomoAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-blue-200">Total mostrado:</span>
                  <span className="text-2xl font-bold text-white">
                    {adminSync.display.soldCount.toLocaleString()} ({adminSync.display.soldPercentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-blue-200">Urgencia generada:</span>
                  <span className={`text-lg font-bold ${adminSync.fomo.isActive ? 'text-green-400' : 'text-red-400'}`}>
                    {adminSync.fomo.isActive ? '✅ Activa' : '❌ Desactivada'}
                  </span>
                </div>
                <div className="mt-3 p-2 bg-blue-800/50 rounded-lg">
                  <div className="text-xs text-blue-300 mb-1">Fórmula display:</div>
                  <div className="text-sm font-mono text-white">
                    {adminSync.real.soldCount} + {adminSync.fomo.fomoAmount} = {adminSync.display.soldCount}
                  </div>
                </div>
              </div>
            </div>

            {/* 💰 Ingresos y Meta */}
            <div className="bg-purple-700/40 rounded-xl p-5 border border-purple-600/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-500 rounded-lg">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-purple-300">💰 Ingresos Reales</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-purple-200">Tickets vendidos:</span>
                  <span className="text-lg font-bold text-white">
                    {adminSync.real.soldCount} × $250
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-purple-200">Total confirmado:</span>
                  <span className="text-2xl font-bold text-green-300">
                    ${(adminSync.real.soldCount * 250).toLocaleString()} MXN
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-purple-200">Tickets reservados:</span>
                  <span className="text-sm text-yellow-300">
                    ${(adminSync.real.reservedCount * 250).toLocaleString()} MXN (pendientes)
                  </span>
                </div>
                <div className="border-t border-purple-600 pt-2">
                  <div className="text-xs text-purple-300 mb-1">Meta 70% (7,000 tickets):</div>
                  <div className="flex justify-between items-center">
                    <span className="text-purple-200">Progreso real:</span>
                    <span className="text-lg font-bold text-white">
                      {((adminSync.real.soldCount / 7000) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-2 w-full bg-purple-800/50 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-purple-400 to-pink-400 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((adminSync.real.soldCount / 7000) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-purple-300 mt-1">
                    Necesitas {Math.max(7000 - adminSync.real.soldCount, 0).toLocaleString()} tickets más para alcanzar la meta
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 📈 Resumen Ejecutivo */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-emerald-800/30 rounded-xl p-4 border border-emerald-600/30">
              <h4 className="font-bold text-emerald-300 mb-3 flex items-center gap-2">
                📈 Progreso Real vs Display
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-emerald-200">Vendidos reales:</span>
                  <span className="font-bold text-white">{adminSync.real.soldPercentage.toFixed(2)}% de 10,000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-200">Mostrado a usuarios:</span>
                  <span className="font-bold text-blue-300">{adminSync.display.soldPercentage.toFixed(2)}% de 10,000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-200">Diferencia FOMO:</span>
                  <span className="font-bold text-orange-300">+{adminSync.fomo.difference.toLocaleString()} tickets</span>
                </div>
              </div>
            </div>

            <div className="bg-purple-800/30 rounded-xl p-4 border border-purple-600/30">
              <h4 className="font-bold text-purple-300 mb-3 flex items-center gap-2">
                🧮 Verificación Matemática
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-purple-200">Real disponibles:</span>
                  <span className="font-bold text-white">{adminSync.real.availableCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-200">Display disponibles:</span>
                  <span className="font-bold text-blue-300">{adminSync.display.availableCount.toLocaleString()}</span>
                </div>
                <div className="mt-2 p-2 bg-purple-900/50 rounded text-xs">
                  <div className="text-purple-300">💡 Los usuarios ven {adminSync.display.soldCount.toLocaleString()} vendidos (motivante)</div>
                  <div className="text-purple-300">Pero pueden comprar de {adminSync.real.availableCount.toLocaleString()} realmente disponibles</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 🛡️ GUARDIAN DE INTEGRIDAD MATEMÁTICA - Validación en tiempo real */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
          className={`rounded-2xl p-4 text-white shadow-xl border-2 transition-all duration-500 ${
            mathValidation.isValid 
              ? 'bg-gradient-to-r from-green-800 via-emerald-900 to-green-800 border-green-600' 
              : 'bg-gradient-to-r from-red-800 via-red-900 to-red-800 border-red-600 animate-pulse'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${mathValidation.isValid ? 'bg-green-500' : 'bg-red-500'}`}>
                {mathValidation.isValid ? (
                  <Shield className="w-6 h-6 text-white" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-white animate-bounce" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  🛡️ Guardian de Integridad Matemática
                  {mathValidation.isValid ? (
                    <span className="text-green-300">✅ SISTEMA ÍNTEGRO</span>
                  ) : (
                    <span className="text-red-300 animate-pulse">🚨 PROBLEMAS DETECTADOS</span>
                  )}
                </h2>
                <p className="text-sm opacity-90">
                  Última validación: {mathValidation.lastCheck.toLocaleTimeString()} • 
                  Validación automática cada 15 segundos
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm opacity-80">Sumas matemáticas:</div>
                <div className="flex gap-4 text-sm font-mono">
                  <span className={mathValidation.realSum === 10000 ? 'text-green-300' : 'text-red-300'}>
                    Real: {mathValidation.realSum.toLocaleString()}
                  </span>
                  <span className={mathValidation.displaySum === 10000 ? 'text-green-300' : 'text-red-300'}>
                    Display: {mathValidation.displaySum.toLocaleString()}
                  </span>
                </div>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  console.log('🛡️ ADMIN: Forzando validación matemática manual...');
                  const mathTest = testMathConsistency();
                  const systemHealth = monitorSystemHealth();
                  
                  if (mathTest && systemHealth.healthy) {
                    toast.success('✅ Validación matemática exitosa - Sistema íntegro', {
                      duration: 3000,
                      position: 'top-center'
                    });
                  } else {
                    toast.error(`🚨 Problemas detectados: ${systemHealth.issues.join(', ')}`, {
                      duration: 6000,
                      position: 'top-center'
                    });
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl font-medium transition-all duration-200"
              >
                <Calculator size={16} />
                Validar Ahora
              </motion.button>
            </div>
          </div>
          
          {/* Mostrar problemas si los hay */}
          {!mathValidation.isValid && mathValidation.issues.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4 p-3 bg-red-900/50 rounded-xl border border-red-600/50"
            >
              <h4 className="font-bold text-red-300 mb-2 flex items-center gap-2">
                🚨 Problemas Detectados:
              </h4>
              <ul className="space-y-1 text-sm text-red-200">
                {mathValidation.issues.map((issue, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">•</span>
                    {issue}
                  </li>
                ))}
              </ul>
              <div className="mt-3 p-2 bg-red-800/50 rounded text-xs text-red-300">
                💡 Los problemas matemáticos pueden afectar la precisión del sistema. 
                Contacta al desarrollador si persisten.
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Dashboard FOMO + Real - Sistema Técnico */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-2xl border border-slate-700"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-orange-500 rounded-xl">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">🎯 Sistema de Contadores Integrado (Técnico)</h2>
              <p className="text-slate-300 text-sm">Vista técnica: Real + FOMO = Display</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Real Numbers */}
            <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <h3 className="font-semibold text-green-400">Real (Base de Datos)</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-300">Tickets Vendidos:</span>
                  <span className="text-white font-bold">{adminSync.real.soldCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Porcentaje Real:</span>
                  <span className="text-white font-bold">{adminSync.real.soldPercentage.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Disponibles Reales:</span>
                  <span className="text-white font-bold">{adminSync.real.availableCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Reservados:</span>
                  <span className="text-white font-bold">{adminSync.real.reservedCount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* FOMO Numbers */}
            <div className="bg-orange-900/50 rounded-xl p-4 border border-orange-600">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-5 h-5 text-orange-400" />
                <h3 className="font-semibold text-orange-400">FOMO (Visual)</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-300">FOMO Fijo:</span>
                  <span className="text-white font-bold">+{adminSync.fomo.fomoAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Estado FOMO:</span>
                  <span className={`font-bold ${adminSync.fomo.isActive ? 'text-orange-400' : 'text-slate-400'}`}>
                    {adminSync.fomo.isActive ? '✅ Activo' : '❌ Desactivado'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Diferencia:</span>
                  <span className="text-white font-bold">+{adminSync.fomo.difference.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Fórmula:</span>
                  <span className="text-xs text-orange-300">Real + 1200</span>
                </div>
              </div>
            </div>

            {/* Display Numbers */}
            <div className="bg-blue-900/50 rounded-xl p-4 border border-blue-600">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold text-blue-400">Display (Usuario Ve)</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-300">Tickets Mostrados:</span>
                  <span className="text-white font-bold">{adminSync.display.soldCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Porcentaje Display:</span>
                  <span className="text-white font-bold">{adminSync.display.soldPercentage.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Disponibles Display:</span>
                  <span className="text-white font-bold">{adminSync.display.availableCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Cálculo:</span>
                  <span className="text-xs text-blue-300">{adminSync.real.soldCount} + {adminSync.fomo.fomoAmount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mathematical Verification */}
          <div className="mt-6 p-4 bg-slate-700/30 rounded-xl border border-slate-600">
            <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
              🧮 Verificación Matemática
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-300">Real: </span>
                <span className="text-white font-mono">
                  {adminSync.real.soldCount} + {adminSync.real.availableCount} + {adminSync.real.reservedCount} = {adminSync.real.soldCount + adminSync.real.availableCount + adminSync.real.reservedCount}
                </span>
              </div>
              <div>
                <span className="text-slate-300">Display: </span>
                <span className="text-white font-mono">
                  {adminSync.display.soldCount} mostrados, {adminSync.real.availableCount} disponibles reales
                </span>
              </div>
            </div>
            <div className="mt-2 text-xs text-slate-400">
              💡 Los usuarios ven {adminSync.display.soldCount} vendidos (motivante), pero pueden comprar de {adminSync.real.availableCount} realmente disponibles
            </div>
          </div>
        </motion.div>

        {/* Estadísticas mejoradas con animaciones */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"
        >
          {[
            { icon: Users, label: 'Total', value: stats.total, color: 'blue', bgColor: 'bg-blue-50' },
            { icon: Clock, label: 'Pendientes', value: stats.pendientes, color: 'orange', bgColor: 'bg-orange-50' },
            { icon: CheckCircle2, label: 'Confirmadas', value: stats.confirmadas, color: 'emerald', bgColor: 'bg-emerald-50' },
            { icon: XCircle, label: 'Canceladas', value: stats.canceladas, color: 'red', bgColor: 'bg-red-50' },
            { icon: DollarSign, label: 'Ingresos', value: formatearPrecio(stats.ingresosTotales), color: 'purple', bgColor: 'bg-purple-50' },
            { 
              icon: Eye, 
              label: 'Sistema FOMO + Real', 
              value: `🎭 Display: ${adminSync.display.soldCount.toLocaleString()} (${adminSync.display.soldPercentage.toFixed(1)}%)`, 
              color: 'indigo', 
              bgColor: 'bg-indigo-50' 
            }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + (index * 0.1) }}
              className={`${stat.bgColor} rounded-2xl p-4 border border-${stat.color}-200/50 hover:shadow-lg transition-all duration-300 group cursor-default`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium text-${stat.color}-600 mb-1`}>
                    {stat.label}
                  </p>
                  <p className={`text-2xl font-bold text-${stat.color}-800`}>
                    {stat.value}
                  </p>
                </div>
                <div className={`p-2 bg-${stat.color}-100 rounded-xl group-hover:scale-110 transition-transform duration-200`}>
                  <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Barra de acciones masivas */}
        <AnimatePresence>
          {selectedCompras.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-4 text-white shadow-xl"
            >
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <CheckSquare className="w-6 h-6" />
                  <span className="font-semibold text-lg">
                    {selectedCompras.size} compra{selectedCompras.size > 1 ? 's' : ''} seleccionada{selectedCompras.size > 1 ? 's' : ''}
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={processBatchApproval}
                    disabled={processingBatch}
                    className="flex items-center gap-2 px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50 shadow-lg"
                  >
                    <Zap size={16} />
                    {processingBatch ? 'Procesando...' : '✅ Aprobar Todo'}
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={processBatchReject}
                    disabled={processingBatch}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50"
                  >
                    <XCircle size={16} />
                    ❌ Cancelar
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={clearSelection}
                    className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl font-medium transition-all duration-200"
                  >
                    Limpiar
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controles de filtros y selección */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200/60"
        >
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Filtros de estado */}
            <div className="flex flex-wrap gap-2">
              {(['todas', 'pendiente', 'confirmada', 'cancelada'] as const).map((estado) => (
                <motion.button
                  key={estado}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setFiltro(estado)}
                  className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                    filtro === estado
                      ? 'bg-blue-600 text-white shadow-lg' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {estado.charAt(0).toUpperCase() + estado.slice(1)}
                  {estado !== 'todas' && (
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                      filtro === estado ? 'bg-white/20' : 'bg-slate-200'
                    }`}>
                      {estado === 'pendiente' ? stats.pendientes : 
                       estado === 'confirmada' ? stats.confirmadas : 
                       estado === 'cancelada' ? stats.canceladas : ''}
                    </span>
                  )}
                </motion.button>
              ))}
            </div>
            
            {/* Búsqueda */}
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por nombre, email o teléfono..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-slate-50 hover:bg-white"
              />
            </div>
            
            {/* Acciones rápidas */}
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={selectAllPendientes}
                className="flex items-center gap-2 px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-800 rounded-xl font-medium transition-all duration-200 border border-orange-200"
              >
                <CheckSquare size={16} />
                Seleccionar Pendientes
              </motion.button>
              
              {compras.length === 0 && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={agregarDatosPrueba}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-xl font-medium transition-all duration-200 border border-blue-200"
                >
                  📝 Datos Prueba
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Lista de compras optimizada */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200/60"
        >
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-6 h-6" />
              Compras Registradas ({comprasFiltradas.length})
            </h2>
          </div>

          <div className="divide-y divide-slate-200">
            <AnimatePresence mode="popLayout">
              {comprasFiltradas.map((compra, index) => (
                <motion.div
                  key={compra.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-6 hover:bg-slate-50 transition-all duration-200 ${
                    selectedCompras.has(compra.id!) ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Checkbox de selección */}
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => toggleCompraSelection(compra.id!)}
                      className="flex-shrink-0"
                    >
                      {selectedCompras.has(compra.id!) ? 
                        <CheckSquare className="w-6 h-6 text-blue-600" /> :
                        <Square className="w-6 h-6 text-slate-400 hover:text-blue-600" />
                      }
                    </motion.button>

                    {/* Información principal */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-slate-900 truncate">
                          {compra.customer.name}
                        </h3>
                        
                        <div className="flex items-center gap-3">
                          {/* Estado */}
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            compra.status === 'pendiente' 
                              ? 'bg-orange-100 text-orange-800 border border-orange-200' 
                              : compra.status === 'confirmada'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-red-100 text-red-800 border border-red-200'
                          }`}>
                            {compra.status}
                          </span>

                          {/* Acciones individuales */}
                          <div className="flex items-center gap-2">
                            {compra.status === 'pendiente' && (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => cambiarEstado(compra.id!, 'confirmada')}
                                disabled={processingIndividual.has(compra.id!)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-all duration-200 text-sm shadow-lg hover:shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <CheckCircle2 size={14} />
                                {processingIndividual.has(compra.id!) ? 'Procesando...' : 'Aprobar'}
                              </motion.button>
                            )}
                            
                            {compra.status !== 'cancelada' && (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => cambiarEstado(compra.id!, 'cancelada')}
                                className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all duration-200 text-sm"
                              >
                                <XCircle size={14} />
                                Cancelar
                              </motion.button>
                            )}
                            
                            {compra.payment_proof_url && (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => window.open(compra.payment_proof_url!, '_blank')}
                                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200 text-sm"
                              >
                                <Eye size={14} />
                                Captura
                              </motion.button>
                            )}

                            {/* Expandir detalles */}
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setExpandedCompra(expandedCompra === compra.id ? null : compra.id!)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-all duration-200 text-sm"
                            >
                              <ChevronDown 
                                className={`w-4 h-4 transition-transform duration-200 ${
                                  expandedCompra === compra.id ? 'rotate-180' : ''
                                }`} 
                              />
                            </motion.button>
                          </div>
                        </div>
                      </div>

                      {/* Info compacta */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-slate-500">Email:</span>
                          <span className="ml-2 font-medium text-slate-700 truncate block">{compra.customer.email}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Total:</span>
                          <span className="ml-2 font-bold text-emerald-600">{formatearPrecio(compra.total_amount)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Boletos:</span>
                          <span className="ml-2 font-medium text-blue-600">{compra.tickets.length || Math.round(compra.total_amount / 250)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Fecha:</span>
                          <span className="ml-2 font-medium text-slate-600">{formatearFecha(compra.created_at || '')}</span>
                        </div>
                      </div>

                      {/* Detalles expandidos */}
                      <AnimatePresence>
                        {expandedCompra === compra.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <h4 className="font-semibold text-slate-800 mb-2">Información del Cliente</h4>
                                <div className="space-y-1">
                                  <p><span className="text-slate-500">Teléfono:</span> <span className="ml-2">{compra.customer.phone}</span></p>
                                  <p><span className="text-slate-500">Ciudad:</span> <span className="ml-2">{compra.customer.city}</span></p>
                                  <p><span className="text-slate-500">Estado:</span> <span className="ml-2">{compra.customer.state}</span></p>
                                </div>
                              </div>
                              <div>
                                <h4 className="font-semibold text-slate-800 mb-2">Detalles de Pago</h4>
                                <div className="space-y-1">
                                  <p><span className="text-slate-500">Método:</span> <span className="ml-2">{compra.payment_method}</span></p>
                                  <p><span className="text-slate-500">Total:</span> <span className="ml-2 font-bold text-emerald-600">{formatearPrecio(compra.total_amount)}</span></p>
                                  {compra.tickets.length > 0 && (
                                    <p><span className="text-slate-500">Números:</span> <span className="ml-2 font-mono text-blue-600">{compra.tickets.join(', ')}</span></p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {comprasFiltradas.length === 0 && (
            <div className="text-center py-12">
              <div className="text-slate-400 mb-4">
                <Users className="w-16 h-16 mx-auto" />
              </div>
              <p className="text-slate-600 text-lg">No se encontraron compras</p>
              <p className="text-slate-500">Ajusta los filtros o agrega datos de prueba</p>
            </div>
          )}
        </motion.div>

        {/* 📊 ANALYTICS DASHBOARD - Comprehensive Business Intelligence */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 rounded-2xl p-6 text-white shadow-2xl border border-blue-800"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-500 rounded-xl">
              <DollarSign className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">📊 Business Analytics & Intelligence</h2>
              <p className="text-blue-200 text-sm">Análisis completo de métricas, conversiones y comportamiento del usuario</p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-1">
            <AnalyticsDashboard />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
