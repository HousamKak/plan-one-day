/**
 * Module for handling toolbar buttons and actions
 */
import { showToast } from './Toast.js';
import { initPresetManager } from './PresetManager.js';

/**
 * Initializes toolbar elements and their event handlers
 * @param {Object} timeline - Timeline instance
 * @param {Object} storage - Storage instance
 */
export function initToolbar(timeline, storage) {
  // Get toolbar elements
  const clearButton = document.querySelector('.btn-clear');
  const shuffleButton = document.querySelector('.btn-shuffle');
  const wrapToggle = document.getElementById('wrap-toggle');
  const overlapToggle = document.getElementById('overlap-toggle');
  const timeFormatToggle = document.getElementById('time-format-toggle');
  
  if (!clearButton || !shuffleButton || !wrapToggle || !overlapToggle || !timeFormatToggle) {
    console.error('Toolbar elements not found');
    return;
  }
  
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

    updateToggleState(wrapToggle, newState);
    timeline.setWrappingEnabled(newState);
  });
  
  // Overlap toggle
  overlapToggle.addEventListener('click', () => {
    const isCurrentlyEnabled = overlapToggle.getAttribute('aria-pressed') === 'true';
    const newState = !isCurrentlyEnabled;

    updateToggleState(overlapToggle, newState);
    timeline.setOverlapAllowed(newState);
  });
  
  // Time format toggle (12h/24h)
  timeFormatToggle.addEventListener('click', () => {
    const isCurrently12Hour = timeFormatToggle.getAttribute('aria-pressed') === 'true';
    const newState = !isCurrently12Hour;
    
    updateToggleState(timeFormatToggle, newState);
    timeline.setTimeFormat(!newState); // true for 24h, false for 12h
  });
  
  // Initialize preset manager
  initPresetManager(timeline, storage);
}

/**
 * Updates the visual state of a toggle button
 * @param {HTMLElement} button - The toggle button element
 * @param {boolean} state - New state (true=active, false=inactive)
 */
function updateToggleState(button, state) {
  // Update ARIA attribute
  button.setAttribute('aria-pressed', state ? 'true' : 'false');
  
  // Update visual appearance
  if (state) {
    button.classList.add('active');
  } else {
    button.classList.remove('active');
  }
  
  // Apply specific styling based on button type
  if (button.id === 'time-format-toggle') {
    // Time format toggle has special styling needs
    const formatText = state ? '12h' : '24h';
    const formatTextElement = button.querySelector('.format-text');
    const tooltip = button.querySelector('.tooltip');

    if (formatTextElement) {
      formatTextElement.textContent = formatText;
    }

    if (tooltip) {
      tooltip.textContent = `Switch to ${state ? '24h' : '12h'} Format`;
    }
  }
}

/**
 * Adds a new custom toolbar button
 * @param {Object} options - Button configuration
 * @param {string} options.icon - SVG icon markup
 * @param {string} options.label - Button label for tooltip and aria-label
 * @param {Function} options.onClick - Click handler function
 * @param {string} options.id - Optional button ID
 * @param {string} options.position - Optional position ('start' or 'end')
 * @returns {HTMLElement} - The created button element
 */
export function addToolbarButton(options) {
  const { icon, label, onClick, id, position = 'end' } = options;
  
  if (!icon || !label || typeof onClick !== 'function') {
    console.error('Invalid toolbar button configuration');
    return null;
  }
  
  const toolbar = document.querySelector('.toolbar');
  if (!toolbar) {
    console.error('Toolbar element not found');
    return null;
  }
  
  // Create button element
  const button = document.createElement('button');
  button.className = 'toolbar-button';
  button.setAttribute('aria-label', label);
  button.setAttribute('title', label);
  
  if (id) {
    button.id = id;
  }
  
  // Add icon
  button.innerHTML = icon;
  
  // Add tooltip
  const tooltip = document.createElement('span');
  tooltip.className = 'tooltip';
  tooltip.textContent = label;
  button.appendChild(tooltip);
  
  // Add click handler
  button.addEventListener('click', onClick);
  
  // Add button to toolbar at specified position
  if (position === 'start') {
    toolbar.insertBefore(button, toolbar.firstChild);
  } else {
    // Find the preset-controls element if it exists
    const presetControls = toolbar.querySelector('.preset-controls');
    
    if (presetControls) {
      // Insert before preset controls for 'end' position
      toolbar.insertBefore(button, presetControls);
    } else {
      // Append to the end if preset controls not found
      toolbar.appendChild(button);
    }
  }
  
  return button;
}