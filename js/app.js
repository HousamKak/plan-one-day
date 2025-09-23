/**
 * Main application entry point
 * Initializes the application and wires up all components
 */
import { Timeline } from './core/Timeline.js';
import { Storage } from './core/Storage.js';
import { initToolbar } from './ui/Toolbar.js';
import { initTimelineUI } from './ui/TimelineUI.js';
import { setupModalKeyboardHandling } from './ui/Modal.js';
import { initBackground } from './ui/background.js';

/**
 * Initialize the application
 */
function init() {
  // Get the main timeline grid element
  const gridElement = document.querySelector('.timeline-grid');
  
  // Initialize core components
  const storage = new Storage();
  const timeline = new Timeline(gridElement);
  
  // Initialize UI components
  initTimelineUI(timeline);
  initToolbar(timeline, storage);
  setupModalKeyboardHandling();
  
  // Initialize background images and dark mode toggle
  initBackground(['image.png', 'image2.webp', 'image3.jpg', 'image4.jpg', 'image5.webp']);
  
  // Load initial state if available
  const initialState = storage.initialize();
  if (initialState) {
    timeline.deserialize(initialState);
    
    // Set toggle states
    const wrapToggle = document.getElementById('wrap-toggle');
    const overlapToggle = document.getElementById('overlap-toggle');
    const timeFormatToggle = document.getElementById('time-format-toggle');
    
    if (wrapToggle) wrapToggle.setAttribute('aria-pressed', initialState.isWrappingEnabled ? 'true' : 'false');
    if (overlapToggle) overlapToggle.setAttribute('aria-pressed', initialState.allowOverlap ? 'true' : 'false');
    if (timeFormatToggle) timeFormatToggle.setAttribute('aria-pressed', !initialState.use24HourFormat ? 'true' : 'false');
  }
}

// Initialize the application on DOM load
document.addEventListener('DOMContentLoaded', init);

// Export for testing
export { init };