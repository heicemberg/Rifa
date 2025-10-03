'use client';

import React, { useState, useEffect } from 'react';
import dynamicImport from 'next/dynamic';
import { authenticateAdmin, getRateLimitInfo, generateSessionToken } from '../../../lib/auth';

// Forzar renderizado dinámico para evitar prerenderización durante build
export const dynamic = 'force-dynamic';

// Importar AdminPanel dinámicamente para evitar prerenderización
const AdminPanel = dynamicImport(() => import('../../components/AdminPanel'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Cargando panel administrativo...</p>
      </div>
    </div>
  )
});

// ============================================================================
// PÁGINA DE ADMINISTRACIÓN SEGURA PARA RIFA SILVERADO Z71 2024
// ============================================================================

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminKey, setAdminKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [rateLimitInfo, setRateLimitInfo] = useState({
    attempts: 0,
    maxAttempts: 5,
    locked: false,
    lockTimeRemaining: 0
  });

  // Verificar si hay una sesión válida al cargar
  useEffect(() => {
    const savedToken = localStorage.getItem('admin_session_token');
    if (savedToken && savedToken.length === 64) {
      setSessionToken(savedToken);
      setIsAuthenticated(true);
    }

    // Actualizar información de rate limiting
    updateRateLimitInfo();
  }, []);

  const updateRateLimitInfo = () => {
    const info = getRateLimitInfo();
    setRateLimitInfo(info);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Verificar rate limiting antes del intento
      updateRateLimitInfo();
      if (rateLimitInfo.locked) {
        setError(`Cuenta bloqueada. Intenta en ${rateLimitInfo.lockTimeRemaining} minutos.`);
        setLoading(false);
        return;
      }

      // Intentar autenticación
      const result = await authenticateAdmin(adminKey);

      if (result.success) {
        // Generar token de sesión
        const token = generateSessionToken();
        setSessionToken(token);
        localStorage.setItem('admin_session_token', token);
        setIsAuthenticated(true);
        setAdminKey(''); // Limpiar contraseña del estado
      } else {
        setError(result.message);
        updateRateLimitInfo();
      }
    } catch (err) {
      setError('Error de autenticación. Inténtalo de nuevo.');
      console.error('Auth error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_session_token');
    setSessionToken('');
    setIsAuthenticated(false);
    setAdminKey('');
    setError('');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow-md rounded-lg p-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">🔐 Acceso Administrativo</h1>
            <p className="text-sm text-gray-600 mt-2">Panel de control para la Rifa Silverado Z71</p>
            <p className="text-xs text-gray-500 mt-1">Sistema de autenticación seguro</p>
          </div>

          {/* Mostrar información de rate limiting si hay intentos fallidos */}
          {rateLimitInfo.attempts > 0 && (
            <div className={`mb-4 p-3 rounded-lg ${rateLimitInfo.locked ? 'bg-red-100 border border-red-300' : 'bg-yellow-100 border border-yellow-300'}`}>
              <p className={`text-sm ${rateLimitInfo.locked ? 'text-red-700' : 'text-yellow-700'}`}>
                {rateLimitInfo.locked
                  ? `🚨 Cuenta bloqueada por ${rateLimitInfo.lockTimeRemaining} minutos`
                  : `⚠️ Intentos fallidos: ${rateLimitInfo.attempts}/${rateLimitInfo.maxAttempts}`
                }
              </p>
            </div>
          )}

          {/* Mostrar errores */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
              <p className="text-sm text-red-700">🚫 {error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Clave de administrador:
              </label>
              <input
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ingresa la clave segura..."
                required
                disabled={rateLimitInfo.locked || loading}
              />
            </div>
            <button
              type="submit"
              disabled={rateLimitInfo.locked || loading}
              className={`w-full py-2 rounded-lg transition-colors ${
                rateLimitInfo.locked || loading
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {loading ? '🔄 Verificando...' : '🔐 Iniciar Sesión'}
            </button>
          </form>

          <div className="mt-4 p-3 bg-green-100 rounded-lg">
            <p className="text-xs text-green-700 text-center">
              🛡️ Sistema protegido con bcrypt + rate limiting
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Botón de cerrar sesión flotante */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-lg"
        >
          🔓 Cerrar Sesión
        </button>
      </div>
      
      {/* Panel principal */}
      <AdminPanel />
    </div>
  );
}