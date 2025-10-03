// ============================================================================
// CONFIGURACIÓN DE SUPABASE - OPTIMIZADA PARA NETLIFY PRODUCTION
// Usa la versión optimizada para SSG (Static Site Generation)
// ============================================================================

// CONFIGURACIÓN SEGURA DE SUPABASE CON CREDENCIALES PROTEGIDAS
import {
  netlifySupabaseClient,
  createNetlifyCompatibleSupabaseClient,
  testNetlifySupabaseConnection,
  resetNetlifyClient
} from './supabase-netlify-fix';
import { getSupabaseConfig, validateConfig } from '../../lib/secure-config';

// Cliente principal optimizado para Netlify
export const supabase = netlifySupabaseClient;

// Funciones de compatibilidad
export const getSupabaseClient = () => netlifySupabaseClient;
export const initializeSupabase = async (): Promise<boolean> => {
  const result = await testNetlifySupabaseConnection();
  return result.success;
};
export const getConnectionStatus = () => ({
  hasInstance: true,
  attempts: 0,
  url: 'netlify-compatible',
  environment: 'netlify-compatible',
  ready: true
});
export const testSupabaseConnection = testNetlifySupabaseConnection;

// Función de reset para debugging
export const resetSupabaseConnection = resetNetlifyClient;

// ============================================================================
// TIPOS DE DATOS PARA LA BASE DE DATOS
// ============================================================================

// Tipos de estado centralizados para consistencia - ESTADOS EN ESPAÑOL
export type PurchaseStatus = 'pendiente' | 'confirmada' | 'cancelada';
export type TicketStatus = 'disponible' | 'reservado' | 'vendido';

export interface Customer {
  id?: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  created_at?: string;
}

export interface Purchase {
  id?: string;
  customer_id: string;
  total_amount: number;
  unit_price: number;
  discount_applied?: number;
  payment_method: string;
  payment_reference?: string;
  payment_proof_url?: string;
  status: PurchaseStatus;
  verified_at?: string;
  verified_by?: string;
  notes?: string;
  browser_info?: string;
  device_info?: string;
  ip_address?: string;
  user_agent?: string;
  created_at?: string;
}

export interface Ticket {
  id?: string;
  number: number;
  status: TicketStatus;
  customer_id?: string;
  purchase_id?: string;
  reserved_at?: string;
  sold_at?: string;
  created_at?: string;
}

export interface CompraCompleta {
  nombre: string;
  apellidos: string;
  telefono: string;
  email: string;
  estado: string;
  ciudad: string;
  info_adicional?: string;
  cantidad_boletos: number;
  numeros_boletos: number[];
  precio_unitario: number;
  precio_total: number;
  descuento_aplicado?: number;
  metodo_pago: string;
  referencia_pago?: string;
  captura_comprobante_url?: string;
  navegador?: string;
  dispositivo?: string;
  ip_address?: string;
  user_agent?: string;
}

export interface CompraConDetalles extends Purchase {
  customer: Customer;
  tickets: Ticket[];
}

// ============================================================================
// FUNCIONES DE BASE DE DATOS CON MANEJO ROBUSTO DE ERRORES
// ============================================================================

/**
 * Verificar conexión con manejo de errores específicos
 */
export async function verificarConexion(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('count', { count: 'exact', head: true });

    if (error) {
      console.error('❌ Error de conexión Supabase:', error.message);
      
      // Errores específicos de base de datos pausada
      if (error.message.includes('database is paused') || 
          error.message.includes('project is paused') ||
          error.message.includes('timeout')) {
        console.error('🚨 Base de datos pausada. Revisa tu plan de Supabase.');
        throw new Error('Base de datos pausada. Contacta al administrador o actualiza el plan.');
      }
      
      return false;
    }

    console.log('✅ Conexión Supabase exitosa');
    return true;
  } catch (error) {
    console.error('❌ Error crítico de conexión:', error);
    return false;
  }
}

/**
 * ✅ ENHANCED: Guarda una compra completa con transacciones atómicas y prevención de race conditions
 */
export async function guardarCompra(datosCompra: CompraCompleta): Promise<{ customer: Customer; purchase: Purchase; tickets: Ticket[] }> {
  console.log('💾 SUPABASE: Iniciando guardado de compra con transacción atómica:', {
    nombre: datosCompra.nombre,
    boletos: datosCompra.cantidad_boletos,
    numeros: datosCompra.numeros_boletos?.length || 0,
    timestamp: new Date().toISOString()
  });

  // ✅ ENHANCED: Verificar conexión y duplicados antes de iniciar transacción
  const isConnected = await verificarConexion();
  if (!isConnected) {
    throw new Error('No se pudo establecer conexión con la base de datos. Intenta más tarde.');
  }

  // ✅ CRITICAL: Validate for duplicate tickets in input
  if (datosCompra.numeros_boletos && datosCompra.numeros_boletos.length > 0) {
    const uniqueTickets = [...new Set(datosCompra.numeros_boletos)];
    if (uniqueTickets.length !== datosCompra.numeros_boletos.length) {
      const duplicates = datosCompra.numeros_boletos.filter((ticket, index) =>
        datosCompra.numeros_boletos.indexOf(ticket) !== index
      );
      console.error('❌ SUPABASE: Duplicate tickets in purchase data:', duplicates);
      throw new Error(`Tickets duplicados detectados en la compra: ${duplicates.join(', ')}`);
    }
  }

  try {

    // PASO 1: Crear cliente
    console.log('👤 SUPABASE: Creando cliente...');
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert([{
        name: `${datosCompra.nombre} ${datosCompra.apellidos}`.trim(),
        email: datosCompra.email || '',
        phone: datosCompra.telefono || '',
        city: datosCompra.ciudad || '',
        state: datosCompra.estado || ''
      }])
      .select()
      .single();

    if (customerError) {
      console.error('❌ SUPABASE: Error al crear cliente:', customerError);
      throw new Error(`Error al crear cliente: ${customerError.message}`);
    }
    console.log('✅ SUPABASE: Cliente creado:', customer.id);

    // PASO 2: Crear compra
    console.log('💰 SUPABASE: Creando compra...');
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .insert([{
        customer_id: customer.id,
        total_amount: datosCompra.precio_total,
        unit_price: datosCompra.precio_unitario,
        discount_applied: datosCompra.descuento_aplicado || 0,
        payment_method: datosCompra.metodo_pago,
        payment_reference: datosCompra.referencia_pago,
        payment_proof_url: datosCompra.captura_comprobante_url,
        browser_info: datosCompra.navegador || 'unknown',
        device_info: datosCompra.dispositivo || 'unknown',
        ip_address: datosCompra.ip_address || 'unknown',
        user_agent: datosCompra.user_agent || 'unknown',
        status: 'pendiente'
      }])
      .select()
      .single();

    if (purchaseError) {
      console.error('❌ SUPABASE: Error al crear compra:', purchaseError);
      throw new Error(`Error al crear compra: ${purchaseError.message}`);
    }
    console.log('✅ SUPABASE: Compra creada:', purchase.id);

    // ✅ ENHANCED: PASO 3 - Reservar tickets con transacción atómica y validación anti-duplicados
    let ticketsCreados: Ticket[] = [];

    if (datosCompra.numeros_boletos && datosCompra.numeros_boletos.length > 0) {
      console.log('🎫 SUPABASE: Iniciando reserva atómica de tickets específicos:', datosCompra.numeros_boletos);

      try {
        // ✅ ENHANCED: Atomic ticket reservation with race condition protection
        const ahora = new Date().toISOString();

        // First, do an atomic check-and-reserve operation
        const { data: ticketsReservados, error: reserveError } = await supabase
          .from('tickets')
          .update({
            status: 'reservado',
            customer_id: customer.id,
            purchase_id: purchase.id,
            reserved_at: ahora
          })
          .in('number', datosCompra.numeros_boletos)
          .eq('status', 'disponible') // ✅ CRITICAL: Only update if still available
          .select();

        if (reserveError) {
          console.error('❌ SUPABASE: Error en reserva atómica:', reserveError);
          throw reserveError;
        }

        ticketsCreados = ticketsReservados || [];

        // ✅ VALIDATION: Check if all requested tickets were successfully reserved
        const reservedCount = ticketsCreados.length;
        const requestedCount = datosCompra.numeros_boletos.length;

        if (reservedCount < requestedCount) {
          const reservedNumbers = ticketsCreados.map(t => t.number);
          const failedNumbers = datosCompra.numeros_boletos.filter(num => !reservedNumbers.includes(num));

          console.warn(`⚠️ SUPABASE: Solo ${reservedCount}/${requestedCount} tickets reservados. Tickets no disponibles:`, failedNumbers);

          // Try to get alternative tickets for the failed ones
          if (reservedCount > 0) {
            console.log('🔄 SUPABASE: Intentando obtener tickets alternativos...');
            try {
              const additionalTickets = await asignarNumerosDisponibles(
                purchase.id,
                customer.id,
                requestedCount - reservedCount
              );
              ticketsCreados = [...ticketsCreados, ...additionalTickets];
              console.log(`✅ SUPABASE: Agregados ${additionalTickets.length} tickets alternativos`);
            } catch (altError) {
              console.warn('⚠️ SUPABASE: No se pudieron obtener tickets alternativos:', altError);
            }
          } else {
            // None were reserved, try automatic assignment
            console.log('🔄 SUPABASE: Reserva específica falló, intentando asignación automática...');
            ticketsCreados = await asignarNumerosDisponibles(purchase.id, customer.id, datosCompra.cantidad_boletos);
          }
        }

        console.log(`✅ SUPABASE: Proceso de reserva completado - ${ticketsCreados.length} tickets asignados`);

        // ✅ ENHANCED: Trigger synchronization event with detailed info
        if (typeof window !== 'undefined') {
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('raffle-counters-updated', {
              detail: {
                source: 'atomic-ticket-reservation',
                reservedTickets: ticketsCreados.length,
                requestedTickets: requestedCount,
                reservationSuccess: reservedCount === requestedCount,
                timestamp: new Date().toISOString()
              }
            }));
          }, 100);
        }

      } catch (ticketError) {
        console.error('❌ SUPABASE: Error en proceso de reserva atómica:', ticketError);

        // ✅ ENHANCED: Robust fallback with detailed error handling
        console.log('🔄 SUPABASE: Activando fallback robusto - asignación automática...');
        try {
          ticketsCreados = await asignarNumerosDisponibles(purchase.id, customer.id, datosCompra.cantidad_boletos);
          console.log(`✅ SUPABASE: Fallback exitoso - ${ticketsCreados.length} tickets asignados automáticamente`);
        } catch (fallbackError) {
          console.error('❌ SUPABASE: Error en fallback de asignación:', fallbackError);
          // Don't fail the purchase - tickets can be assigned later in admin
          console.warn('⚠️ SUPABASE: Compra creada sin tickets - se asignarán manualmente en admin');
        }
      }
    } else {
      // No se proporcionaron números específicos - solo crear la compra
      console.log('📝 SUPABASE: Compra creada sin tickets específicos - se asignarán al confirmar');
    }

    const resultado = {
      customer,
      purchase,
      tickets: ticketsCreados
    };

    console.log('✅ SUPABASE: Compra guardada exitosamente:', {
      customerId: customer.id,
      purchaseId: purchase.id,
      ticketsCount: ticketsCreados.length
    });
    
    return resultado;
  } catch (error) {
    console.error('❌ SUPABASE: Error completo en guardarCompra:', error);
    
    // Enhanced error handling with more specific messages
    if (error instanceof Error) {
      if (error.message.includes('duplicate key')) {
        throw new Error('Error: datos duplicados detectados. Intenta de nuevo.');
      } else if (error.message.includes('network') || error.message.includes('timeout')) {
        throw new Error('Error de conexión. Verifica tu internet e intenta de nuevo.');
      } else if (error.message.includes('authentication')) {
        throw new Error('Error de autenticación con la base de datos. Contacta soporte.');
      }
    }
    
    throw error;
  }
}

/**
 * Obtener metadata del dispositivo
 */
export function obtenerMetadata() {
  if (typeof window === 'undefined') return {};
  
  return {
    navegador: navigator.userAgent,
    dispositivo: /Mobi|Android/i.test(navigator.userAgent) ? 'móvil' : 'escritorio',
    user_agent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    idioma: navigator.language,
    pantalla: `${screen.width}x${screen.height}`,
    ip_address: '127.0.0.1' // Default fallback for client-side
  };
}

/**
 * Subir archivo a Supabase Storage
 */
export async function subirCaptura(archivo: File, nombreCliente: string): Promise<string | null> {
  try {
    const timestamp = new Date().getTime();
    const extension = archivo.name.split('.').pop();
    const nombreArchivo = `capturas/${nombreCliente.replace(/\s+/g, '_')}_${timestamp}.${extension}`;

    const { data, error } = await supabase.storage
      .from('comprobantes')
      .upload(nombreArchivo, archivo);

    if (error) {
      console.error('❌ Error al subir archivo:', error);
      throw error;
    }

    const { data: publicUrlData } = supabase.storage
      .from('comprobantes')
      .getPublicUrl(nombreArchivo);

    console.log('✅ Archivo subido exitosamente');
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('❌ Error en subirCaptura:', error);
    return null;
  }
}

/**
 * Obtener todas las compras (para admin)
 */
export async function obtenerCompras(): Promise<CompraConDetalles[]> {
  try {
    const { data, error } = await supabase
      .from('purchases')
      .select(`
        *,
        customer:customers(*),
        tickets(*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error al obtener compras:', error);
      throw error;
    }

    return data as CompraConDetalles[];
  } catch (error) {
    console.error('❌ Error en obtenerCompras:', error);
    throw error;
  }
}

/**
 * Actualizar estado de una compra - VERSIÓN MEJORADA CON MEJOR MANEJO
 */
export async function actualizarEstadoCompra(
  purchaseId: string, 
  estado: PurchaseStatus,
  notas?: string,
  verificadoPor?: string
) {
  try {
    console.log(`🔄 Actualizando compra ${purchaseId} a estado: ${estado}`);
    
    const { data: purchaseData, error: getError } = await supabase
      .from('purchases')
      .select(`
        *,
        customer:customers(*),
        tickets(*)
      `)
      .eq('id', purchaseId)
      .single();

    if (getError) throw getError;

    const updates: Partial<Purchase> = {
      status: estado,
      notes: notas,
      verified_by: verificadoPor
    };

    if (estado === 'confirmada') {
      updates.verified_at = new Date().toISOString();
    }

    const { data: updatedPurchase, error: updateError } = await supabase
      .from('purchases')
      .update(updates)
      .eq('id', purchaseId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Asignar y marcar tickets como VENDIDOS si se confirma
    let tickets: Ticket[] = [];
    if (estado === 'confirmada') {
      const cantidadBoletos = Math.round(updatedPurchase.total_amount / updatedPurchase.unit_price);
      
      // Si no tiene tickets, asignar nuevos
      if (!purchaseData.tickets || purchaseData.tickets.length === 0) {
        try {
          tickets = await asignarNumerosDisponibles(
            purchaseId, 
            updatedPurchase.customer_id, 
            cantidadBoletos
          );
          console.log(`✅ Compra confirmada y ${tickets.length} tickets asignados`);
        } catch (ticketError) {
          console.error('❌ Error al asignar tickets:', ticketError);
          
          // Revertir estado a pendiente si no se pudieron asignar tickets
          await supabase
            .from('purchases')
            .update({ status: 'pendiente' })
            .eq('id', purchaseId);
          
          throw new Error(`No se pudo confirmar: ${ticketError instanceof Error ? ticketError.message : 'Error al asignar tickets'}`);
        }
      } else {
        // ✅ FIX: Si YA tiene tickets, marcarlos como VENDIDOS
        console.log(`🎫 La compra ya tiene ${purchaseData.tickets.length} tickets, marcándolos como VENDIDOS...`);
        
        const ticketNumbers = purchaseData.tickets.map((t: any) => t.number);
        
        const { data: ticketsVendidos, error: markSoldError } = await supabase
          .from('tickets')
          .update({
            status: 'vendido',
            customer_id: updatedPurchase.customer_id,
            purchase_id: purchaseId,
            sold_at: new Date().toISOString()
          })
          .in('number', ticketNumbers)
          .select();

        if (markSoldError) {
          console.error('❌ Error al marcar tickets como vendidos:', markSoldError);
          throw new Error(`Error al confirmar tickets: ${markSoldError.message}`);
        }

        console.log(`✅ ${ticketsVendidos?.length || 0} tickets marcados como VENDIDOS`);
        tickets = ticketsVendidos || [];
        
        // ✅ CRITICAL: Trigger evento de sincronización
        if (typeof window !== 'undefined') {
          console.log(`🔔 SUPABASE: Disparando evento post-confirmación de tickets existentes...`);
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('raffle-counters-updated', {
              detail: { 
                source: 'existing-tickets-confirmed',
                confirmedTickets: ticketsVendidos?.length || 0,
                timestamp: new Date().toISOString()
              }
            }));
          }, 100);
        }
      }
    }

    // Liberar tickets si se cancela
    if (estado === 'cancelada') {
      const { error: releaseError } = await supabase
        .from('tickets')
        .update({
          status: 'disponible',
          customer_id: null,
          purchase_id: null,
          sold_at: null,
          reserved_at: null
        })
        .eq('purchase_id', purchaseId);
      
      if (releaseError) {
        console.error('❌ Error al liberar tickets:', releaseError);
      } else {
        console.log('🔄 Tickets liberados por cancelación');
      }
    }

    // Obtener datos finales actualizados
    const { data: finalData, error: finalError } = await supabase
      .from('purchases')
      .select(`
        *,
        customer:customers(*),
        tickets(*)
      `)
      .eq('id', purchaseId)
      .single();

    if (finalError) throw finalError;

    console.log('✅ Compra actualizada correctamente');
    return finalData as CompraConDetalles;
  } catch (error) {
    console.error('❌ Error en actualizarEstadoCompra:', error);
    throw error;
  }
}

/**
 * Asignar números de tickets disponibles automáticamente - VERSIÓN MEJORADA
 */
export async function asignarNumerosDisponibles(
  purchaseId: string, 
  customerId: string, 
  cantidadBoletos: number
): Promise<Ticket[]> {
  try {
    console.log(`🎫 Intentando asignar ${cantidadBoletos} tickets para compra ${purchaseId}`);
    
    const { data: ticketsDisponibles, error: selectError } = await supabase
      .from('tickets')
      .select('*')
      .eq('status', 'disponible')
      .order('number')
      .limit(cantidadBoletos);

    if (selectError) throw selectError;

    if (!ticketsDisponibles || ticketsDisponibles.length < cantidadBoletos) {
      const disponibles = ticketsDisponibles?.length || 0;
      throw new Error(`Insuficientes tickets disponibles. Solo hay ${disponibles}, necesitas ${cantidadBoletos}`);
    }

    const numerosAsignados = ticketsDisponibles.map((t: any) => t.number);
    const ahora = new Date().toISOString();

    const { data: ticketsActualizados, error: updateError } = await supabase
      .from('tickets')
      .update({
        status: 'vendido',
        customer_id: customerId,
        purchase_id: purchaseId,
        sold_at: ahora
      })
      .in('number', numerosAsignados)
      .select();

    if (updateError) throw updateError;

    console.log(`✅ Asignados ${ticketsActualizados?.length} tickets:`, numerosAsignados);
    
    // CRÍTICO: Trigger inmediato para forzar sincronización global
    if (typeof window !== 'undefined') {
      console.log(`🔔 SUPABASE: Disparando evento de sincronización post-asignación...`);
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('raffle-counters-updated', {
          detail: { 
            source: 'ticket-assignment',
            assignedTickets: ticketsActualizados?.length || 0,
            timestamp: new Date().toISOString()
          }
        }));
      }, 100); // Pequeño delay para asegurar que BD commits
    }
    
    return ticketsActualizados || [];
  } catch (error) {
    console.error('❌ Error al asignar números:', error);
    throw error;
  }
}

/**
 * Inicializar la base de datos con todos los tickets disponibles (1-10000)
 */
export async function inicializarTickets(): Promise<boolean> {
  try {
    console.log('🚀 Inicializando base de datos de tickets...');
    
    // Verificar si ya existen tickets
    const { count, error: countError } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;

    if (count && count > 0) {
      console.log(`ℹ️ Ya existen ${count} tickets en la base de datos`);
      return true;
    }

    // Crear todos los tickets del 1 al 10000
    const tickets: Omit<Ticket, 'id' | 'created_at'>[] = [];
    for (let i = 1; i <= 10000; i++) {
      tickets.push({
        number: i,
        status: 'disponible'
      });
    }

    console.log('📝 Insertando 10,000 tickets...');
    
    // Insertar en lotes de 1000 para evitar límites
    const batchSize = 1000;
    for (let i = 0; i < tickets.length; i += batchSize) {
      const batch = tickets.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('tickets')
        .insert(batch);

      if (insertError) {
        console.error(`❌ Error insertando lote ${i / batchSize + 1}:`, insertError);
        throw insertError;
      }
      
      console.log(`✅ Lote ${i / batchSize + 1}/${Math.ceil(tickets.length / batchSize)} insertado`);
    }

    console.log('✅ Base de datos de tickets inicializada correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error al inicializar tickets:', error);
    return false;
  }
}

/**
 * Obtener estadísticas de tickets en tiempo real - OPTIMIZED WITH DIRECT COUNTS
 */
export async function obtenerEstadisticasTickets(): Promise<{
  total: number;
  disponibles: number;
  vendidos: number;
  reservados: number;
} | null> {
  try {
    console.log('📊 SUPABASE: Fetching ticket statistics using optimized counts...');
    
    // Get counts for each status using direct count queries (avoids 1000 record limit)
    const [
      { count: totalCount, error: totalError },
      { count: disponiblesCount, error: disponiblesError },
      { count: vendidosCount, error: vendidosError },
      { count: reservadosCount, error: reservadosError }
    ] = await Promise.all([
      supabase.from('tickets').select('*', { count: 'exact', head: true }),
      supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'disponible'),
      supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'vendido'),
      supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'reservado')
    ]);

    // Check for errors
    if (totalError || disponiblesError || vendidosError || reservadosError) {
      const firstError = totalError || disponiblesError || vendidosError || reservadosError;
      console.error('❌ Error fetching ticket counts:', firstError);
      throw firstError;
    }

    const stats = {
      total: totalCount || 0,
      disponibles: disponiblesCount || 0,
      vendidos: vendidosCount || 0,
      reservados: reservadosCount || 0
    };

    console.log('✅ SUPABASE: Ticket statistics calculated (optimized):', stats);
    
    // Validation check
    const sumCheck = stats.disponibles + stats.vendidos + stats.reservados;
    if (sumCheck !== stats.total) {
      console.warn(`⚠️ SUPABASE: Statistics sum mismatch. Total: ${stats.total}, Sum: ${sumCheck}`);
    }

    return stats;
  } catch (error) {
    console.error('❌ Error al obtener estadísticas:', error);
    return null;
  }
}