/**
 * Utility functions for color operations and conversions
 */

/**
 * Converts HSL color string to hex
 * @param {string} hsl - HSL color string in format "hsl(H, S%, L%)"
 * @returns {string} - Hex color string
 */
export function hslToHex(hsl) {
    // Parse HSL values
    const match = hsl.match(/hsl\((\d+),\s*([\d.]+)%,\s*([\d.]+)%\)/);
    if (!match) return '#3a86ff'; // Default color if parsing fails
    
    let h = parseInt(match[1]);
    let s = parseFloat(match[2]) / 100;
    let l = parseFloat(match[3]) / 100;
    
    // HSL to RGB conversion
    let c = (1 - Math.abs(2 * l - 1)) * s;
    let x = c * (1 - Math.abs((h / 60) % 2 - 1));
    let m = l - c / 2;
    let r, g, b;
    
    if (h >= 0 && h < 60) {
      [r, g, b] = [c, x, 0];
    } else if (h >= 60 && h < 120) {
      [r, g, b] = [x, c, 0];
    } else if (h >= 120 && h < 180) {
      [r, g, b] = [0, c, x];
    } else if (h >= 180 && h < 240) {
      [r, g, b] = [0, x, c];
    } else if (h >= 240 && h < 300) {
      [r, g, b] = [x, 0, c];
    } else {
      [r, g, b] = [c, 0, x];
    }
    
    // Convert to hex
    r = Math.round((r + m) * 255).toString(16).padStart(2, '0');
    g = Math.round((g + m) * 255).toString(16).padStart(2, '0');
    b = Math.round((b + m) * 255).toString(16).padStart(2, '0');
    
    return `#${r}${g}${b}`;
  }
  
  /**
   * Converts hex color to HSL
   * @param {string} hex - Hex color string
   * @returns {string} - HSL color string
   */
  export function hexToHsl(hex) {
    // Remove # if present
    hex = hex.replace(/^#/, '');
    
    // Parse hex values
    let r = parseInt(hex.slice(0, 2), 16) / 255;
    let g = parseInt(hex.slice(2, 4), 16) / 255;
    let b = parseInt(hex.slice(4, 6), 16) / 255;
    
    // Find min and max values
    let max = Math.max(r, g, b);
    let min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
      h = s = 0; // achromatic
    } else {
      let d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      
      h = Math.round(h * 60);
    }
    
    s = Math.round(s * 100);
    l = Math.round(l * 100);
    
    return `hsl(${h}, ${s}%, ${l}%)`;
  }
  
  /**
   * Adjusts color brightness by the given percentage
   * @param {string} color - HSL color string
   * @param {number} percent - Percentage to lighten (positive) or darken (negative)
   * @returns {string} - Adjusted HSL color
   */
  export function adjustColorBrightness(color, percent) {
    // Parse HSL values
    const match = color.match(/hsl\((\d+),\s*([\d.]+)%,\s*([\d.]+)%\)/);
    if (!match) return color;
    
    let h = parseInt(match[1]);
    let s = parseFloat(match[2]);
    let l = parseFloat(match[3]);
    
    // Adjust lightness
    l = Math.min(100, Math.max(0, l + percent));
    
    return `hsl(${h}, ${s}%, ${l}%)`;
  }
  
  /**
   * Generates a random color in HSL format
   * @param {Object} options - Configuration options
   * @param {number} options.minSaturation - Minimum saturation (0-100)
   * @param {number} options.maxSaturation - Maximum saturation (0-100)
   * @param {number} options.minLightness - Minimum lightness (0-100)
   * @param {number} options.maxLightness - Maximum lightness (0-100)
   * @returns {string} - HSL color string
   */
  export function generateRandomColor(options = {}) {
    const {
      minSaturation = 65,
      maxSaturation = 75,
      minLightness = 45,
      maxLightness = 55
    } = options;
    
    const hue = Math.floor(Math.random() * 360);
    const saturation = minSaturation + Math.random() * (maxSaturation - minSaturation);
    const lightness = minLightness + Math.random() * (maxLightness - minLightness);
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }
  
  /**
   * Calculates a contrasting text color (black or white) based on background color
   * @param {string} backgroundColor - Background color in hex format
   * @returns {string} - Text color ('#ffffff' or '#000000')
   */
  export function getContrastTextColor(backgroundColor) {
    // Remove # if present
    const hex = backgroundColor.replace(/^#/, '');
    
    // Parse hex values
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    
    // Calculate luminance
    // Using the formula: 0.299*R + 0.587*G + 0.114*B
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return white for dark backgrounds and black for light backgrounds
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }