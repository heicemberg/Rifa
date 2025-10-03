# 🚀 CONFIGURACIÓN RÁPIDA DE SUPABASE PARA RIFA

## PASO 1: CREAR NUEVO PROYECTO (5 minutos)

1. **Ve a**: https://supabase.com
2. **Crea cuenta** o inicia sesión
3. **Nuevo proyecto**:
   - Nombre: `rifa-silverado-2024`
   - Contraseña DB: `RifaSegura2024!`
   - Región: `South America (São Paulo)`

## PASO 2: OBTENER CREDENCIALES (2 minutos)

1. **Ve a Settings > API**
2. **Copia estos valores**:
   - **Project URL**: `https://[PROJECT-ID].supabase.co`
   - **anon public key**: `eyJ...` (el más largo)

## PASO 3: CONFIGURAR BASE DE DATOS (5 minutos)

**Ve a SQL Editor y ejecuta este código:**

```sql
-- ============================================================================
-- CONFIGURACIÓN COMPLETA BASE DE DATOS RIFA SILVERADO Z71 2024
-- ============================================================================

-- Tabla de clientes
CREATE TABLE customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  city TEXT,
  state TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla de compras
CREATE TABLE purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id),
  total_amount DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  discount_applied DECIMAL(10,2) DEFAULT 0,
  payment_method TEXT NOT NULL,
  payment_reference TEXT,
  payment_proof_url TEXT,
  status TEXT DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'confirmada', 'cancelada')),
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by TEXT,
  notes TEXT,
  browser_info TEXT,
  device_info TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla de tickets (10,000 tickets)
CREATE TABLE tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  number INTEGER UNIQUE NOT NULL,
  status TEXT DEFAULT 'disponible' CHECK (status IN ('disponible', 'reservado', 'vendido')),
  customer_id UUID REFERENCES customers(id),
  purchase_id UUID REFERENCES purchases(id),
  reserved_at TIMESTAMP WITH TIME ZONE,
  sold_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_tickets_number ON tickets(number);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_purchases_status ON purchases(status);
CREATE INDEX idx_purchases_created_at ON purchases(created_at);

-- ============================================================================
-- INICIALIZAR 10,000 TICKETS
-- ============================================================================

-- Generar todos los tickets del 1 al 10,000
INSERT INTO tickets (number, status)
SELECT generate_series(1, 10000), 'disponible';

-- ============================================================================
-- CONFIGURAR RLS (Row Level Security)
-- ============================================================================

-- Habilitar RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Políticas públicas para lectura (necesario para la app)
CREATE POLICY "Enable read access for all users" ON customers FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON purchases FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON tickets FOR SELECT USING (true);

-- Políticas para inserción (necesario para compras)
CREATE POLICY "Enable insert for all users" ON customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable insert for all users" ON purchases FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON tickets FOR UPDATE USING (true);

-- ============================================================================
-- CONFIGURAR STORAGE PARA COMPROBANTES
-- ============================================================================

-- Crear bucket para comprobantes de pago
INSERT INTO storage.buckets (id, name, public) VALUES ('comprobantes', 'comprobantes', true);

-- Política para subir comprobantes
CREATE POLICY "Allow uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'comprobantes');
CREATE POLICY "Allow public read" ON storage.objects FOR SELECT USING (bucket_id = 'comprobantes');

-- ============================================================================
-- VERIFICAR CONFIGURACIÓN
-- ============================================================================

-- Verificar que todo está listo
SELECT
  'customers' as tabla, count(*) as registros FROM customers
UNION ALL
SELECT
  'purchases' as tabla, count(*) as registros FROM purchases
UNION ALL
SELECT
  'tickets' as tabla, count(*) as registros FROM tickets;

-- Debe mostrar:
-- customers: 0
-- purchases: 0
-- tickets: 10000
```

## PASO 4: ACTUALIZAR APLICACIÓN (2 minutos)

**Reemplaza en tu `.env.local`:**

```bash
# NUEVAS CREDENCIALES SUPABASE
NEXT_PUBLIC_SUPABASE_URL=https://[TU-NUEVO-PROJECT-ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[TU-NUEVA-ANON-KEY]
```

## 🎯 RESULTADO FINAL

Después de estos pasos tendrás:
- ✅ Base de datos funcionando
- ✅ 10,000 tickets listos
- ✅ Sistema de pagos operativo
- ✅ Admin panel funcional
- ✅ Listo para vender tickets reales

## ⚡ PRUEBA RÁPIDA

```bash
node test-supabase.js
```

Debe mostrar:
```
✅ Connection successful!
✅ Tickets table exists with 10000 tickets
✅ Purchases table exists with 0 purchases
🎯 Supabase is ready for production!
```

## 💰 PARA PRODUCCIÓN

- **Upgrade a Pro Plan** ($25/mes) para evitar pausas
- **Backups automáticos** incluidos
- **Mejor performance** para tráfico real
- **Soporte prioritario**