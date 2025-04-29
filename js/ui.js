/**
 * Main UI module that initializes the application
 * and wires up all components and event handlers
 */
import { Timeline } from './Timeline.js';
import { Storage } from './Storage.js';

/**
 * Initialize the application
 */
function init() {
  // Get DOM elements
  const gridElement = document.querySelector('.timeline-grid');
  const clearButton = document.querySelector('.btn-clear');
  const shuffleButton = document.querySelector('.btn-shuffle');
  const wrapToggle = document.getElementById('wrap-toggle');
  const overlapToggle = document.getElementById('overlap-toggle');
  const saveButton = document.querySelector('.btn-save');
  const presetSelect = document.getElementById('preset-select');
  
  // Initialize storage
  const storage = new Storage();
  
  // Initialize timeline
  const timeline = new Timeline(gridElement);
  
  // Load initial state if available
  const initialState = storage.initialize();
  if (initialState) {
    timeline.deserialize(initialState);
    wrapToggle.checked = initialState.isWrappingEnabled;
    overlapToggle.checked = initialState.allowOverlap;
  }
  
  // Event listeners for toolbar controls
  
  // Clear button
  clearButton.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear the timeline?')) {
      timeline.clearTimeline();
    }
  });
  
  // Shuffle button
  shuffleButton.addEventListener('click', () => {
    timeline.shuffleBlocks();
  });
  
  // Wrap toggle
  wrapToggle.addEventListener('change', () => {
    timeline.setWrappingEnabled(wrapToggle.checked);
  });
  
  // Overlap toggle
  overlapToggle.addEventListener('change', () => {
    timeline.setOverlapAllowed(overlapToggle.checked);
  });
  
  // Save preset button
  saveButton.addEventListener('click', () => {
    promptForPresetName(timeline, storage);
  });
  
  // Load preset select
  presetSelect.addEventListener('change', () => {
    const selectedValue = presetSelect.value;
    if (selectedValue) {
      loadPreset(selectedValue, timeline, storage);
      presetSelect.value = ''; // Reset select to default
    }
  });
  
  // Initialize keyboard a11y focus trap in modals
  initializeModalKeyboardHandling();
}

/**
 * Prompts user for a preset name and saves it
 * @param {Timeline} timeline - Timeline instance
 * @param {Storage} storage - Storage instance
 */
function promptForPresetName(timeline, storage) {
  const presetName = prompt('Enter a name for this preset:');
  
  if (presetName) {
    const timelineData = timeline.serialize();
    
    if (storage.savePreset(presetName, timelineData)) {
      showToast(`Preset "${presetName}" saved`);
    } else {
      showToast('Error saving preset');
    }
  }
}

/**
 * Loads a preset by name
 * @param {string} name - Preset name
 * @param {Timeline} timeline - Timeline instance
 * @param {Storage} storage - Storage instance
 */
function loadPreset(name, timeline, storage) {
  const presetData = storage.loadPreset(name);
  
  if (presetData) {
    timeline.deserialize(presetData);
    
    // Update toggle states to match loaded preset
    document.getElementById('wrap-toggle').checked = presetData.isWrappingEnabled || false;
    document.getElementById('overlap-toggle').checked = presetData.allowOverlap || false;
    
    showToast(`Preset "${name}" loaded`);
  } else {
    showToast('Error loading preset');
  }
}

/**
 * Shows a toast notification
 * @param {string} message - Message to display
 */
function showToast(message) {
  // Get template
  const template = document.getElementById('toast-template');
  const toast = template.content.cloneNode(true).querySelector('.toast');
  
  // Set message
  toast.textContent = message;
  
  // Add to DOM
  document.body.appendChild(toast);
  
  // Remove after animation
  setTimeout(() => {
    if (toast.parentNode) {
      document.body.removeChild(toast);
    }
  }, 3000);
}

/**
 * Initializes keyboard handlers for modal accessibility
 */
function initializeModalKeyboardHandling() {
  // Listen for any modal being added to the DOM
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.classList && node.classList.contains('modal')) {
          setupModalKeyboardTrap(node);
        }
      });
    });
  });
  
  // Start observing
  observer.observe(document.body, { childList: true });
}

/**
 * Sets up keyboard trap for modal accessibility
 * @param {HTMLElement} modal - Modal element
 */
function setupModalKeyboardTrap(modal) {
  // Find all focusable elements
  const focusableElements = modal.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  if (focusableElements.length === 0) return;
  
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  
  // Focus the first element
  firstElement.focus();
  
  // Handle keyboard navigation
  modal.addEventListener('keydown', (e) => {
    // Close on Escape
    if (e.key === 'Escape') {
      document.body.removeChild(modal);
      return;
    }
    
    // Tab trap
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  });
}

// Initialize the application on DOM load
document.addEventListener('DOMContentLoaded', init);

// Export for testing
export { init, showToast, loadPreset };