// ============================================================================
// HOOK PARA SINCRONIZAR DATOS CON SUPABASE - VERSIÓN COMPLETA
// ============================================================================

import { useEffect, useState, useCallback } from 'react';
import { supabase, verificarConexion } from '../lib/supabase';
import { useRaffleStore } from '../stores/raffle-store';
import { adminToast, publicToast, isCurrentUserAdmin } from '../lib/toast-utils';

export function useSupabaseSync() {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fomoPercentage, setFomoPercentage] = useState(8);
  const [realTicketsCount, setRealTicketsCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  
  // Store actions
  const { 
    _updateAvailableTickets,
    setSoldTicketsFromDB,
    setReservedTicketsFromDB
  } = useRaffleStore(state => ({
    _updateAvailableTickets: state._updateAvailableTickets,
    setSoldTicketsFromDB: state.setSoldTicketsFromDB,
    setReservedTicketsFromDB: state.setReservedTicketsFromDB
  }));

  // ============================================================================
  // SISTEMA FOMO: GENERAR TICKETS VENDIDOS VISUALMENTE (8%-18%)
  // ============================================================================
  const generateFomoTickets = (realSoldTickets: number[]): number[] => {
    const totalTickets = 10000;
    const currentPercentage = (realSoldTickets.length / totalTickets) * 100;
    
    // Si ya tenemos más del 18% vendido realmente, no agregar FOMO
    if (currentPercentage >= 18) {
      return realSoldTickets;
    }
    
    // Calcular cuántos tickets FOMO necesitamos para llegar al porcentaje objetivo
    const targetCount = Math.floor((fomoPercentage / 100) * totalTickets);
    const fomoNeeded = Math.max(0, targetCount - realSoldTickets.length);
    
    if (fomoNeeded === 0) {
      return realSoldTickets;
    }
    
    // Generar tickets FOMO aleatorios que no estén en los reales
    const realTicketsSet = new Set(realSoldTickets);
    const fomoTickets: number[] = [];
    
    while (fomoTickets.length < fomoNeeded) {
      const randomTicket = Math.floor(Math.random() * totalTickets) + 1;
      if (!realTicketsSet.has(randomTicket) && !fomoTickets.includes(randomTicket)) {
        fomoTickets.push(randomTicket);
      }
    }
    
    // Combinar tickets reales + FOMO
    const allTickets = [...realSoldTickets, ...fomoTickets].sort((a, b) => a - b);
    
    console.log(`FOMO System: ${realSoldTickets.length} real + ${fomoTickets.length} FOMO = ${allTickets.length} total (${fomoPercentage}%)`);
    
    return allTickets;
  };

  // ============================================================================
  // CARGAR DATOS INICIALES DESDE SUPABASE - VERSIÓN MEJORADA
  // ============================================================================
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Verificar conexión
      const connected = await verificarConexion();
      setIsConnected(connected);
      
      if (!connected) {
        console.warn('Supabase no disponible, usando datos locales');
        adminToast.error('Base de datos no disponible, usando modo offline');
        setLoading(false);
        return;
      }

      // Obtener todos los tickets con sus estados
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select('number, status')
        .order('number');

      if (ticketsError) {
        console.error('Error al obtener tickets:', ticketsError);
        adminToast.error('Error al cargar estado de tickets');
        return;
      }

      // Separar tickets por estado
      const realSoldTickets = ticketsData?.filter((t: any) => t.status === 'vendido').map((t: any) => t.number) || [];
      const reservedTickets = ticketsData?.filter((t: any) => t.status === 'reservado').map((t: any) => t.number) || [];
      
      // Actualizar contador de tickets reales
      setRealTicketsCount(realSoldTickets.length);
      
      // Aplicar sistema FOMO solo si tenemos pocos tickets vendidos realmente
      const visualSoldTickets = generateFomoTickets(realSoldTickets);
      
      // Actualizar store con tickets visuales (incluye FOMO)
      setSoldTicketsFromDB(visualSoldTickets);
      setReservedTicketsFromDB(reservedTickets);
      
      // Actualizar tiempo de sincronización
      setLastSyncTime(new Date());
        
      console.log(`✅ Sincronización completa: ${realSoldTickets.length} reales + ${visualSoldTickets.length - realSoldTickets.length} FOMO = ${visualSoldTickets.length} total`);
      adminToast.success(`Sincronización completa: ${realSoldTickets.length} tickets reales vendidos`);
      
      // Actualizar tickets disponibles
      setTimeout(() => {
        _updateAvailableTickets();
      }, 100);
      
    } catch (error) {
      console.error('Error al cargar datos iniciales:', error);
      adminToast.error('Error al sincronizar con la base de datos');
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  }, [fomoPercentage, setSoldTicketsFromDB, setReservedTicketsFromDB, _updateAvailableTickets]);

  // ============================================================================
  // ACTUALIZAR PORCENTAJE FOMO AUTOMÁTICAMENTE
  // ============================================================================
  useEffect(() => {
    const updateFomoPercentage = () => {
      // Incrementar gradualmente de 8% a 18% basado en compras y tiempo
      const basePercentage = 8;
      const maxPercentage = 18;
      const timeBoost = Math.min(2, Math.floor(Date.now() / (1000 * 60 * 30))); // +2% cada 30 min
      const randomBoost = Math.random() * 3; // +0-3% aleatorio
      
      const newPercentage = Math.min(
        maxPercentage, 
        basePercentage + timeBoost + randomBoost
      );
      
      if (Math.abs(newPercentage - fomoPercentage) > 0.5) {
        setFomoPercentage(Math.floor(newPercentage));
      }
    };

    // Actualizar cada 2 minutos
    const interval = setInterval(updateFomoPercentage, 2 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [fomoPercentage]);

  // ============================================================================
  // SUSCRIPCIÓN A CAMBIOS EN TIEMPO REAL - VERSIÓN MEJORADA
  // ============================================================================
  useEffect(() => {
    if (!isConnected) return;

    console.log('🔴 Configurando suscripciones en tiempo real...');

    // Suscripción a cambios en tickets con throttling
    let ticketUpdateTimeout: NodeJS.Timeout | null = null;
    const ticketsSubscription = supabase
      .channel('tickets-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets'
        },
        (payload: any) => {
          console.log('🎫 Cambio en tickets:', payload.eventType, payload.new || payload.old);
          
          // Throttle para evitar demasiadas actualizaciones
          if (ticketUpdateTimeout) clearTimeout(ticketUpdateTimeout);
          ticketUpdateTimeout = setTimeout(() => {
            loadInitialData();
          }, 1000); // Esperar 1 segundo antes de actualizar
          
          // Mostrar notificación específica según el evento
          if (payload.eventType === 'UPDATE') {
            const newStatus = payload.new?.status;
            const ticketNumber = payload.new?.number;
            
            if (newStatus === 'vendido') {
              publicToast.success(`¡Ticket ${String(ticketNumber).padStart(4, '0')} vendido!`, {
                duration: 2000,
                icon: '🎯'
              });
            } else if (newStatus === 'reservado') {
              adminToast.info(`Ticket ${String(ticketNumber).padStart(4, '0')} reservado`);
            }
          }
        }
      )
      .subscribe();

    // Suscripción a cambios en compras con mejor manejo
    const purchasesSubscription = supabase
      .channel('purchases-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'purchases'
        },
        (payload: any) => {
          console.log('💰 Cambio en compras:', payload.eventType, payload.new || payload.old);
          
          // Mostrar notificaciones específicas
          if (payload.eventType === 'INSERT') {
            const compra = payload.new;
            publicToast.success('¡Nueva compra registrada!', {
              duration: 3000,
              icon: '🎉'
            });
            adminToast.info(`Nueva compra: ${compra?.payment_method || 'N/A'} - $${compra?.total_amount || 0}`);
          } else if (payload.eventType === 'UPDATE') {
            const compra = payload.new;
            if (compra?.status === 'confirmada') {
              publicToast.success('¡Compra confirmada!', {
                duration: 2000,
                icon: '✅'
              });
            }
          }
        }
      )
      .subscribe();

    // Suscripción a cambios en customers para logs admin
    const customersSubscription = supabase
      .channel('customers-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'customers'
        },
        (payload: any) => {
          console.log('👤 Nuevo cliente:', payload.new);
          adminToast.info(`Nuevo cliente: ${payload.new?.name || 'N/A'}`);
        }
      )
      .subscribe();

    return () => {
      if (ticketUpdateTimeout) clearTimeout(ticketUpdateTimeout);
      supabase.removeChannel(ticketsSubscription);
      supabase.removeChannel(purchasesSubscription);
      supabase.removeChannel(customersSubscription);
    };
  }, [isConnected, loadInitialData]);

  // ============================================================================
  // CARGAR DATOS AL MONTAR
  // ============================================================================
  useEffect(() => {
    loadInitialData();
    
    // Recargar datos cada 5 minutos
    const interval = setInterval(loadInitialData, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  // ============================================================================
  // FUNCIONES PARA OBTENER Y GESTIONAR TICKETS REALMENTE DISPONIBLES
  // ============================================================================
  const getRealAvailableTickets = useCallback(async (): Promise<number[]> => {
    try {
      if (!isConnected) {
        console.warn('No hay conexión con Supabase, devolviendo array vacío');
        return [];
      }

      const { data: unavailableTickets, error } = await supabase
        .from('tickets')
        .select('number')
        .in('status', ['vendido', 'reservado']);

      if (error) {
        console.error('Error al obtener tickets no disponibles:', error);
        return [];
      }

      const unavailableNumbers = new Set(unavailableTickets?.map((t: any) => t.number) || []);
      const availableTickets: number[] = [];

      for (let i = 1; i <= 10000; i++) {
        if (!unavailableNumbers.has(i)) {
          availableTickets.push(i);
        }
      }

      console.log(`📊 Tickets disponibles reales: ${availableTickets.length}`);
      return availableTickets;
    } catch (error) {
      console.error('Error en getRealAvailableTickets:', error);
      return [];
    }
  }, [isConnected]);

  // ============================================================================
  // FUNCIÓN PARA RESERVAR TICKETS EN LA BASE DE DATOS
  // ============================================================================
  const reserveTicketsInDB = useCallback(async (ticketNumbers: number[], customerId: string): Promise<boolean> => {
    try {
      if (!isConnected) {
        console.warn('No hay conexión con Supabase, no se pueden reservar tickets');
        return false;
      }

      const { error } = await supabase
        .from('tickets')
        .update({
          status: 'reservado',
          customer_id: customerId,
          reserved_at: new Date().toISOString()
        })
        .in('number', ticketNumbers)
        .eq('status', 'disponible');

      if (error) {
        console.error('Error al reservar tickets:', error);
        return false;
      }

      console.log(`✅ Reservados ${ticketNumbers.length} tickets en BD:`, ticketNumbers);
      adminToast.success(`Reservados ${ticketNumbers.length} tickets`);
      
      // Refrescar datos después de la reserva
      setTimeout(() => loadInitialData(), 500);
      
      return true;
    } catch (error) {
      console.error('Error en reserveTicketsInDB:', error);
      return false;
    }
  }, [isConnected, loadInitialData]);

  // ============================================================================
  // FUNCIÓN PARA MARCAR TICKETS COMO VENDIDOS EN LA BASE DE DATOS
  // ============================================================================
  const markTicketsAsSold = useCallback(async (ticketNumbers: number[], customerId: string): Promise<boolean> => {
    try {
      if (!isConnected) {
        console.warn('No hay conexión con Supabase, no se pueden marcar tickets como vendidos');
        return false;
      }

      const { error } = await supabase
        .from('tickets')
        .update({
          status: 'vendido',
          customer_id: customerId,
          sold_at: new Date().toISOString()
        })
        .in('number', ticketNumbers);

      if (error) {
        console.error('Error al marcar tickets como vendidos:', error);
        return false;
      }

      console.log(`✅ Marcados ${ticketNumbers.length} tickets como vendidos:`, ticketNumbers);
      adminToast.success(`${ticketNumbers.length} tickets marcados como vendidos`);
      
      // Refrescar datos después de marcar como vendidos
      setTimeout(() => loadInitialData(), 500);
      
      return true;
    } catch (error) {
      console.error('Error en markTicketsAsSold:', error);
      return false;
    }
  }, [isConnected, loadInitialData]);

  return {
    isConnected,
    loading,
    fomoPercentage,
    realTicketsCount,
    lastSyncTime,
    refreshData: loadInitialData,
    getRealAvailableTickets,
    reserveTicketsInDB,
    markTicketsAsSold
  };
}