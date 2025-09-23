/**
 * Module for displaying toast notifications
 */

// Toast queue management
let toastContainer = null;
const MAX_TOASTS = 4; // Maximum number of toasts to show at once

// Debouncing for rapid identical notifications
const recentMessages = new Map(); // message -> timestamp
const DUPLICATE_THRESHOLD = 1000; // 1 second to consider duplicates

/**
 * Initializes the toast container if it doesn't exist
 */
function ensureToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

/**
 * Shows a toast notification
 * @param {string} message - Message to display
 * @param {Object} options - Toast options
 * @param {number} options.duration - Display duration in milliseconds (default: 3000)
 * @param {string} options.type - Toast type (default, success, error, warning)
 */
export function showToast(message, options = {}) {
    const {
      duration = 3000,
      type = 'default'
    } = options;

    // Validate inputs
    if (typeof message !== 'string' || !message.trim()) {
      console.error('Toast message must be a non-empty string');
      return;
    }

    if (typeof duration !== 'number' || duration <= 0) {
      console.error('Toast duration must be a positive number');
      return;
    }

    // Check for recent duplicate messages (debouncing)
    const now = Date.now();
    const messageKey = `${message}_${type}`;

    if (recentMessages.has(messageKey)) {
      const lastShown = recentMessages.get(messageKey);
      if (now - lastShown < DUPLICATE_THRESHOLD) {
        return; // Skip duplicate message within threshold
      }
    }

    // Update recent messages map
    recentMessages.set(messageKey, now);

    // Clean up old entries from recent messages map
    for (const [key, timestamp] of recentMessages.entries()) {
      if (now - timestamp > DUPLICATE_THRESHOLD) {
        recentMessages.delete(key);
      }
    }
    
    // Get template content
    const template = document.getElementById('toast-template');
    if (!template) {
      console.error('Toast template not found');
      return;
    }
    
    const toast = template.content.cloneNode(true).querySelector('.toast');
    
    // Set message
    toast.textContent = message;
    
    // Apply type-specific styles
    switch (type) {
      case 'success':
        toast.classList.add('toast-success');
        break;
      case 'error':
        toast.classList.add('toast-error');
        break;
      case 'warning':
        toast.classList.add('toast-warning');
        break;
      default:
        // No additional class for default type
        break;
    }
    
    // Add to toast container with strict limit enforcement
    const container = ensureToastContainer();

    // Enforce strict display limit - remove excess toasts immediately
    while (container.children.length >= MAX_TOASTS) {
      const oldestToast = container.firstElementChild;
      if (oldestToast) {
        clearTimeout(parseInt(oldestToast.dataset.timeoutId, 10));
        // Remove immediately without animation for rapid scenarios
        if (oldestToast.parentNode) {
          oldestToast.parentNode.removeChild(oldestToast);
        }
      } else {
        break; // Safety break if no children
      }
    }

    container.appendChild(toast);

    // Final safety check - enforce strict limit after adding
    setTimeout(() => {
      enforceDisplayLimit();
    }, 10);

    // Force a reflow to ensure transitions work
    toast.offsetHeight;

    // Apply visible class to start animation
    toast.classList.add('toast-visible');

    // Remove after specified duration
    const timeoutId = setTimeout(() => {
      removeToast(toast);
    }, duration);

    // Store timeout ID for possible early dismissal
    toast.dataset.timeoutId = timeoutId;
    
    // Add click event to dismiss toast
    toast.addEventListener('click', () => {
      clearTimeout(parseInt(toast.dataset.timeoutId, 10));
      removeToast(toast);
    });
    
    return toast;
  }
  
  /**
   * Removes a toast element with animation
   * @param {HTMLElement} toast - Toast element to remove
   */
  function removeToast(toast) {
    if (!toast || !toast.parentNode) return;

    // Start the fade out animation
    toast.classList.remove('toast-visible');
    toast.classList.add('toast-hiding');

    // Remove from DOM after animation completes
    toast.addEventListener('transitionend', () => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
        cleanupToastContainer();
      }
    }, { once: true });

    // Fallback in case the transition doesn't trigger
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
        cleanupToastContainer();
      }
    }, 300);
  }

  /**
   * Cleans up the toast container if it's empty
   */
  function cleanupToastContainer() {
    if (toastContainer && toastContainer.children.length === 0) {
      toastContainer.remove();
      toastContainer = null;
    }
  }
  
  /**
   * Gets the current number of active toasts
   * @returns {number} Number of active toasts
   */
  export function getActiveToastCount() {
    return toastContainer ? toastContainer.children.length : 0;
  }

  /**
   * Clears all active toasts
   * @param {boolean} immediate - If true, removes without animation
   */
  export function clearAllToasts(immediate = false) {
    if (toastContainer) {
      const toasts = Array.from(toastContainer.children);
      toasts.forEach(toast => {
        clearTimeout(parseInt(toast.dataset.timeoutId, 10));
        if (immediate) {
          // Remove immediately without animation
          if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
          }
        } else {
          removeToast(toast);
        }
      });

      if (immediate) {
        cleanupToastContainer();
      }
    }
  }

  /**
   * Ensures strict display limit by force-clearing excess toasts
   */
  function enforceDisplayLimit() {
    if (toastContainer && toastContainer.children.length > MAX_TOASTS) {
      const excess = toastContainer.children.length - MAX_TOASTS;
      const toastsToRemove = Array.from(toastContainer.children).slice(0, excess);

      toastsToRemove.forEach(toast => {
        clearTimeout(parseInt(toast.dataset.timeoutId, 10));
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      });
    }
  }
  
  /**
   * Show a success toast
   * @param {string} message - Message to display 
   * @param {Object} options - Toast options
   */
  export function showSuccessToast(message, options = {}) {
    return showToast(message, { ...options, type: 'success' });
  }
  
  /**
   * Show an error toast
   * @param {string} message - Message to display 
   * @param {Object} options - Toast options
   */
  export function showErrorToast(message, options = {}) {
    return showToast(message, { ...options, type: 'error' });
  }
  
  /**
   * Show a warning toast
   * @param {string} message - Message to display
   * @param {Object} options - Toast options
   */
  export function showWarningToast(message, options = {}) {
    return showToast(message, { ...options, type: 'warning' });
  }

  /**
   * Test function to demonstrate toast queue functionality
   * Creates multiple toasts with different types to test stacking
   */
  export function testToastQueue() {
    const messages = [
      { text: 'First toast message', type: 'default' },
      { text: 'Second toast (success)', type: 'success' },
      { text: 'Third toast (error)', type: 'error' },
      { text: 'Fourth toast (warning)', type: 'warning' },
      { text: 'Fifth toast should trigger queue limit (max 4)', type: 'default' },
      { text: 'Sixth toast (should remove oldest)', type: 'success' }
    ];

    messages.forEach((msg, index) => {
      setTimeout(() => {
        showToast(msg.text, { type: msg.type, duration: 5000 });
      }, index * 500);
    });
  }

  // Expose test function to global scope for debugging (development only)
  if (typeof window !== 'undefined') {
    window.testToastQueue = testToastQueue;
  }