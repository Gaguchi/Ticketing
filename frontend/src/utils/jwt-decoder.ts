/**
 * JWT Decoder Utility
 * Decode JWT tokens and extract expiration time
 */

export interface JWTPayload {
  exp?: number; // Expiration time (seconds since epoch)
  iat?: number; // Issued at time
  user_id?: number;
  username?: string;
  email?: string;
  [key: string]: any;
}

/**
 * Decode JWT token without verification (client-side only)
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    // JWT format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('Invalid JWT format');
      return null;
    }

    // Decode base64url encoded payload
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
}

/**
 * Get token expiration time in milliseconds
 */
export function getTokenExpiration(token: string): number | null {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return null;
  }

  // Convert from seconds to milliseconds
  return payload.exp * 1000;
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const expiration = getTokenExpiration(token);
  if (!expiration) {
    return true;
  }

  return Date.now() >= expiration;
}

/**
 * Get time until token expires (in milliseconds)
 */
export function getTimeUntilExpiration(token: string): number {
  const expiration = getTokenExpiration(token);
  if (!expiration) {
    return 0;
  }

  const timeRemaining = expiration - Date.now();
  return Math.max(0, timeRemaining);
}

/**
 * Check if token should be refreshed (less than 10 minutes until expiry)
 */
export function shouldRefreshToken(token: string, bufferMinutes = 10): boolean {
  const timeRemaining = getTimeUntilExpiration(token);
  const bufferMs = bufferMinutes * 60 * 1000;
  
  return timeRemaining > 0 && timeRemaining < bufferMs;
}

/**
 * Get time when token should be proactively refreshed
 * (10 minutes before expiration)
 */
export function getRefreshTime(token: string, bufferMinutes = 10): number {
  const expiration = getTokenExpiration(token);
  if (!expiration) {
    return 0;
  }

  const bufferMs = bufferMinutes * 60 * 1000;
  const refreshTime = expiration - bufferMs;
  
  return Math.max(0, refreshTime - Date.now());
}

export default {
  decodeJWT,
  getTokenExpiration,
  isTokenExpired,
  getTimeUntilExpiration,
  shouldRefreshToken,
  getRefreshTime,
};
