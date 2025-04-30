/**
 * Module for timeline UI functionality
 */
import { openBlockModal } from './Modal.js';
import { initContextMenu } from './ContextMenu.js';

/**
 * Initializes the timeline UI elements
 * @param {Object} timeline - Timeline instance
 */
export function initTimelineUI(timeline) {
  // Initialize hour markers
  initializeHourMarkers(timeline.use24HourFormat);
  
  // Initialize context menu
  initContextMenu(timeline);
  
  // Listen for block creation requests
  document.addEventListener('timeline:create-block', (event) => {
    openBlockModal(event.detail.startHour, timeline);
  });
  
  // Listen for time format changes
  document.addEventListener('timeline:format-changed', (event) => {
    initializeHourMarkers(event.detail.use24HourFormat);
  });
}

/**
 * Initializes the timeline hour markers
 * @param {boolean} use24HourFormat - Whether to use 24-hour format
 */
export function initializeHourMarkers(use24HourFormat) {
  const hoursContainer = document.querySelector('.timeline-hours');
  const timelineGrid = document.querySelector('.timeline-grid');
  
  if (!hoursContainer || !timelineGrid) {
    console.error('Timeline containers not found');
    return;
  }
  
  // Clear existing content
  hoursContainer.innerHTML = '';
  
  // Remove any existing tick marks
  const existingTicks = document.querySelectorAll('.hour-tick');
  existingTicks.forEach(tick => tick.remove());
  
  // Create a container for tick marks if it doesn't exist
  let tickContainer = document.querySelector('.timeline-ticks');
  if (!tickContainer) {
    tickContainer = document.createElement('div');
    tickContainer.className = 'timeline-ticks';
    tickContainer.style.position = 'absolute';
    tickContainer.style.top = '0';
    tickContainer.style.left = '0';
    tickContainer.style.right = '0';
    tickContainer.style.height = '100%';
    tickContainer.style.pointerEvents = 'none';
    tickContainer.style.zIndex = '1';
    
    // Insert before the timeline grid to ensure it's behind blocks
    timelineGrid.parentNode.insertBefore(tickContainer, timelineGrid);
  }
  
  // Add hour markers and ticks (for 24 hours)
  for (let i = 0; i <= 24; i++) {
    // Create hour marker
    const hourMarker = document.createElement('div');
    hourMarker.classList.add('hour-marker');
    
    // Position each marker at the correct percentage
    hourMarker.style.position = 'absolute';
    hourMarker.style.left = `${(i / 24) * 100}%`;
    hourMarker.style.transform = 'translateX(-50%)'; // Center on the tick position
    
    // Format the hour based on current time format setting
    const hour = i % 24; // Convert 24 to 0
    
    if (use24HourFormat) {
      hourMarker.textContent = `${hour}h`;
    } else {
      // Adjust the hour marker formatting to include a space and smaller font for AM/PM
      const hour12 = hour % 12 || 12; // Convert 0 to 12 for 12 AM
      const period = hour >= 12 ? 'PM' : 'AM';
      const periodSpan = document.createElement('span');
      periodSpan.style.fontSize = 'smaller';
      periodSpan.textContent = period;
      hourMarker.innerHTML = `${hour12} `;
      hourMarker.appendChild(periodSpan);
    }
    
    hoursContainer.appendChild(hourMarker);
    
    // Create tick mark for each hour (not the final 24th hour since it's the same as 0)
    if (i < 24) {
      const tick = document.createElement('div');
      tick.className = 'hour-tick';
      tick.style.position = 'absolute';
      tick.style.left = `${(i / 24) * 100}%`;
      tick.style.top = '0';
      tick.style.bottom = '0';
      tick.style.width = '1px';
      tick.style.backgroundColor = 'rgba(200, 200, 200, 0.3)';
      tick.style.pointerEvents = 'none';
      
      // Add half-hour tick marks (smaller)
      const halfTick = document.createElement('div');
      halfTick.className = 'half-hour-tick';
      halfTick.style.position = 'absolute';
      halfTick.style.left = `${((i + 0.5) / 24) * 100}%`;
      halfTick.style.top = '25%';
      halfTick.style.bottom = '25%';
      halfTick.style.width = '1px';
      halfTick.style.backgroundColor = 'rgba(200, 200, 200, 0.2)';
      halfTick.style.pointerEvents = 'none';
      
      tickContainer.appendChild(tick);
      tickContainer.appendChild(halfTick);
    }
  }
}

/**
 * Shows a confirmation dialog with improved styling
 * @param {string} message - Message to display
 * @returns {Promise<boolean>} - Promise that resolves to true (confirm) or false (cancel)
 */
export function showConfirmDialog(message) {
  return new Promise((resolve) => {
    // Create dialog element
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog-backdrop';
    dialog.innerHTML = `
      <div class="confirm-dialog">
        <p>${message}</p>
        <div class="confirm-dialog-buttons">
          <button class="cancel-btn">Cancel</button>
          <button class="confirm-btn">Confirm</button>
        </div>
      </div>
    `;
    
    // Add to DOM
    document.body.appendChild(dialog);
    
    // Get button elements
    const cancelBtn = dialog.querySelector('.cancel-btn');
    const confirmBtn = dialog.querySelector('.confirm-btn');
    
    // Focus the cancel button (safer default)
    setTimeout(() => cancelBtn.focus(), 10);
    
    // Event handlers
    function handleCancel() {
      document.body.removeChild(dialog);
      resolve(false);
    }
    
    function handleConfirm() {
      document.body.removeChild(dialog);
      resolve(true);
    }
    
    function handleKeydown(e) {
      if (e.key === 'Escape') {
        handleCancel();
      } else if (e.key === 'Enter' && document.activeElement === confirmBtn) {
        handleConfirm();
      }
    }
    
    // Add event listeners
    cancelBtn.addEventListener('click', handleCancel);
    confirmBtn.addEventListener('click', handleConfirm);
    dialog.addEventListener('keydown', handleKeydown);
    
    // Close on backdrop click
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        handleCancel();
      }
    });
  });
}