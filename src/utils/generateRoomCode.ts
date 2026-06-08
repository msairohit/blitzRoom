/**
 * Room code generator for BlitzRoom.
 * Generates 6-character uppercase alphanumeric codes.
 * Excludes confusing characters: 0/O, 1/I/L to avoid misreads.
 */

const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Generate a random room code.
 * @param length - Code length (default: 6)
 * @returns Uppercase alphanumeric code
 */
export function generateRoomCode(length: number = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CHARSET.charAt(Math.floor(Math.random() * CHARSET.length));
  }
  return code;
}

/**
 * Format a room code for display (e.g., "ABC-DEF").
 */
export function formatRoomCode(code: string): string {
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.length <= 3) return clean;
  return `${clean.slice(0, 3)}-${clean.slice(3)}`;
}

/**
 * Validate a room code format.
 */
export function isValidRoomCode(code: string): boolean {
  const clean = code.replace(/[^A-Z0-9]/gi, '');
  return clean.length === 6;
}
