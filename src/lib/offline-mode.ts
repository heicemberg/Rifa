// ============================================================================
// MODO OFFLINE TEMPORAL - HASTA QUE SUPABASE FUNCIONE
// ============================================================================

export const OFFLINE_MODE = true; // Cambiar a false cuando Supabase funcione

// Simulación de datos para testing
export const mockTickets = Array.from({ length: 10000 }, (_, i) => ({
  id: `ticket-${i + 1}`,
  number: i + 1,
  status: Math.random() > 0.9 ? 'vendido' : 'disponible',
  customer_id: null,
  purchase_id: null,
  created_at: new Date().toISOString()
}));

export const mockCustomers: any[] = [];
export const mockPurchases: any[] = [];

// Simulación de funciones de Supabase
export const offlineSupabase = {
  from: (table: string) => ({
    select: (columns?: string) => ({
      eq: (column: string, value: any) => ({
        single: () => Promise.resolve({ data: null, error: null }),
        data: null,
        error: null
      }),
      in: (column: string, values: any[]) => ({
        data: [],
        error: null
      }),
      limit: (count: number) => ({
        data: [],
        error: null
      }),
      order: (column: string, options?: any) => ({
        data: [],
        error: null
      }),
      count: 'exact' as const,
      head: true,
      data: table === 'tickets' ? mockTickets : [],
      error: null
    }),
    insert: (data: any) => ({
      select: () => ({
        single: () => Promise.resolve({
          data: { id: `mock-${Date.now()}`, ...data },
          error: null
        })
      })
    }),
    update: (data: any) => ({
      eq: (column: string, value: any) => ({
        select: () => Promise.resolve({
          data: [{ id: `mock-${Date.now()}`, ...data }],
          error: null
        })
      }),
      in: (column: string, values: any[]) => ({
        select: () => Promise.resolve({
          data: values.map(v => ({ id: `mock-${v}`, number: v, ...data })),
          error: null
        })
      })
    })
  }),
  storage: {
    from: (bucket: string) => ({
      upload: (path: string, file: File) => Promise.resolve({
        data: { path },
        error: null
      }),
      getPublicUrl: (path: string) => ({
        data: { publicUrl: `/mock-uploads/${path}` }
      })
    })
  }
};

console.log('🔄 MODO OFFLINE ACTIVO - Supabase simulado para testing');