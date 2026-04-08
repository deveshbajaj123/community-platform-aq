/**
 * Convert snake_case to camelCase
 */
const toCamelCase = (str) => {
  return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
};

/**
 * Transform object keys from snake_case to camelCase
 */
const transformKeys = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(transformKeys);
  if (typeof obj !== 'object') return obj;
  // Handle Date objects - return as ISO string for JSON serialization
  if (obj instanceof Date) return obj.toISOString();

  const transformed = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const camelKey = toCamelCase(key);
      transformed[camelKey] = transformKeys(obj[key]);
    }
  }
  return transformed;
};

/**
 * Transform array of objects from snake_case to camelCase
 */
const transformArray = (arr) => {
  if (!Array.isArray(arr)) return arr;
  return arr.map(transformKeys);
};

module.exports = {
  toCamelCase,
  transformKeys,
  transformArray
};
