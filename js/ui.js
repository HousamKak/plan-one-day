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
  const timeFormatToggle = document.getElementById('time-format-toggle');
  const saveButton = document.querySelector('.btn-save');
  const presetSelect = document.getElementById('preset-select');
  const presetContainer = document.getElementById('preset-container');
  
  // Initialize storage
  const storage = new Storage();
  
  // Initialize timeline
  const timeline = new Timeline(gridElement);
  
  // Load initial state if available
  const initialState = storage.initialize();
  if (initialState) {
    timeline.deserialize(initialState);
    
    // Set toggle states
    wrapToggle.setAttribute('aria-pressed', initialState.isWrappingEnabled ? 'true' : 'false');
    overlapToggle.setAttribute('aria-pressed', initialState.allowOverlap ? 'true' : 'false');
    timeFormatToggle.setAttribute('aria-pressed', !initialState.use24HourFormat ? 'true' : 'false');
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
  wrapToggle.addEventListener('click', () => {
    const isCurrentlyEnabled = wrapToggle.getAttribute('aria-pressed') === 'true';
    const newState = !isCurrentlyEnabled;
    
    wrapToggle.setAttribute('aria-pressed', newState ? 'true' : 'false');
    timeline.setWrappingEnabled(newState);
  });
  
  // Overlap toggle
  overlapToggle.addEventListener('click', () => {
    const isCurrentlyEnabled = overlapToggle.getAttribute('aria-pressed') === 'true';
    const newState = !isCurrentlyEnabled;
    
    overlapToggle.setAttribute('aria-pressed', newState ? 'true' : 'false');
    timeline.setOverlapAllowed(newState);
  });
  
  // Time format toggle (12h/24h)
  timeFormatToggle.addEventListener('click', () => {
    const isCurrently12Hour = timeFormatToggle.getAttribute('aria-pressed') === 'true';
    const newState = !isCurrently12Hour;
    
    timeFormatToggle.setAttribute('aria-pressed', newState ? 'true' : 'false');
    timeline.setTimeFormat(!newState); // true for 24h, false for 12h
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
  
  // Listen for preset updates to add delete buttons
  document.addEventListener('presets:updated', (event) => {
    updatePresetsWithDeleteButtons(event.detail.presets, timeline, storage);
  });
  
  // Trigger initial population of preset UI with delete buttons
  const initialPresets = storage.getPresets();
  updatePresetsWithDeleteButtons(initialPresets, timeline, storage);
  
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
 * Updates the preset selector to include delete buttons
 * @param {Array} presets - Array of preset objects
 * @param {Timeline} timeline - Timeline instance
 * @param {Storage} storage - Storage instance
 */
function updatePresetsWithDeleteButtons(presets, timeline, storage) {
  if (!presets || !Array.isArray(presets)) return;
  
  // Get the DOM elements
  const presetContainer = document.getElementById('preset-container');
  const presetSelect = document.getElementById('preset-select');
  
  // Create a custom dropdown with delete buttons
  let customContainer = document.querySelector('.custom-preset-container');
  let presetButton = document.querySelector('.preset-button');
  
  if (!customContainer) {
    // Create a container for the custom dropdown
    customContainer = document.createElement('div');
    customContainer.className = 'custom-preset-container';
    customContainer.style.position = 'absolute';
    customContainer.style.top = '100%';
    customContainer.style.left = '0';
    customContainer.style.width = '100%';
    customContainer.style.backgroundColor = 'var(--neumorph-bg)';
    customContainer.style.border = 'none';
    customContainer.style.borderRadius = 'var(--neumorph-border-radius)';
    customContainer.style.boxShadow = 'var(--neumorph-shadow-distance) var(--neumorph-shadow-distance) calc(var(--neumorph-shadow-distance) * 2) var(--neumorph-shadow-dark), calc(-1 * var(--neumorph-shadow-distance)) calc(-1 * var(--neumorph-shadow-distance)) calc(var(--neumorph-shadow-distance) * 2) var(--neumorph-light)';
    customContainer.style.zIndex = '50';
    customContainer.style.maxHeight = '200px';
    // Only show scrollbar when needed (after 3 items)
    customContainer.style.overflowY = presets.length > 3 ? 'auto' : 'hidden';
    customContainer.style.display = 'none';
    
    // Add it to the preset container
    presetContainer.appendChild(customContainer);
    
    // Replace select with a button that shows the custom dropdown
    presetButton = document.createElement('button');
    presetButton.className = 'preset-button';
    presetButton.style.width = '150px'; // Make wider
    presetButton.style.textAlign = 'left';
    presetButton.style.padding = '0.375rem 0.75rem';
    presetButton.style.border = 'none'; // No border for neomorphic style
    presetButton.style.borderRadius = 'var(--neumorph-border-radius)';
    presetButton.style.backgroundColor = 'var(--neumorph-bg)';
    presetButton.style.cursor = 'pointer';
    presetButton.textContent = 'Load'; // Simplified label
    
    // Hide the original select and insert the button
    presetSelect.style.display = 'none';
    presetContainer.insertBefore(presetButton, presetSelect);
    
    // Button click handler
    presetButton.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = customContainer.style.display === 'block';
      customContainer.style.display = isVisible ? 'none' : 'block';
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!presetContainer.contains(e.target)) {
        customContainer.style.display = 'none';
      }
    });
  } else {
    // Update scrollbar visibility based on item count
    customContainer.style.overflowY = presets.length > 3 ? 'auto' : 'hidden';
  }
  
  // Clear existing items
  customContainer.innerHTML = '';
  
  // Add "no presets" message if empty
  if (presets.length === 0) {
    const noPresets = document.createElement('div');
    noPresets.className = 'preset-item';
    noPresets.style.padding = '0.5rem';
    noPresets.style.color = 'var(--light-text)';
    noPresets.textContent = 'No saved presets';
    customContainer.appendChild(noPresets);
    return;
  }
  
  // Add items for each preset
  presets.forEach(preset => {
    const item = document.createElement('div');
    item.className = 'preset-item';
    item.style.display = 'flex';
    item.style.justifyContent = 'space-between';
    item.style.alignItems = 'center';
    item.style.padding = '0.5rem 0.75rem';
    item.style.cursor = 'pointer';
    item.style.borderBottom = '1px solid var(--border-color)';
    item.style.backgroundColor = 'var(--neumorph-bg)';
    item.style.transition = 'all var(--transition-speed) ease';
    
    // Preset name
    const nameSpan = document.createElement('span');
    nameSpan.textContent = preset.name;
    item.appendChild(nameSpan);
    
    // Delete button
    const deleteButton = document.createElement('button');
    deleteButton.className = 'preset-delete';
    deleteButton.setAttribute('aria-label', `Delete preset ${preset.name}`);
    deleteButton.style.background = 'none';
    deleteButton.style.border = 'none';
    deleteButton.style.color = 'var(--error-color)';
    deleteButton.style.cursor = 'pointer';
    deleteButton.style.padding = '0.25rem';
    
    // Add trash icon
    const trashTemplate = document.getElementById('trash-icon-template');
    const trashIcon = trashTemplate.content.cloneNode(true).querySelector('svg');
    deleteButton.appendChild(trashIcon);
    
    // Add delete event
    deleteButton.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (confirm(`Are you sure you want to delete the preset "${preset.name}"?`)) {
        if (storage.deletePreset(preset.name)) {
          showToast(`Preset "${preset.name}" deleted`);
          // Update UI immediately after deletion
          const updatedPresets = storage.getPresets();
          updatePresetsWithDeleteButtons(updatedPresets, timeline, storage);
        } else {
          showToast('Error deleting preset');
        }
      }
    });
    
    item.appendChild(deleteButton);
    
    // Add neomorphic hover effect
    item.addEventListener('mouseenter', () => {
      item.style.backgroundColor = 'var(--neumorph-light)';
    });
    
    item.addEventListener('mouseleave', () => {
      item.style.backgroundColor = 'var(--neumorph-bg)';
    });
    
    // Add click event to load preset
    item.addEventListener('click', (e) => {
      if (e.target !== deleteButton && !deleteButton.contains(e.target)) {
        loadPreset(preset.name, timeline, storage);
        customContainer.style.display = 'none';
      }
    });
    
    customContainer.appendChild(item);
  });
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
    document.getElementById('wrap-toggle').setAttribute('aria-pressed', presetData.isWrappingEnabled ? 'true' : 'false');
    document.getElementById('overlap-toggle').setAttribute('aria-pressed', presetData.allowOverlap ? 'true' : 'false');
    document.getElementById('time-format-toggle').setAttribute('aria-pressed', !presetData.use24HourFormat ? 'true' : 'false');
    
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
export { init, showToast, loadPreset, updatePresetsWithDeleteButtons };