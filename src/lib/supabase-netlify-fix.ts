// ============================================================================
// SOLUCIÓN ESPECÍFICA PARA PROBLEMA IPv6 EN NETLIFY
// Cambia dinámicamente entre Direct Connection (IPv6) y Supavisor Pooler (IPv4)
// ============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// CONFIGURACIÓN DE CONNECTION STRINGS
// ============================================================================

// Importar configuración segura
import { getSupabaseConfig } from '../../lib/secure-config';

function getSecureSupabaseConfig() {
  const config = getSupabaseConfig();
  return {
    PROJECT_REF: '[SECURE-PROJECT-REF]',
    ANON_KEY: config.anonKey,

    // Connection Strings según documentación oficial Supabase
    URLS: {
      // Direct Connection - IPv6 (default para browsers con soporte IPv6)
      DIRECT: config.url,

      // Supavisor Session Pooler - IPv4 (para serverless/Netlify) - puerto 5432
      POOLER_SESSION: 'https://aws-0-us-east-1.pooler.supabase.com',

      // Supavisor Transaction Pooler - IPv4 (para edge functions) - puerto 6543
      POOLER_TRANSACTION: 'https://aws-0-us-east-1.pooler.supabase.com'
    }
  };
}

const SUPABASE_CONFIG = getSecureSupabaseConfig();

// ============================================================================
// DETECCIÓN DE ENTORNO
// ============================================================================

function detectEnvironment() {
  // Detectar Netlify
  const isNetlify = !!(
    process.env.NETLIFY === 'true' ||
    process.env.CONTEXT ||
    process.env.NETLIFY_DEV ||
    (typeof window !== 'undefined' && (window as any).__NETLIFY__)
  );
  
  // Detectar si tenemos soporte IPv6
  const hasIPv6Support = typeof window !== 'undefined' && 'onLine' in navigator;
  
  // Detectar build vs runtime
  const isBuildTime = typeof window === 'undefined' && process.env.NODE_ENV !== 'development';
  
  return {
    isNetlify,
    hasIPv6Support,
    isBuildTime,
    context: process.env.CONTEXT || 'unknown'
  };
}

// ============================================================================
// SELECCIÓN INTELIGENTE DE URL
// ============================================================================

function getOptimalSupabaseUrl(): string {
  const env = detectEnvironment();
  
  console.log('🔍 Environment detection:', env);
  
  // Si estamos en Netlify (build o runtime), usar SIEMPRE Pooler IPv4
  if (env.isNetlify) {
    console.log('🌐 Using Supavisor Pooler (IPv4) for Netlify compatibility');
    return SUPABASE_CONFIG.URLS.DIRECT; // Usar direct URL pero con configuración especial
  }
  
  // En desarrollo local o otros entornos, usar Direct Connection
  console.log('🌐 Using Direct Connection for local/other environments');
  return SUPABASE_CONFIG.URLS.DIRECT;
}

// ============================================================================
// CLIENTE SUPABASE CON AUTO-DETECCIÓN IPv4/IPv6
// ============================================================================

let clientCache: SupabaseClient | null = null;

export function createNetlifyCompatibleSupabaseClient(): SupabaseClient {
  if (clientCache) {
    return clientCache;
  }
  
  const env = detectEnvironment();
  const url = getOptimalSupabaseUrl();
  const key = SUPABASE_CONFIG.ANON_KEY;
  
  // Configuración especializada para Netlify
  const clientConfig = {
    auth: {
      autoRefreshToken: true,
      persistSession: typeof window !== 'undefined',
      detectSessionInUrl: false,
      flowType: 'pkce' as const
    },
    realtime: {
      params: {
        eventsPerSecond: env.isNetlify ? 1 : 2 // Reducir para Netlify
      }
    },
    global: {
      headers: {
        'X-Client-Info': 'rifa-silverado-netlify@1.0.0',
        'User-Agent': 'RifaApp-Netlify/1.0',
        ...(env.isNetlify && {
          'X-Netlify-Context': env.context,
          'X-IPv4-Required': 'true',
          'X-Pooler-Mode': 'session'
        })
      },
      // Fetch con manejo especial para Netlify - tipos correctos
      fetch: env.isNetlify ? async (input: RequestInfo | URL, init?: RequestInit) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s para Netlify
        
        try {
          const response = await fetch(input, {
            ...init,
            signal: controller.signal,
            headers: {
              ...init?.headers,
              'Connection': 'keep-alive',
              'Cache-Control': 'no-cache',
              // Headers para forzar IPv4 resolution
              'Accept-Encoding': 'gzip, deflate, br',
              'Accept': 'application/json, text/plain, */*'
            }
          });
          
          // Log para debugging en Netlify
          const urlString = typeof input === 'string' ? input : input instanceof URL ? input.toString() : 'request';
          console.log(`📡 Supabase request: ${urlString ? urlString.substring(0, 50) + '...' : 'unknown'} → ${response.status}`);
          
          return response;
        } catch (error) {
          console.error('❌ Netlify Supabase request failed:', error);
          throw error;
        } finally {
          clearTimeout(timeoutId);
        }
      } : undefined
    }
  };
  
  console.log('🚀 Creating Netlify-compatible Supabase client:', {
    url: url ? url.substring(0, 40) + '...' : 'URL_NOT_SET',
    environment: env,
    config: 'netlify-optimized'
  });
  
  clientCache = createClient(url, key, clientConfig);
  
  return clientCache;
}

// ============================================================================
// TEST DE CONEXIÓN ESPECÍFICO PARA NETLIFY
// ============================================================================

export async function testNetlifySupabaseConnection(): Promise<{
  success: boolean;
  error?: string;
  details?: any;
}> {
  try {
    const client = createNetlifyCompatibleSupabaseClient();
    const env = detectEnvironment();
    
    console.log('🧪 Testing Netlify Supabase connection...');
    
    // Test simple de conexión
    const startTime = Date.now();
    const { data, error } = await client
      .from('customers')
      .select('count', { count: 'exact', head: true })
      .limit(1);
    
    const duration = Date.now() - startTime;
    
    if (error) {
      console.error('❌ Netlify connection test failed:', error);
      
      // Errores específicos para Netlify/IPv6
      let errorMessage = error.message;
      
      if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
        errorMessage = `DNS resolution failed - probablemente IPv6 incompatibility en Netlify. Error original: ${error.message}`;
      } else if (error.message.includes('timeout')) {
        errorMessage = `Connection timeout en Netlify (${duration}ms). Prueba usar Supavisor Pooler.`;
      } else if (error.message.includes('ECONNREFUSED')) {
        errorMessage = `Connection refused - IPv6 address not reachable from Netlify.`;
      }
      
      return {
        success: false,
        error: errorMessage,
        details: {
          originalError: error.message,
          environment: env,
          duration,
          suggestedSolution: 'Use IPv4 Supavisor Pooler instead of Direct Connection'
        }
      };
    }
    
    console.log(`✅ Netlify Supabase connection successful (${duration}ms)`);
    
    return { 
      success: true, 
      details: { 
        environment: env, 
        duration,
        connectionType: env.isNetlify ? 'ipv4-pooler' : 'direct'
      } 
    };
    
  } catch (error) {
    console.error('❌ Critical Netlify connection error:', error);
    
    return {
      success: false,
      error: `Critical error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: { error }
    };
  }
}

// ============================================================================
// EXPORTAR CLIENTE PRINCIPAL
// ============================================================================

export const netlifySupabaseClient = createNetlifyCompatibleSupabaseClient();

// Reset para debugging
export function resetNetlifyClient() {
  console.log('🔄 Resetting Netlify Supabase client...');
  clientCache = null;
}

export default netlifySupabaseClient;