/**
 * Module for displaying toast notifications
 */

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
    
    // Add to DOM
    document.body.appendChild(toast);
    
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
        document.body.removeChild(toast);
      }
    }, { once: true });
    
    // Fallback in case the transition doesn't trigger
    setTimeout(() => {
      if (toast.parentNode) {
        document.body.removeChild(toast);
      }
    }, 300);
  }
  
  /**
   * Updates all toast positions
   * Called when a new toast is added or removed
   * to ensure proper stacking
   */
  export function updateToastPositions() {
    const toasts = document.querySelectorAll('.toast');
    let offset = 20; // Initial offset from bottom
    
    toasts.forEach((toast) => {
      toast.style.bottom = `${offset}px`;
      offset += toast.offsetHeight + 10; // Add toast height plus gap
    });
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