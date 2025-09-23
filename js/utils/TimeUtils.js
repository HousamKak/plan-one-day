/**
 * Utility functions for time formatting and calculations
 */

/**
 * Formats hours (decimal) to a time string in HH:MM format
 * @param {number} hours - Hours value (e.g., 14.5 for 2:30 PM)
 * @param {boolean} use24HourFormat - Whether to use 24-hour format (true) or 12-hour AM/PM format (false)
 * @returns {string} - Formatted time string
 */
export function formatTime(hours, use24HourFormat = true) {
    if (typeof hours !== 'number') {
      throw new TypeError('Hours must be a number');
    }
    
    // Handle negative hours or hours > 24 by normalizing to 0-24 range
    hours = hours % 24;
    if (hours < 0) hours += 24;
    
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
  
    if (use24HourFormat) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    } else {
      const period = h >= 12 ? 'PM' : 'AM';
      const hour12 = h % 12 || 12; // Convert 0 to 12 for 12 AM
      return `${hour12}:${m.toString().padStart(2, '0')} <span style='font-size: smaller;'>${period}</span>`;
    }
  }
  
  /**
   * Calculates duration between two time points in hours
   * @param {number} startHours - Start time in hours
   * @param {number} endHours - End time in hours
   * @param {boolean} allowWrap - Whether to allow wrapping around midnight
   * @returns {number} - Duration in hours
   */
  export function calculateDuration(startHours, endHours, allowWrap = true) {
    if (typeof startHours !== 'number' || typeof endHours !== 'number') {
      throw new TypeError('Start and end hours must be numbers');
    }
    
    // Normalize to 0-24 range
    startHours = startHours % 24;
    if (startHours < 0) startHours += 24;
    
    endHours = endHours % 24;
    if (endHours < 0) endHours += 24;
    
    // Calculate duration
    let duration;
    if (allowWrap && endHours < startHours) {
      // If end is before start, assume it's the next day (wrap around midnight)
      duration = (24 - startHours) + endHours;
    } else if (!allowWrap && endHours < startHours) {
      // If wrapping is not allowed and end is before start, return 0
      duration = 0;
    } else {
      // Normal case: end is after start
      duration = endHours - startHours;
    }
    
    return duration;
  }
  
  /**
   * Rounds time to the nearest quarter hour
   * @param {number} hours - Hours value to round
   * @returns {number} - Rounded hours value
   */
  export function roundToQuarterHour(hours) {
    if (typeof hours !== 'number') {
      throw new TypeError('Hours must be a number');
    }
    
    return Math.round(hours * 4) / 4;
  }
  
  /**
   * Converts a string time format (HH:MM) to decimal hours
   * @param {string} timeString - Time string in format "HH:MM" or "H:MM"
   * @returns {number} - Time in decimal hours
   */
  export function parseTimeString(timeString) {
    if (typeof timeString !== 'string') {
      throw new TypeError('Time string must be a string');
    }
    
    // Match format "HH:MM" or "H:MM"
    const match = timeString.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) {
      throw new Error('Invalid time format. Expected "HH:MM" or "H:MM"');
    }
    
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    
    if (hours >= 24) {
      throw new Error('Hours must be less than 24');
    }
    
    if (minutes >= 60) {
      throw new Error('Minutes must be less than 60');
    }
    
    return hours + (minutes / 60);
  }