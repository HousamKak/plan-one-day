/**
 * Utility functions for DOM manipulation
 */

/**
 * Creates an element with attributes and children
 * @param {string} tag - Element tag name
 * @param {Object} attributes - Element attributes
 * @param {Array|Node|string} children - Child elements or text content
 * @returns {HTMLElement} - Created element
 */
export function createElement(tag, attributes = {}, children = []) {
    if (typeof tag !== 'string') {
      throw new TypeError('Tag must be a string');
    }
    
    const element = document.createElement(tag);
    
    // Add attributes
    for (const [key, value] of Object.entries(attributes)) {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(element.style, value);
      } else if (key.startsWith('on') && typeof value === 'function') {
        const eventName = key.slice(2).toLowerCase();
        element.addEventListener(eventName, value);
      } else if (key === 'dataset' && typeof value === 'object') {
        Object.assign(element.dataset, value);
      } else {
        element.setAttribute(key, value);
      }
    }
    
    // Add children
    if (children) {
      if (Array.isArray(children)) {
        children.forEach(child => {
          if (child) {
            appendChild(element, child);
          }
        });
      } else {
        appendChild(element, children);
      }
    }
    
    return element;
  }
  
  /**
   * Appends a child to a parent element
   * @param {HTMLElement} parent - Parent element
   * @param {HTMLElement|string} child - Child element or text content
   */
  function appendChild(parent, child) {
    if (typeof child === 'string' || typeof child === 'number') {
      parent.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      parent.appendChild(child);
    }
  }
  
  /**
   * Creates an SVG element with attributes
   * @param {string} tag - SVG element tag name
   * @param {Object} attributes - Element attributes
   * @returns {SVGElement} - Created SVG element
   */
  export function createSvgElement(tag, attributes = {}) {
    const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
    
    for (const [key, value] of Object.entries(attributes)) {
      element.setAttribute(key, value);
    }
    
    return element;
  }
  
  /**
   * Removes all child elements from a parent element
   * @param {HTMLElement} element - Parent element to clear
   */
  export function clearElement(element) {
    if (!(element instanceof HTMLElement)) {
      throw new TypeError('Element must be an HTMLElement');
    }
    
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }
  
  /**
   * Gets an element by ID with type checking
   * @param {string} id - Element ID
   * @param {Function} type - Element type constructor (optional)
   * @returns {HTMLElement} - Element or null if not found
   * @throws {Error} - If element is not of expected type
   */
  export function getElementById(id, type = HTMLElement) {
    const element = document.getElementById(id);
    
    if (!element) {
      return null;
    }
    
    if (!(element instanceof type)) {
      throw new Error(`Element with ID "${id}" is not of expected type`);
    }
    
    return element;
  }
  
  /**
   * Adds or removes a class based on condition
   * @param {HTMLElement} element - Element to modify
   * @param {string} className - Class to toggle
   * @param {boolean} condition - Whether to add or remove the class
   */
  export function toggleClass(element, className, condition) {
    if (condition) {
      element.classList.add(className);
    } else {
      element.classList.remove(className);
    }
  }
  
  /**
   * Adds event listener that will be automatically removed when the element is removed
   * @param {HTMLElement} element - Element to add listener to
   * @param {string} eventType - Event type (e.g., 'click')
   * @param {Function} listener - Event listener function
   * @param {Object} options - Event listener options
   * @returns {Function} - Function to remove the listener
   */
  export function addManagedEventListener(element, eventType, listener, options = {}) {
    if (!(element instanceof EventTarget)) {
      throw new TypeError('Element must be an EventTarget');
    }
    
    element.addEventListener(eventType, listener, options);
    
    const remove = () => {
      element.removeEventListener(eventType, listener, options);
    };
    
    // Use MutationObserver to detect when element is removed from DOM
    if (element instanceof HTMLElement) {
      const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          if (mutation.type === 'childList') {
            mutation.removedNodes.forEach(node => {
              if (node === element || node.contains(element)) {
                remove();
                observer.disconnect();
              }
            });
          }
        });
      });
      
      // Start observing the document
      observer.observe(document.body, { childList: true, subtree: true });
    }
    
    return remove;
  }
  
  /**
   * Gets element position relative to another element or the document
   * @param {HTMLElement} element - Element to get position for
   * @param {HTMLElement|null} relativeTo - Element to get position relative to
   * @returns {Object} - Position {top, left, width, height}
   */
  export function getElementPosition(element, relativeTo = null) {
    if (!(element instanceof HTMLElement)) {
      throw new TypeError('Element must be an HTMLElement');
    }
    
    const rect = element.getBoundingClientRect();
    
    if (!relativeTo) {
      // Position relative to document
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      return {
        top: rect.top + scrollTop,
        left: rect.left + scrollLeft,
        width: rect.width,
        height: rect.height
      };
    }
    
    // Position relative to another element
    const relativeRect = relativeTo.getBoundingClientRect();
    
    return {
      top: rect.top - relativeRect.top,
      left: rect.left - relativeRect.left,
      width: rect.width,
      height: rect.height
    };
  }
  
  /**
   * Checks if an element is visible in the viewport
   * @param {HTMLElement} element - Element to check
   * @param {number} threshold - Visibility threshold (0-1)
   * @returns {boolean} - Whether element is visible
   */
  export function isElementInViewport(element, threshold = 0) {
    if (!(element instanceof HTMLElement)) {
      throw new TypeError('Element must be an HTMLElement');
    }
    
    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    const windowWidth = window.innerWidth || document.documentElement.clientWidth;
    
    // Calculate visible area
    const visibleHeight = Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0);
    const visibleWidth = Math.min(rect.right, windowWidth) - Math.max(rect.left, 0);
    const visibleArea = visibleHeight * visibleWidth;
    const elementArea = rect.width * rect.height;
    
    // Check if the visible area exceeds the threshold
    return visibleArea >= threshold * elementArea;
  }
  
  /**
   * Creates a debounced function
   * @param {Function} func - Function to debounce
   * @param {number} wait - Debounce wait time in milliseconds
   * @returns {Function} - Debounced function
   */
  export function debounce(func, wait) {
    let timeout;
    
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }