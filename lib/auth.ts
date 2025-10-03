import bcrypt from 'bcryptjs';

// Configuración de seguridad
const SALT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutos

// Hash de la contraseña "llavita12$" pre-generado para mayor seguridad
const ADMIN_PASSWORD_HASH = '$2a$12$7vKjUz8tX3v9.GH2mq.6MuKLs6xCZq1OGF3tW4Jk9L.Qwe2R3t4U5v';

// Rate limiting storage (en producción usar Redis)
interface LoginAttempt {
  count: number;
  lastAttempt: number;
  lockedUntil?: number;
}

const loginAttempts = new Map<string, LoginAttempt>();

/**
 * Genera un hash seguro de una contraseña
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verifica una contraseña contra su hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * Obtiene el identificador del cliente (IP simplificada para desarrollo)
 */
function getClientId(request?: Request): string {
  // En producción usar la IP real del cliente
  // Por ahora usamos un identificador genérico para desarrollo
  return 'admin-session';
}

/**
 * Verifica si un cliente está bloqueado por demasiados intentos
 */
export function isClientLocked(clientId?: string): boolean {
  const id = clientId || getClientId();
  const attempt = loginAttempts.get(id);

  if (!attempt || !attempt.lockedUntil) {
    return false;
  }

  // Si el tiempo de bloqueo ha expirado, limpia el record
  if (Date.now() > attempt.lockedUntil) {
    loginAttempts.delete(id);
    return false;
  }

  return true;
}

/**
 * Registra un intento de login fallido
 */
export function recordFailedAttempt(clientId?: string): void {
  const id = clientId || getClientId();
  const now = Date.now();
  const attempt = loginAttempts.get(id);

  if (!attempt) {
    loginAttempts.set(id, {
      count: 1,
      lastAttempt: now
    });
    return;
  }

  // Incrementa el contador
  attempt.count++;
  attempt.lastAttempt = now;

  // Si excede el límite, bloquea el cliente
  if (attempt.count >= MAX_LOGIN_ATTEMPTS) {
    attempt.lockedUntil = now + LOCKOUT_TIME;
  }

  loginAttempts.set(id, attempt);
}

/**
 * Limpia los intentos de login después de un login exitoso
 */
export function clearLoginAttempts(clientId?: string): void {
  const id = clientId || getClientId();
  loginAttempts.delete(id);
}

/**
 * Autentica al usuario admin con protección contra fuerza bruta
 */
export async function authenticateAdmin(password: string, clientId?: string): Promise<{
  success: boolean;
  message: string;
  locked?: boolean;
  lockTimeRemaining?: number;
}> {
  const id = clientId || getClientId();

  // Verifica si el cliente está bloqueado
  if (isClientLocked(id)) {
    const attempt = loginAttempts.get(id);
    const timeRemaining = attempt?.lockedUntil ? Math.ceil((attempt.lockedUntil - Date.now()) / 1000 / 60) : 0;

    return {
      success: false,
      message: 'Demasiados intentos fallidos. Cuenta bloqueada temporalmente.',
      locked: true,
      lockTimeRemaining: timeRemaining
    };
  }

  // Verifica la contraseña
  const isValid = await verifyPassword(password, ADMIN_PASSWORD_HASH);

  if (isValid) {
    // Login exitoso - limpia intentos
    clearLoginAttempts(id);
    return {
      success: true,
      message: 'Autenticación exitosa'
    };
  } else {
    // Login fallido - registra intento
    recordFailedAttempt(id);

    const attempt = loginAttempts.get(id);
    const remainingAttempts = MAX_LOGIN_ATTEMPTS - (attempt?.count || 0);

    return {
      success: false,
      message: remainingAttempts > 0
        ? `Contraseña incorrecta. Te quedan ${remainingAttempts} intentos.`
        : 'Demasiados intentos fallidos. Cuenta bloqueada temporalmente.'
    };
  }
}

/**
 * Genera un token de sesión seguro (simplificado para desarrollo)
 */
export function generateSessionToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Valida un token de sesión
 */
export function validateSessionToken(token: string): boolean {
  // En producción implementar validación JWT completa
  // Por ahora validamos formato básico
  return typeof token === 'string' && token.length === 64 && /^[a-f0-9]+$/.test(token);
}

/**
 * Utility para obtener información de rate limiting
 */
export function getRateLimitInfo(clientId?: string): {
  attempts: number;
  maxAttempts: number;
  locked: boolean;
  lockTimeRemaining: number;
} {
  const id = clientId || getClientId();
  const attempt = loginAttempts.get(id);
  const locked = isClientLocked(id);

  let lockTimeRemaining = 0;
  if (locked && attempt?.lockedUntil) {
    lockTimeRemaining = Math.ceil((attempt.lockedUntil - Date.now()) / 1000 / 60);
  }

  return {
    attempts: attempt?.count || 0,
    maxAttempts: MAX_LOGIN_ATTEMPTS,
    locked,
    lockTimeRemaining
  };
}