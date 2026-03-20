/**
 * Utility functions for request validation and parsing
 */

/**
 * Parse string to integer with default fallback
 */
export function parseInteger(value: string | number | undefined, defaultValue = 0): number {
  if (value === undefined || value === null) {
    return defaultValue;
  }

  const parsed = typeof value === 'string' ? parseInt(value, 10) : value;

  if (isNaN(parsed)) {
    return defaultValue;
  }

  return parsed;
}

/**
 * Check if value is a valid integer
 */
export function isInteger(value: string | number | undefined): boolean {
  if (value === undefined || value === null) {
    return false;
  }

  const parsed = typeof value === 'string' ? parseInt(value, 10) : value;

  return !isNaN(parsed) && Number.isInteger(parsed);
}

/**
 * Parse boolean value
 */
export function parseBoolean(value: string | boolean | undefined, defaultValue = false): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Sanitize string input (basic XSS prevention)
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate slug format
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

/**
 * Generate slug from string
 */
export function generateSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Paginate results
 */
export function paginate<T>(
  items: T[],
  page: number,
  pageSize: number
): {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
} {
  const total = items.length;
  const totalPages = Math.ceil(total / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  return {
    items: items.slice(startIndex, endIndex),
    total,
    page,
    pageSize,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

export default {
  parseInteger,
  isInteger,
  parseBoolean,
  sanitizeString,
  isValidSlug,
  generateSlug,
  paginate,
};
