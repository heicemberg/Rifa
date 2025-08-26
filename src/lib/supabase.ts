// ============================================================================
// CONFIGURACIÓN DE SUPABASE PARA RIFA SILVERADO Z71 2024
// ============================================================================

import { createClient } from '@supabase/supabase-js';

// Variables de entorno - Reemplaza con tus credenciales reales
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key_for_build';

// Cliente de Supabase con URLs válidas para builds
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================================================
// TIPOS DE DATOS PARA LA BASE DE DATOS NORMALIZADA
// ============================================================================

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
  status: 'pendiente' | 'confirmada' | 'cancelada';
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
  status: 'disponible' | 'reservado' | 'vendido';
  customer_id?: string;
  purchase_id?: string;
  reserved_at?: string;
  sold_at?: string;
  created_at?: string;
}

// Tipo para el input de compra completa
export interface CompraCompleta {
  // Datos del cliente
  nombre: string;
  apellidos: string;
  telefono: string;
  email: string;
  estado: string;
  ciudad: string;
  info_adicional?: string;
  
  // Información de la compra
  cantidad_boletos: number;
  numeros_boletos: number[];
  precio_unitario: number;
  precio_total: number;
  descuento_aplicado?: number;
  
  // Método de pago
  metodo_pago: string;
  referencia_pago?: string;
  captura_comprobante_url?: string;
  
  // Metadata
  navegador?: string;
  dispositivo?: string;
  ip_address?: string;
  user_agent?: string;
}

// Tipo para consultas con datos combinados
export interface CompraConDetalles extends Purchase {
  customer: Customer;
  tickets: Ticket[];
}

// ============================================================================
// FUNCIONES PARA INTERACTUAR CON LA BASE DE DATOS
// ============================================================================

/**
 * Guarda una compra completa usando el esquema normalizado
 */
export async function guardarCompra(datosCompra: CompraCompleta) {
  try {
    console.log('Intentando guardar compra con datos:', datosCompra);
    
    // Verificar conexión primero
    const conexionOk = await verificarConexion();
    if (!conexionOk) {
      throw new Error('No se pudo conectar con la base de datos');
    }

    // Iniciar transacción usando RPC o múltiples operaciones
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert([{
        name: `${datosCompra.nombre} ${datosCompra.apellidos}`,
        email: datosCompra.email,
        phone: datosCompra.telefono,
        city: datosCompra.ciudad,
        state: datosCompra.estado
      }])
      .select()
      .single();

    if (customerError) {
      console.error('Error al crear cliente:', customerError);
      throw new Error(`Error al crear cliente: ${customerError.message}`);
    }

    // Crear la compra
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
        browser_info: datosCompra.navegador,
        device_info: datosCompra.dispositivo,
        ip_address: datosCompra.ip_address,
        user_agent: datosCompra.user_agent,
        status: 'pendiente'
      }])
      .select()
      .single();

    if (purchaseError) {
      console.error('Error al crear compra:', purchaseError);
      throw new Error(`Error al crear compra: ${purchaseError.message}`);
    }

    // NO crear tickets aún - se asignarán cuando el admin confirme la compra
    // Los tickets se asignan solo en actualizarEstadoCompra cuando estado = 'confirmada'

    const resultado = {
      customer,
      purchase,
      tickets: [] // Sin tickets hasta que se confirme
    };

    console.log('Compra guardada exitosamente:', resultado);
    return resultado;
  } catch (error) {
    console.error('Error completo en guardarCompra:', error);
    throw error;
  }
}

/**
 * Sube un archivo (captura de pantalla) a Supabase Storage
 */
export async function subirCaptura(archivo: File, nombreCliente: string): Promise<string | null> {
  try {
    // Generar nombre único para el archivo
    const timestamp = new Date().getTime();
    const extension = archivo.name.split('.').pop();
    const nombreArchivo = `capturas/${nombreCliente.replace(/\s+/g, '_')}_${timestamp}.${extension}`;

    const { data, error } = await supabase.storage
      .from('comprobantes')
      .upload(nombreArchivo, archivo);

    if (error) {
      console.error('Error al subir archivo:', error);
      throw error;
    }

    // Obtener URL pública del archivo
    const { data: publicUrlData } = supabase.storage
      .from('comprobantes')
      .getPublicUrl(nombreArchivo);

    console.log('Archivo subido exitosamente:', publicUrlData.publicUrl);
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error en subirCaptura:', error);
    return null;
  }
}

/**
 * Obtiene todas las compras con detalles del cliente y tickets (para el admin)
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
      console.error('Error al obtener compras:', error);
      throw error;
    }

    return data as CompraConDetalles[];
  } catch (error) {
    console.error('Error en obtenerCompras:', error);
    throw error;
  }
}

/**
 * Actualiza el estado de una compra
 */
export async function actualizarEstadoCompra(
  purchaseId: string, 
  estado: 'pendiente' | 'confirmada' | 'cancelada',
  notas?: string,
  verificadoPor?: string
) {
  try {
    // 1. Obtener datos de la compra antes de actualizar
    const { data: purchaseData, error: getError } = await supabase
      .from('purchases')
      .select(`
        *,
        customer:customers(*)
      `)
      .eq('id', purchaseId)
      .single();

    if (getError) throw getError;

    // 2. Actualizar el estado de la compra
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

    // 3. Si se confirma la compra, asignar números de tickets
    let tickets: Ticket[] = [];
    if (estado === 'confirmada') {
      // Calcular cantidad de boletos basado en el total y precio unitario
      const cantidadBoletos = Math.round(updatedPurchase.total_amount / updatedPurchase.unit_price);
      
      try {
        tickets = await asignarNumerosDisponibles(
          purchaseId, 
          updatedPurchase.customer_id, 
          cantidadBoletos
        );
        console.log(`✅ Compra confirmada y ${tickets.length} tickets asignados`);
      } catch (ticketError) {
        console.error('Error al asignar tickets:', ticketError);
        // Revertir el estado si no se pudieron asignar tickets
        await supabase
          .from('purchases')
          .update({ status: 'pendiente' })
          .eq('id', purchaseId);
        
        throw new Error(`No se pudo confirmar: ${ticketError instanceof Error ? ticketError.message : 'Error al asignar tickets'}`);
      }
    }

    // 4. Si se cancela, liberar cualquier ticket asignado
    if (estado === 'cancelada') {
      await supabase
        .from('tickets')
        .update({
          status: 'disponible',
          customer_id: null,
          purchase_id: null,
          sold_at: null
        })
        .eq('purchase_id', purchaseId);
      
      console.log('🔄 Tickets liberados por cancelación');
    }

    // 5. Obtener datos completos actualizados
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

    console.log('Compra actualizada:', finalData);
    return finalData as CompraConDetalles;
  } catch (error) {
    console.error('Error en actualizarEstadoCompra:', error);
    throw error;
  }
}

/**
 * Obtiene información del navegador y dispositivo
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
  };
}

// ============================================================================
// CONFIGURACIÓN INICIAL
// ============================================================================

/**
 * Verifica la conexión con Supabase
 */
export async function verificarConexion() {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('count', { count: 'exact', head: true });

    if (error) {
      console.error('Error de conexión:', error);
      return false;
    }

    console.log('Conexión con Supabase exitosa');
    return true;
  } catch (error) {
    console.error('Error al verificar conexión:', error);
    return false;
  }
}

// ============================================================================
// FUNCIONES ADICIONALES PARA EL ESQUEMA NORMALIZADO
// ============================================================================

/**
 * Obtiene tickets disponibles
 */
export async function obtenerTicketsDisponibles(): Promise<Ticket[]> {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('status', 'disponible')
      .order('number');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error al obtener tickets disponibles:', error);
    throw error;
  }
}

/**
 * Reserva tickets temporalmente
 */
export async function reservarTickets(numeros: number[], customerId?: string): Promise<Ticket[]> {
  try {
    const updates = numeros.map(numero => ({
      number: numero,
      status: 'reservado' as const,
      customer_id: customerId,
      reserved_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('tickets')
      .upsert(updates, { 
        onConflict: 'number',
        ignoreDuplicates: false 
      })
      .select();

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error al reservar tickets:', error);
    throw error;
  }
}

/**
 * Libera reservas expiradas (llamar periódicamente)
 */
export async function liberarReservasExpiradas(minutos: number = 30): Promise<number> {
  try {
    const tiempoExpiracion = new Date();
    tiempoExpiracion.setMinutes(tiempoExpiracion.getMinutes() - minutos);

    const { data, error } = await supabase
      .from('tickets')
      .update({
        status: 'disponible',
        customer_id: null,
        reserved_at: null
      })
      .eq('status', 'reservado')
      .lt('reserved_at', tiempoExpiracion.toISOString())
      .select();

    if (error) throw error;
    return data?.length || 0;
  } catch (error) {
    console.error('Error al liberar reservas:', error);
    throw error;
  }
}

/**
 * Asigna números de tickets disponibles automáticamente para una compra
 */
export async function asignarNumerosDisponibles(
  purchaseId: string, 
  customerId: string, 
  cantidadBoletos: number
): Promise<Ticket[]> {
  try {
    // 1. Obtener tickets disponibles en orden numérico
    const { data: ticketsDisponibles, error: selectError } = await supabase
      .from('tickets')
      .select('*')
      .eq('status', 'disponible')
      .order('number')
      .limit(cantidadBoletos);

    if (selectError) throw selectError;

    if (!ticketsDisponibles || ticketsDisponibles.length < cantidadBoletos) {
      throw new Error(`Solo hay ${ticketsDisponibles?.length || 0} tickets disponibles, necesitas ${cantidadBoletos}`);
    }

    // 2. Marcar tickets como vendidos y asignar al cliente
    const numerosAsignados = ticketsDisponibles.map(t => t.number);
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
    return ticketsActualizados || [];
  } catch (error) {
    console.error('Error al asignar números:', error);
    throw error;
  }
}