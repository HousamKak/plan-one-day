/**
 * Utility functions for input validation
 */

/**
 * Validates that a value is defined and not null
 * @param {*} value - Value to check
 * @param {string} name - Parameter name for error message
 * @throws {Error} If value is undefined or null
 */
export function validateRequired(value, name) {
    if (value === undefined || value === null) {
      throw new Error(`${name} is required`);
    }
  }
  
  /**
   * Validates that a value is a string
   * @param {*} value - Value to check
   * @param {string} name - Parameter name for error message
   * @throws {TypeError} If value is not a string
   */
  export function validateString(value, name) {
    if (typeof value !== 'string') {
      throw new TypeError(`${name} must be a string`);
    }
  }
  
  /**
   * Validates that a value is a non-empty string
   * @param {*} value - Value to check
   * @param {string} name - Parameter name for error message
   * @throws {TypeError|Error} If value is not a string or is empty
   */
  export function validateNonEmptyString(value, name) {
    validateString(value, name);
    if (value.trim() === '') {
      throw new Error(`${name} cannot be empty`);
    }
  }
  
  /**
   * Validates that a value is a number
   * @param {*} value - Value to check
   * @param {string} name - Parameter name for error message
   * @throws {TypeError} If value is not a number or is NaN
   */
  export function validateNumber(value, name) {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new TypeError(`${name} must be a number`);
    }
  }
  
  /**
   * Validates that a value is a positive number
   * @param {*} value - Value to check
   * @param {string} name - Parameter name for error message
   * @param {boolean} includeZero - Whether to allow zero (default: false)
   * @throws {TypeError|Error} If value is not a number or is not positive
   */
  export function validatePositiveNumber(value, name, includeZero = false) {
    validateNumber(value, name);
    
    if (includeZero ? value < 0 : value <= 0) {
      throw new Error(`${name} must be ${includeZero ? 'greater than or equal to zero' : 'positive'}`);
    }
  }
  
  /**
   * Validates that a value is within a range
   * @param {*} value - Value to check
   * @param {string} name - Parameter name for error message
   * @param {number} min - Minimum allowed value (inclusive)
   * @param {number} max - Maximum allowed value (inclusive)
   * @throws {TypeError|Error} If value is not a number or is outside range
   */
  export function validateRange(value, name, min, max) {
    validateNumber(value, name);
    
    if (value < min || value > max) {
      throw new Error(`${name} must be between ${min} and ${max}`);
    }
  }
  
  /**
   * Validates a time value in hours (0-24 range)
   * @param {*} value - Value to check
   * @param {string} name - Parameter name for error message
   * @throws {TypeError|Error} If value is not a number or outside valid range
   */
  export function validateTimeHours(value, name) {
    validateNumber(value, name);
    
    if (value < 0 || value > 24) {
      throw new Error(`${name} must be between 0 and 24`);
    }
  }
  
  /**
   * Validates a duration value in hours (positive, non-zero)
   * @param {*} value - Value to check
   * @param {string} name - Parameter name for error message
   * @param {number} maxDuration - Maximum allowed duration (default: 24)
   * @throws {TypeError|Error} If value is not a valid duration
   */
  export function validateDuration(value, name, maxDuration = 24) {
    validatePositiveNumber(value, name);
    
    if (value > maxDuration) {
      throw new Error(`${name} cannot exceed ${maxDuration} hours`);
    }
  }
  
  /**
   * Validates a color string (hex format)
   * @param {*} value - Value to check
   * @param {string} name - Parameter name for error message
   * @throws {TypeError|Error} If value is not a valid hex color
   */
  export function validateHexColor(value, name) {
    validateString(value, name);
    
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!hexColorRegex.test(value)) {
      throw new Error(`${name} must be a valid hex color (e.g., #RRGGBB or #RGB)`);
    }
  }
  
  /**
   * Validates a color string (HSL format)
   * @param {*} value - Value to check
   * @param {string} name - Parameter name for error message
   * @throws {TypeError|Error} If value is not a valid HSL color
   */
  export function validateHslColor(value, name) {
    validateString(value, name);
    
    const hslColorRegex = /^hsl\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\)$/;
    if (!hslColorRegex.test(value)) {
      throw new Error(`${name} must be a valid HSL color (e.g., hsl(120, 50%, 50%))`);
    }
  }
  
  /**
   * Validates that a value is a DOM element
   * @param {*} value - Value to check
   * @param {string} name - Parameter name for error message
   * @param {Function} type - Element type constructor (default: HTMLElement)
   * @throws {TypeError} If value is not a DOM element
   */
  export function validateElement(value, name, type = HTMLElement) {
    if (!(value instanceof type)) {
      throw new TypeError(`${name} must be a ${type.name}`);
    }
  }
  
  /**
   * Validates an object against a schema
   * @param {Object} obj - Object to validate
   * @param {Object} schema - Validation schema (key -> validator function)
   * @throws {Error} If any validation fails
   */
  export function validateObject(obj, schema) {
    if (typeof obj !== 'object' || obj === null) {
      throw new TypeError('Value must be an object');
    }
    
    for (const [key, validator] of Object.entries(schema)) {
      if (typeof validator !== 'function') {
        continue;
      }
      
      try {
        validator(obj[key], key);
      } catch (error) {
        throw new Error(`Invalid ${key}: ${error.message}`);
      }
    }
  }
  
  /**
   * Validates block data for timeline
   * @param {Object} data - Block data object
   * @throws {Error} If data is invalid
   */
  export function validateBlockData(data) {
    const schema = {
      id: (value, name) => {
        if (value !== undefined) {
          validateNonEmptyString(value, name);
        }
      },
      title: validateNonEmptyString,
      start: (value, name) => validateTimeHours(value, name),
      duration: (value, name) => validateDuration(value, name),
      color: (value, name) => {
        validateString(value, name);
        if (value.startsWith('#')) {
          validateHexColor(value, name);
        } else if (value.startsWith('hsl')) {
          validateHslColor(value, name);
        } else {
          throw new Error(`${name} must be a valid hex or HSL color`);
        }
      }
    };
    
    validateObject(data, schema);
  }