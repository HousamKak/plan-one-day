/**
 * Timeline class responsible for managing blocks and handling timeline logic
 */
import { Block } from './Block.js';

export class Timeline {
  /**
   * Creates a new Timeline instance
   * @param {HTMLElement} gridElement - The timeline grid DOM element
   */
  constructor(gridElement) {
    // Validate input
    if (!gridElement || !(gridElement instanceof HTMLElement)) {
      throw new TypeError('Timeline requires a valid DOM element for the grid');
    }

    this.gridElement = gridElement;
    this.blocks = new Map(); // Map of block id -> Block instance
    this.isWrappingEnabled = false;
    this.allowOverlap = false;
    this.use24HourFormat = true; // Default to 24-hour format

    // Add a flag to track resize operations
    this.isResizeInProgress = false;
    this.resizeGracePeriodTimeout = null;
    this.resizeGracePeriodDuration = 500; // 500ms grace period

    // Initialize timeline hours
    this.initializeHourMarkers();

    // Set up click handler for block creation
    this.gridElement.addEventListener('click', this.handleGridClick.bind(this));

    // Listen for resize start and end events
    document.addEventListener('block:resize:start', (event) => {
      this.setResizeInProgress(true);

      // During resize, continuously update label positions
      const blockId = event.detail.blockId;
      const block = this.blocks.get(blockId);

      if (block && block.labelArrow) {
        // Create a function to update the label position during resize
        const updateLabelDuringResize = () => {
          if (this.isResizeInProgress && block.labelArrow) {
            const rect = block.element.getBoundingClientRect();
            const gridRect = this.gridElement.getBoundingClientRect();
            const blockCenter = rect.left + (rect.width / 2) - gridRect.left;

            // Update the center position
            block._naturalCenter = blockCenter;

            // Update the position based on the current position class
            if (block.labelArrow.classList.contains('label-arrow-top')) {
              block.positionLabel({ position: 'top' });
            } else {
              block.positionLabel({ position: 'bottom' });
            }

            // Continue updating while resizing
            if (this.isResizeInProgress) {
              requestAnimationFrame(updateLabelDuringResize);
            }
          }
        };

        // Start updating
        requestAnimationFrame(updateLabelDuringResize);
      }
    });

    document.addEventListener('block:resize:end', (event) => {
      // Update label positions immediately after resize
      setTimeout(() => {
        this.updateLabelPositions();
      }, 10);

      // Set grace period before allowing timeline clicks
      if (this.resizeGracePeriodTimeout) {
        clearTimeout(this.resizeGracePeriodTimeout);
      }

      this.resizeGracePeriodTimeout = setTimeout(() => {
        this.setResizeInProgress(false);
      }, this.resizeGracePeriodDuration);
    });

    // Add window resize listener to reposition labels
    window.addEventListener('resize', this.debounce(() => {
      this.updateLabelPositions();
    }, 150));
  }

  /**
   * Creates a debounced function that delays invoking func
   * @param {Function} func - Function to debounce
   * @param {number} wait - Milliseconds to delay
   * @returns {Function} - Debounced function
   */
  debounce(func, wait) {
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

  /**
   * Sets the resize in progress flag
   * @param {boolean} value - Whether resize is in progress
   */
  setResizeInProgress(value) {
    this.isResizeInProgress = value;

    // Update cursor style on grid to indicate state
    if (value) {
      this.gridElement.style.cursor = 'not-allowed';
    } else {
      this.gridElement.style.cursor = '';
    }
  }

  /**
   * Initializes the timeline hour markers
   */
  /**
 * Initializes the timeline hour markers
 */
  initializeHourMarkers() {
    const hoursContainer = document.querySelector('.timeline-hours');
    const timelineGrid = this.gridElement;

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

      if (this.use24HourFormat) {
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
        tick.style.bottom = '20px'; // Added space at the bottom to separate from numbers
        tick.style.width = '1px';
        tick.style.backgroundColor = 'rgba(200, 200, 200, 0.3)';
        tick.style.pointerEvents = 'none';

        // Add half-hour tick marks (smaller)
        const halfTick = document.createElement('div');
        halfTick.className = 'half-hour-tick';
        halfTick.style.position = 'absolute';
        halfTick.style.left = `${((i + 0.5) / 24) * 100}%`;
        halfTick.style.top = '10%';
        halfTick.style.bottom = '50px'; // Added space at the bottom to separate from numbers
        halfTick.style.width = '1px';
        halfTick.style.backgroundColor = 'rgba(200, 200, 200, 0.2)';
        halfTick.style.pointerEvents = 'none';

        tickContainer.appendChild(tick);
        tickContainer.appendChild(halfTick);
      }
    }

    // Adjust the hours container layout to absolute positioning
    hoursContainer.style.position = 'relative';
    hoursContainer.style.height = '25px';
    hoursContainer.style.marginTop = '40px'; // Increased for more space between ticks and numbers

    // Add CSS for timeline line that represents the full 24 hours
    const timelineLine = document.querySelector('.timeline-line');
    if (timelineLine) {
      timelineLine.style.width = '100%';
      timelineLine.style.left = '0';
    }
  }

  /**
   * Updates the time format and refreshes all displays
   * @param {boolean} use24Hour - Whether to use 24-hour format
   */
  setTimeFormat(use24Hour) {
    this.use24HourFormat = use24Hour;

    // Update hour markers
    this.initializeHourMarkers();

    // Update all blocks
    for (const block of this.blocks.values()) {
      block.setTimeFormat(use24Hour);
    }

    // Save current state
    this.saveCurrentState();
  }

  /**
   * Handles click on the timeline grid to create a new block
   * @param {MouseEvent} event - Click event
   */
  handleGridClick(event) {
    // Ignore if clicked on a block or resize handle
    if (event.target.closest('.block') ||
      event.target.closest('.block-resize-handle-left') ||
      event.target.closest('.block-resize-handle-right') ||
      this.isResizeInProgress) {
      return;
    }

    // Get the position of the timeline line
    const timelineRect = document.querySelector('.timeline-line').getBoundingClientRect();
    const clickY = event.clientY;

    // Only create a block if clicked within 20px of the timeline line
    if (Math.abs(clickY - (timelineRect.top + timelineRect.height / 2)) > 20) {
      return;
    }

    // Calculate click position in hours
    const rect = this.gridElement.getBoundingClientRect();
    const totalWidth = rect.width;
    const offsetX = event.clientX - rect.left;
    const clickHour = (offsetX / totalWidth) * 24;

    // Round to nearest 0.25 hour
    const startHour = Math.max(0, Math.min(24, Math.round(clickHour * 4) / 4));

    // Open creation modal
    this.openBlockModal(startHour);
  }

  /**
   * Opens the block creation/edit modal
   * @param {number} startHour - Starting hour for the new block
   * @param {string|null} blockId - ID of block to edit (null for creation)
   */
  openBlockModal(startHour, blockId = null) {
    // Get template content
    const template = document.getElementById('block-modal-template');
    const modal = template.content.cloneNode(true).querySelector('.modal');

    // Set title based on operation
    const modalTitle = modal.querySelector('h2');
    modalTitle.textContent = blockId ? 'Edit Block' : 'Create Block';

    // Get form elements
    const form = modal.querySelector('#block-form');
    const titleInput = modal.querySelector('#block-title');
    const durationInput = modal.querySelector('#block-duration');
    const colorInput = modal.querySelector('#block-color');
    const colorPreview = modal.querySelector('.color-preview');

    // Set values if editing
    if (blockId) {
      const block = this.blocks.get(blockId);
      if (block) {
        titleInput.value = block.title;
        durationInput.value = block.duration;
        const hexColor = this.hslToHex(block.color);
        colorInput.value = hexColor;
        colorPreview.style.backgroundColor = hexColor;
      }
    } else {
      // For new blocks, generate a color based on existing blocks
      const hexColor = this.generateColor();
      colorInput.value = hexColor;
      colorPreview.style.backgroundColor = hexColor;
    }

    // Add color input change handler
    colorInput.addEventListener('input', () => {
      colorPreview.style.backgroundColor = colorInput.value;
    });

    // Form submit handler
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const blockData = {
        title: titleInput.value,
        duration: parseFloat(durationInput.value),
        color: colorInput.value
      };

      if (blockId) {
        // Update existing block
        this.updateBlock(blockId, blockData);
      } else {
        // Create new block
        blockData.start = startHour;
        this.addBlock(blockData);
      }

      // Close modal
      document.body.removeChild(modal);

      // Update label positions after a short delay to ensure DOM is updated
      setTimeout(() => {
        this.updateLabelPositions();
      }, 100);
    });

    // Cancel button handler
    modal.querySelector('.cancel-btn').addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    // Append modal to body
    document.body.appendChild(modal);

    // Focus title input
    titleInput.focus();
  }

  /**
   * Adds a new block to the timeline
   * @param {Object} blockData - Block data without ID
   * @returns {string|null} - New block ID or null if conflict
   */
  addBlock(blockData) {
    // Generate a unique ID
    const id = this.generateUniqueId();

    // Create complete block data
    const completeData = {
      id,
      title: blockData.title,
      start: blockData.start,
      duration: blockData.duration,
      color: this.hexToHsl(blockData.color)
    };

    // Create block instance
    const block = new Block(completeData, this, this.isWrappingEnabled, this.use24HourFormat);

    // Check for conflicts if overlap is not allowed
    if (!this.allowOverlap && this.hasConflict(block)) {
      block.remove();
      this.showToast('Time conflict');
      return null;
    }

    // Add to collection and DOM
    this.blocks.set(id, block);
    this.gridElement.appendChild(block.element);

    // Save current state
    this.saveCurrentState();

    return id;
  }

  /**
   * Updates an existing block
   * @param {string} id - Block ID
   * @param {Object} data - Block data to update
   * @returns {boolean} - Success state
   */
  updateBlock(id, data) {
    const block = this.blocks.get(id);
    if (!block) return false;

    // Create a temporary copy to check for conflicts
    if (!this.allowOverlap &&
      ((data.start !== undefined && data.start !== block.start) ||
        (data.duration !== undefined && data.duration !== block.duration))) {

      const testBlock = new Block({
        id: 'temp-test',
        title: block.title,
        start: data.start !== undefined ? data.start : block.start,
        duration: data.duration !== undefined ? data.duration : block.duration,
        color: block.color
      }, this, this.isWrappingEnabled, this.use24HourFormat);

      // Check for conflicts excluding the block being updated
      const hasConflict = this.hasConflict(testBlock, id);
      testBlock.remove();

      if (hasConflict) {
        this.showToast('Time conflict');
        return false;
      }
    }

    // Convert color from hex to hsl if provided
    if (data.color && data.color.startsWith('#')) {
      data.color = this.hexToHsl(data.color);
    }

    // Update the block
    block.update(data);

    // Save current state
    this.saveCurrentState();

    return true;
  }

  /**
   * Removes a block from the timeline
   * @param {string} id - Block ID
   * @returns {boolean} - Success state
   */
  removeBlock(id) {
    const block = this.blocks.get(id);
    if (!block) return false;

    // Remove from DOM
    block.remove();

    // Remove from collection
    this.blocks.delete(id);

    // Save current state
    this.saveCurrentState();

    // Update label positions after a block is removed
    setTimeout(() => {
      this.updateLabelPositions();
    }, 50);

    return true;
  }

  /**
   * Duplicates a block
   * @param {string} id - Block ID
   * @returns {string|null} - New block ID or null if error
   */
  duplicateBlock(id) {
    const originalBlock = this.blocks.get(id);
    if (!originalBlock) return null;

    // Generate a unique ID
    const newId = this.generateUniqueId();

    // Get data for the new block
    const newBlockData = originalBlock.duplicate(newId);

    // Adjust start time to avoid overlaps if overlap is not allowed
    if (!this.allowOverlap) {
      this.adjustStartToAvoidConflicts(newBlockData);
    }

    // Create a new block instance
    const newBlock = new Block(newBlockData, this, this.isWrappingEnabled, this.use24HourFormat);

    // Add to collection and DOM
    this.blocks.set(newId, newBlock);
    this.gridElement.appendChild(newBlock.element);

    // Save current state
    this.saveCurrentState();

    // Update label positions after duplication
    setTimeout(() => {
      this.updateLabelPositions();
    }, 50);

    return newId;
  }

  /**
   * Edits an existing block
   * @param {string} id - Block ID
   */
  editBlock(id) {
    const block = this.blocks.get(id);
    if (!block) return;

    this.openBlockModal(block.start, id);
  }

  /**
   * Checks if a block has time conflicts with others
   * @param {Block} block - Block to check
   * @param {string|null} excludeId - ID of block to exclude from check (for updates)
   * @returns {boolean} - True if conflict exists
   */
  hasConflict(block, excludeId = null) {
    // Skip check if overlap is allowed or no blocks
    if (this.allowOverlap || this.blocks.size === 0) return false;

    for (const [id, existingBlock] of this.blocks.entries()) {
      // Skip the block itself if it's the one being updated
      if (id === excludeId || id === block.id) continue;

      // Check for overlap
      if (this.blocksOverlap(block, existingBlock)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Checks if two blocks overlap in time
   * @param {Block} a - First block
   * @param {Block} b - Second block
   * @returns {boolean} - True if blocks overlap
   */
  blocksOverlap(a, b) {
    if (!this.isWrappingEnabled) {
      // Standard overlap check
      const aEnd = a.start + a.duration;
      const bEnd = b.start + b.duration;

      return (a.start < bEnd && aEnd > b.start);
    } else {
      // Wrap-around overlap check requires modulo arithmetic
      // Convert to "minutes since midnight" for easier calculation
      const aStart = (a.start * 60) % 1440;
      const aEnd = (aStart + a.duration * 60) % 1440;
      const bStart = (b.start * 60) % 1440;
      const bEnd = (bStart + b.duration * 60) % 1440;

      // Handle special case where a block spans a full 24 hours
      if (a.duration >= 24 || b.duration >= 24) return true;

      // Check if either block wraps around midnight
      const aWraps = aEnd <= aStart;
      const bWraps = bEnd <= bStart;

      if (!aWraps && !bWraps) {
        // Neither block wraps, standard check
        return (aStart < bEnd && aEnd > bStart);
      } else if (aWraps && bWraps) {
        // Both blocks wrap, they must overlap
        return true;
      } else if (aWraps) {
        // A wraps, B doesn't
        return (bStart <= aEnd || bEnd > aStart);
      } else {
        // B wraps, A doesn't
        return (aStart <= bEnd || aEnd > bStart);
      }
    }
  }

  /**
   * Recursively adjusts start time to avoid conflicts
   * @param {Object} blockData - Block data to adjust
   */
  adjustStartToAvoidConflicts(blockData) {
    const testBlock = new Block({
      id: 'temp-adjust',
      title: blockData.title,
      start: blockData.start,
      duration: blockData.duration,
      color: blockData.color
    }, this, this.isWrappingEnabled, this.use24HourFormat);

    // Check for conflicts
    if (this.hasConflict(testBlock)) {
      // Adjust start time forward by 0.25 hours
      blockData.start = (blockData.start + 0.25) % 24;

      // If we've exceeded the timeline end and wrapping is disabled, stop
      if (!this.isWrappingEnabled && blockData.start + blockData.duration > 24) {
        blockData.start = 0;
      }

      // Remove test block
      testBlock.remove();

      // Recur to check again
      this.adjustStartToAvoidConflicts(blockData);
    } else {
      // No conflict, we're good to go
      testBlock.remove();
    }
  }

  /**
   * Updates the positions of all label arrows to avoid overlaps
   */
  updateLabelPositions() {
    // Get all visible label arrows
    const labels = Array.from(this.gridElement.querySelectorAll('.label-arrow'))
      .filter(label => label.style.display !== 'none');

    if (labels.length <= 1) return; // No need for collision detection with 0 or 1 label

    // Sort labels by their horizontal position (left to right)
    const sortedLabels = labels.sort((a, b) => {
      const aRect = a.getBoundingClientRect();
      const bRect = b.getBoundingClientRect();
      return aRect.left - bRect.left;
    });

    // Assign alternating positions (top/bottom)
    sortedLabels.forEach((label, index) => {
      const blockId = label.getAttribute('data-block-id');
      const block = this.blocks.get(blockId);

      if (block) {
        // Simple alternating pattern - even indices go top, odd go bottom
        const position = index % 2 === 0 ? 'top' : 'bottom';
        block.positionLabel({ position });
      }
    });
  }

 /**
 * Enhanced version of shuffleBlocks with multiple arrangement strategies
 * Replaces the original shuffleBlocks method in Timeline.js
 */
shuffleBlocks() {
  if (this.blocks.size === 0) return;

  // Create modal to select shuffling strategy
  this.openShuffleStrategyModal();
}

/**
 * Opens modal to select a shuffling strategy
 */
openShuffleStrategyModal() {
  // Create modal from HTML
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h2>Shuffle Strategy</h2>
      <p>Choose how you want to arrange your time blocks:</p>
      
      <div class="strategy-options">
        <button class="strategy-btn" data-strategy="random">
          <strong>Random</strong>
          <span>Completely randomize block order</span>
        </button>
        
        <button class="strategy-btn" data-strategy="compact">
          <strong>Compact</strong>
          <span>Minimize gaps between blocks</span>
        </button>
        
        <button class="strategy-btn" data-strategy="spread">
          <strong>Evenly Distributed</strong>
          <span>Spread blocks throughout the day</span>
        </button>
        
        <button class="strategy-btn" data-strategy="clustered">
          <strong>Clustered</strong>
          <span>Group similar blocks together</span>
        </button>
        
        <button class="strategy-btn" data-strategy="timeOfDay">
          <strong>Time-of-Day Optimized</strong>
          <span>Place blocks in morning/afternoon/evening periods</span>
        </button>
      </div>
      
      <div class="form-buttons">
        <button type="button" class="cancel-btn">Cancel</button>
      </div>
    </div>
  `;

  // Style the strategy options
  const style = document.createElement('style');
  style.textContent = `
    .strategy-options {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin: 20px 0;
    }
    
    .strategy-btn {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      padding: 12px 15px;
      background-color: var(--neumorph-bg);
      border: none;
      border-radius: var(--neumorph-border-radius);
      cursor: pointer;
      transition: all var(--transition-speed) ease;
      text-align: left;
      box-shadow: 
        var(--neumorph-shadow-distance) var(--neumorph-shadow-distance)
        calc(var(--neumorph-shadow-distance) * 2) var(--neumorph-shadow-dark),
        calc(-1 * var(--neumorph-shadow-distance)) calc(-1 * var(--neumorph-shadow-distance))
        calc(var(--neumorph-shadow-distance) * 2) var(--neumorph-light);
    }
    
    .strategy-btn:hover {
      background-color: var(--neumorph-light);
    }
    
    .strategy-btn:active {
      box-shadow: 
        inset var(--neumorph-shadow-distance) var(--neumorph-shadow-distance)
        calc(var(--neumorph-shadow-distance) * 1.5) var(--neumorph-inset-shadow-dark),
        inset calc(-1 * var(--neumorph-shadow-distance)) calc(-1 * var(--neumorph-shadow-distance))
        calc(var(--neumorph-shadow-distance) * 1.5) var(--neumorph-inset-shadow-light);
    }
    
    .strategy-btn strong {
      display: block;
      margin-bottom: 4px;
      color: var(--text-color);
    }
    
    .strategy-btn span {
      font-size: 0.85rem;
      color: var(--light-text);
    }
  `;

  document.head.appendChild(style);

  // Add event listeners
  const cancelBtn = modal.querySelector('.cancel-btn');
  cancelBtn.addEventListener('click', () => {
    document.body.removeChild(modal);
  });

  // Add click handlers to strategy buttons
  const strategyButtons = modal.querySelectorAll('.strategy-btn');
  strategyButtons.forEach(button => {
    button.addEventListener('click', () => {
      const strategy = button.getAttribute('data-strategy');
      document.body.removeChild(modal);
      this.executeShuffleStrategy(strategy);
    });
  });

  // Add to DOM
  document.body.appendChild(modal);
}

/**
 * Executes the selected shuffle strategy
 * @param {string} strategy - The selected strategy
 */
executeShuffleStrategy(strategy) {
  // Convert blocks to array
  const blockArray = Array.from(this.blocks.values());
  
  // Apply the selected strategy
  switch (strategy) {
    case 'random':
      this.applyRandomStrategy(blockArray);
      break;
    case 'compact':
      this.applyCompactStrategy(blockArray);
      break;
    case 'spread':
      this.applySpreadStrategy(blockArray);
      break;
    case 'clustered':
      this.applyClusteredStrategy(blockArray);
      break;
    case 'timeOfDay':
      this.applyTimeOfDayStrategy(blockArray);
      break;
    default:
      this.applyRandomStrategy(blockArray);
  }
  
  // Save current state
  this.saveCurrentState();
  
  // Update label positions after shuffling
  setTimeout(() => {
    this.updateLabelPositions();
  }, 100);
  
  // Show toast notification
  this.showToast(`Applied "${this.strategyNameMap[strategy]}" arrangement`);
}

/**
 * Maps strategy keys to friendly names
 */
get strategyNameMap() {
  return {
    'random': 'Random',
    'compact': 'Compact',
    'spread': 'Evenly Distributed',
    'clustered': 'Clustered',
    'timeOfDay': 'Time-of-Day Optimized'
  };
}

/**
 * Applies random strategy (basic shuffle)
 * @param {Array} blockArray - Array of blocks to arrange
 */
applyRandomStrategy(blockArray) {
  // Fisher-Yates shuffle
  for (let i = blockArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [blockArray[i], blockArray[j]] = [blockArray[j], blockArray[i]];
  }
  
  // Lay out sequentially with some random gaps
  let currentStart = 0;
  let overflow = false;
  
  // Make a copy of blocks to track placed blocks and avoid conflicts
  const placedBlocks = [];
  
  blockArray.forEach((block, index) => {
    // Maybe add a random gap (30% chance)
    if (index > 0 && Math.random() < 0.3) {
      const gapSize = Math.random() * 1.5; // Random gap up to 1.5 hours
      currentStart = (currentStart + gapSize) % 24;
    }
    
    // Check if block fits within 24 hours if wrap is disabled
    if (!this.isWrappingEnabled && currentStart + block.duration > 24) {
      overflow = true;
      // If overlap is not allowed, try to place at beginning
      if (!this.allowOverlap) {
        currentStart = 0;
      }
    }
    
    const originalStart = currentStart;
    let placementSuccessful = false;
    let attempts = 0;
    const maxAttempts = 24; // Prevent infinite loops
    
    // Loop until we find a valid position or exhaust attempts
    while (!placementSuccessful && attempts < maxAttempts) {
      // Check for conflicts with already placed blocks
      let hasConflict = false;
      
      if (!this.allowOverlap) {
        hasConflict = placedBlocks.some(placedBlock => {
          if (placedBlock.id === block.id) return false;
          return this.timeRangesOverlap(
            currentStart, 
            currentStart + block.duration, 
            placedBlock.start, 
            placedBlock.start + placedBlock.duration,
            this.isWrappingEnabled
          );
        });
      }
      
      if (!hasConflict) {
        // Position is valid, update the block
        block.start = currentStart;
        placedBlocks.push({
          id: block.id,
          start: currentStart,
          duration: block.duration
        });
        this.updateBlock(block.id, { start: currentStart });
        placementSuccessful = true;
      } else {
        // Try next position
        currentStart = (currentStart + 0.25) % 24;
        attempts++;
      }
    }
    
    // If we couldn't place the block after all attempts
    if (!placementSuccessful) {
      // Force placement at original position
      this.updateBlock(block.id, { start: originalStart });
      placedBlocks.push({
        id: block.id,
        start: originalStart,
        duration: block.duration
      });
      this.showToast('Some blocks may overlap due to space constraints');
    }
    
    // Move to next position for next block
    currentStart = (block.start + block.duration) % 24;
    if (!this.isWrappingEnabled && !this.allowOverlap) {
      currentStart = Math.min(24, currentStart);
    }
  });
  
  // Show toast if overflow occurred
  if (overflow) {
    this.showToast('Some blocks were repositioned due to 24-hour limit');
  }
}

/**
 * Applies compact strategy (minimizes gaps)
 * @param {Array} blockArray - Array of blocks to arrange
 */
applyCompactStrategy(blockArray) {
  // Sort blocks by duration (longest first for better packing)
  blockArray.sort((a, b) => b.duration - a.duration);
  
  // Make a deep copy of blockArray to track placed blocks
  const placedBlocks = [];
  
  // Lay out sequentially with no gaps
  let currentStart = 0;
  let overflow = false;
  
  blockArray.forEach(block => {
    // Check if block fits within 24 hours if wrap is disabled
    if (!this.isWrappingEnabled && currentStart + block.duration > 24) {
      overflow = true;
      // If overlap is not allowed, try to find a gap
      if (!this.allowOverlap) {
        // Find the best gap among already placed blocks
        currentStart = this.findBestGapFixed(placedBlocks, block.duration);
      }
    }
    
    // Verify no conflicts if overlap is not allowed
    if (!this.allowOverlap) {
      let hasConflict = this.checkForTimeConflicts(
        placedBlocks, 
        currentStart, 
        block.duration, 
        this.isWrappingEnabled
      );
      
      // If there's a conflict, try to find another spot
      if (hasConflict) {
        // Try positions in 15-minute increments
        let foundPosition = false;
        for (let hour = 0; hour < 24 && !foundPosition; hour += 0.25) {
          hasConflict = this.checkForTimeConflicts(
            placedBlocks, 
            hour, 
            block.duration, 
            this.isWrappingEnabled
          );
          
          if (!hasConflict) {
            currentStart = hour;
            foundPosition = true;
          }
        }
        
        // If we still have conflicts, just place at 0 and warn
        if (!foundPosition) {
          currentStart = 0;
          this.showToast('Some blocks may overlap due to space constraints');
        }
      }
    }
    
    // Update block position
    this.updateBlock(block.id, { start: currentStart });
    
    // Add to placed blocks
    placedBlocks.push({
      id: block.id,
      start: currentStart,
      duration: block.duration
    });
    
    // Move to next position
    currentStart = (currentStart + block.duration) % 24;
    if (!this.isWrappingEnabled && !this.allowOverlap) {
      currentStart = Math.min(24, currentStart);
    }
  });
  
  // Show toast
  this.showToast('Applied compact arrangement with minimal gaps');
}

/**
 * Applies evenly distributed strategy
 * @param {Array} blockArray - Array of blocks to arrange
 */
applySpreadStrategy(blockArray) {
  // Calculate total duration of all blocks
  const totalDuration = blockArray.reduce((sum, block) => sum + block.duration, 0);
  
  // Calculate ideal gap based on remaining time and number of gaps needed
  const availableTime = this.isWrappingEnabled ? 24 : Math.min(24, totalDuration);
  const numberOfGaps = blockArray.length > 1 ? blockArray.length : 1;
  let idealGapSize = 0;
  
  if (totalDuration < availableTime) {
    // Calculate gap size, ensuring it's not negative
    idealGapSize = Math.max(0, (availableTime - totalDuration) / numberOfGaps);
    
    // Limit gap size to something reasonable
    idealGapSize = Math.min(idealGapSize, 2); // Max 2 hour gaps
  }
  
  // Randomize block order before distributing
  for (let i = blockArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [blockArray[i], blockArray[j]] = [blockArray[j], blockArray[i]];
  }
  
  // Track placed blocks to handle conflicts
  const placedBlocks = [];
  
  // Distribute blocks evenly
  let currentStart = 0;
  let overflow = false;
  
  blockArray.forEach((block, index) => {
    let foundValidPosition = false;
    let attemptedStart = currentStart;
    
    // If we don't allow overlaps, check for conflicts
    if (!this.allowOverlap) {
      // Check if current position conflicts with placed blocks
      let hasConflict = this.checkForTimeConflicts(
        placedBlocks, 
        attemptedStart, 
        block.duration, 
        this.isWrappingEnabled
      );
      
      // If there's a conflict, try different positions
      if (hasConflict) {
        // Try positions in 15-minute increments
        for (let hour = 0; hour < 24 && !foundValidPosition; hour += 0.25) {
          hasConflict = this.checkForTimeConflicts(
            placedBlocks, 
            hour, 
            block.duration, 
            this.isWrappingEnabled
          );
          
          if (!hasConflict) {
            attemptedStart = hour;
            foundValidPosition = true;
          }
        }
        
        // If we still have conflicts, just use original position and warn
        if (!foundValidPosition) {
          this.showToast('Some blocks may overlap due to space constraints');
        }
      } else {
        foundValidPosition = true;
      }
    } else {
      foundValidPosition = true; // Always valid if overlaps are allowed
    }
    
    // Handle wrapping constraints
    if (!this.isWrappingEnabled && attemptedStart + block.duration > 24) {
      overflow = true;
      // If we can't wrap and would exceed 24h, place at beginning of day
      if (!this.allowOverlap) {
        attemptedStart = 0;
      }
    }
    
    // Update block position
    this.updateBlock(block.id, { start: attemptedStart });
    
    // Add to placed blocks
    placedBlocks.push({
      id: block.id,
      start: attemptedStart,
      duration: block.duration
    });
    
    // Calculate next position with ideal gap
    currentStart = (attemptedStart + block.duration + idealGapSize) % 24;
    
    // Handle day boundary if wrapping is disabled
    if (!this.isWrappingEnabled) {
      currentStart = Math.min(24, currentStart);
    }
  });
  
  // Show toast
  this.showToast('Applied evenly distributed arrangement');
}

/**
 * Applies clustered strategy (groups similar blocks)
 * @param {Array} blockArray - Array of blocks to arrange
 */
applyClusteredStrategy(blockArray) {
  // Group blocks by duration category
  const shortBlocks = blockArray.filter(block => block.duration <= 0.5);
  const mediumBlocks = blockArray.filter(block => block.duration > 0.5 && block.duration <= 1.5);
  const longBlocks = blockArray.filter(block => block.duration > 1.5);
  
  // Randomize each group
  [shortBlocks, mediumBlocks, longBlocks].forEach(group => {
    for (let i = group.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [group[i], group[j]] = [group[j], group[i]];
    }
  });
  
  // Determine placement order (medium-short-long or long-medium-short)
  const placementGroups = Math.random() < 0.5 ? 
    [mediumBlocks, shortBlocks, longBlocks] : 
    [longBlocks, mediumBlocks, shortBlocks];
  
  // Flatten all groups into single array
  const orderedBlocks = placementGroups.flat();
  
  // Track placed blocks to handle conflicts
  const placedBlocks = [];
  
  // Lay out sequentially with small gaps between categories
  let currentStart = 0;
  let overflow = false;
  let currentCategory = null;
  
  orderedBlocks.forEach(block => {
    let blockCategory;
    if (block.duration <= 0.5) blockCategory = 'short';
    else if (block.duration <= 1.5) blockCategory = 'medium';
    else blockCategory = 'long';
    
    // Add gap between different categories
    if (currentCategory !== null && currentCategory !== blockCategory) {
      currentStart = (currentStart + 0.5) % 24; // 30 min gap between categories
    }
    currentCategory = blockCategory;
    
    // Check if block fits within 24 hours if wrap is disabled
    if (!this.isWrappingEnabled && currentStart + block.duration > 24) {
      overflow = true;
      // If overlap is not allowed, start from beginning
      if (!this.allowOverlap) {
        currentStart = 0;
      }
    }
    
    // Verify no conflicts if overlap is not allowed
    if (!this.allowOverlap) {
      let hasConflict = this.checkForTimeConflicts(
        placedBlocks, 
        currentStart, 
        block.duration, 
        this.isWrappingEnabled
      );
      
      // If there's a conflict, find another position
      if (hasConflict) {
        // Try to find a position within the same category section if possible
        // Starting from the current start time, try every 15-min increment
        let foundSpot = false;
        let tryStart = currentStart;
        const maxAttempts = 96; // Max 24 hours of attempts
        let attempts = 0;
        
        while (!foundSpot && attempts < maxAttempts) {
          tryStart = (tryStart + 0.25) % 24;
          hasConflict = this.checkForTimeConflicts(
            placedBlocks, 
            tryStart, 
            block.duration, 
            this.isWrappingEnabled
          );
          
          if (!hasConflict && 
              (!this.isWrappingEnabled || tryStart + block.duration <= 24 || this.allowOverlap)) {
            currentStart = tryStart;
            foundSpot = true;
          }
          
          attempts++;
        }
        
        // If still no spot found, just place at beginning and warn
        if (!foundSpot) {
          currentStart = 0;
          this.showToast('Some blocks may overlap due to space constraints');
        }
      }
    }
    
    // Update block position
    this.updateBlock(block.id, { start: currentStart });
    
    // Add to placed blocks
    placedBlocks.push({
      id: block.id,
      start: currentStart,
      duration: block.duration
    });
    
    // Move to next position
    currentStart = (currentStart + block.duration) % 24;
    if (!this.isWrappingEnabled && !this.allowOverlap) {
      currentStart = Math.min(24, currentStart);
    }
  });
  
  // Show toast
  this.showToast('Applied clustered arrangement by duration');
}

/**
 * Applies time of day strategy (morning/afternoon/evening)
 * @param {Array} blockArray - Array of blocks to arrange
 */
applyTimeOfDayStrategy(blockArray) {
  if (blockArray.length === 0) return;
  
  // Define time periods (hours)
  const morning = { start: 5, end: 12 }; // 5 AM - 12 PM
  const afternoon = { start: 12, end: 17 }; // 12 PM - 5 PM
  const evening = { start: 17, end: 22 }; // 5 PM - 10 PM
  const night = { start: 22, end: 5 }; // 10 PM - 5 AM
  
  // Calculate period durations
  const morningDuration = morning.end - morning.start;
  const afternoonDuration = afternoon.end - afternoon.start;
  const eveningDuration = evening.end - evening.start;
  const nightDuration = (24 - night.start) + night.end;
  
  // Sort blocks by duration (longest first)
  blockArray.sort((a, b) => b.duration - a.duration);
  
  // Initialize block arrays for each period
  const morningBlocks = [];
  const afternoonBlocks = [];
  const eveningBlocks = [];
  const nightBlocks = [];
  
  // Initialize remaining time in each period
  let remainingMorningTime = morningDuration;
  let remainingAfternoonTime = afternoonDuration;
  let remainingEveningTime = eveningDuration;
  let remainingNightTime = nightDuration;
  
  // Track already placed blocks to avoid conflicts later
  const placedBlocks = [];
  
  // First pass: distribute blocks to periods
  blockArray.forEach(block => {
    // Check if block is too long for any period
    const isExtremelyLong = block.duration > Math.max(
      morningDuration, 
      afternoonDuration, 
      eveningDuration, 
      nightDuration
    );
    
    // For very long blocks or blocks that don't fit anywhere available
    if (isExtremelyLong || (
        block.duration > remainingMorningTime && 
        block.duration > remainingAfternoonTime && 
        block.duration > remainingEveningTime && 
        block.duration > remainingNightTime
    )) {
      // Find period with most remaining time
      const periods = [
        { name: 'morning', remaining: remainingMorningTime, array: morningBlocks },
        { name: 'afternoon', remaining: remainingAfternoonTime, array: afternoonBlocks },
        { name: 'evening', remaining: remainingEveningTime, array: eveningBlocks },
        { name: 'night', remaining: remainingNightTime, array: nightBlocks }
      ].sort((a, b) => b.remaining - a.remaining);
      
      // Add to the period with most space
      periods[0].array.push(block);
      
      // Update remaining time (even if negative - we'll handle overlaps later)
      switch (periods[0].name) {
        case 'morning': remainingMorningTime -= block.duration; break;
        case 'afternoon': remainingAfternoonTime -= block.duration; break;
        case 'evening': remainingEveningTime -= block.duration; break;
        case 'night': remainingNightTime -= block.duration; break;
      }
      
      return;
    }
    
    // Normal case: try to place in each period in order
    if (block.duration <= remainingMorningTime) {
      morningBlocks.push(block);
      remainingMorningTime -= block.duration;
    } else if (block.duration <= remainingAfternoonTime) {
      afternoonBlocks.push(block);
      remainingAfternoonTime -= block.duration;
    } else if (block.duration <= remainingEveningTime) {
      eveningBlocks.push(block);
      remainingEveningTime -= block.duration;
    } else {
      // Default to night period
      nightBlocks.push(block);
      remainingNightTime -= block.duration;
    }
  });
  
  // Position blocks within each period, tracking blocks as they're placed
  this.positionBlocksInPeriodFixed(
    morningBlocks, morning.start, morningDuration, placedBlocks, false
  );
  
  this.positionBlocksInPeriodFixed(
    afternoonBlocks, afternoon.start, afternoonDuration, placedBlocks, false
  );
  
  this.positionBlocksInPeriodFixed(
    eveningBlocks, evening.start, eveningDuration, placedBlocks, false
  );
  
  this.positionBlocksInPeriodFixed(
    nightBlocks, night.start, nightDuration, placedBlocks, true // Night crosses midnight
  );
  
  this.showToast('Applied time-of-day optimized arrangement');
}

/**
 * Positions blocks within a specific time period
 * Fixed version with conflict handling
 * @param {Array} blocks - Blocks to position
 * @param {number} periodStart - Start time of the period
 * @param {number} periodDuration - Duration of the period
 * @param {Array} placedBlocks - Blocks already placed (to check conflicts)
 * @param {boolean} crossesMidnight - Whether the period crosses midnight
 */
positionBlocksInPeriodFixed(blocks, periodStart, periodDuration, placedBlocks, crossesMidnight = false) {
  if (blocks.length === 0) return;
  
  // Randomize blocks for variety
  for (let i = blocks.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
  }
  
  // Calculate total block duration
  const totalBlockDuration = blocks.reduce((sum, block) => sum + block.duration, 0);
  
  // Calculate gap size based on remaining time
  let gapSize = 0;
  if (totalBlockDuration < periodDuration) {
    gapSize = (periodDuration - totalBlockDuration) / (blocks.length + 1);
    // Ensure gap size is reasonable
    gapSize = Math.min(gapSize, 1); // Cap at 1 hour max
  }
  
  // Position blocks within period
  let currentStart = periodStart + gapSize;
  
  blocks.forEach(block => {
    // Handle midnight crossing if needed
    if (crossesMidnight && currentStart >= 24) {
      currentStart = currentStart % 24;
    }
    
    // Check wrap settings
    if (!this.isWrappingEnabled && currentStart + block.duration > 24) {
      // If we can't wrap and would exceed 24h, place at beginning of day
      currentStart = 0;
    }
    
    // Check for conflicts if overlaps aren't allowed
    if (!this.allowOverlap) {
      let hasConflict = this.checkForTimeConflicts(
        placedBlocks, 
        currentStart, 
        block.duration, 
        this.isWrappingEnabled
      );
      
      // If there's a conflict, try to find another position within the period
      if (hasConflict) {
        let foundSpot = false;
        
        // Determine search range based on period
        let searchStart = periodStart;
        let searchEnd = periodStart + periodDuration;
        
        if (crossesMidnight) {
          if (searchEnd > 24) {
            searchEnd = searchEnd % 24;
            // If end wraps, we need to search from periodStart to 24
            // and from 0 to searchEnd
            
            // First try from periodStart to 24
            for (let hour = periodStart; hour < 24 && !foundSpot; hour += 0.25) {
              if (!this.checkForTimeConflicts(
                placedBlocks, hour, block.duration, this.isWrappingEnabled
              ) && (this.isWrappingEnabled || hour + block.duration <= 24)) {
                currentStart = hour;
                foundSpot = true;
              }
            }
            
            // Then try from 0 to searchEnd if not found
            if (!foundSpot) {
              for (let hour = 0; hour < searchEnd && !foundSpot; hour += 0.25) {
                if (!this.checkForTimeConflicts(
                  placedBlocks, hour, block.duration, this.isWrappingEnabled
                )) {
                  currentStart = hour;
                  foundSpot = true;
                }
              }
            }
          }
        } else {
          // Normal case - search through the period
          for (let hour = searchStart; hour < searchEnd - block.duration && !foundSpot; hour += 0.25) {
            if (!this.checkForTimeConflicts(
              placedBlocks, hour, block.duration, this.isWrappingEnabled
            )) {
              currentStart = hour;
              foundSpot = true;
            }
          }
        }
        
        // If still no spot, try anywhere on the timeline
        if (!foundSpot) {
          for (let hour = 0; hour < 24 && !foundSpot; hour += 0.25) {
            if (!this.checkForTimeConflicts(
              placedBlocks, hour, block.duration, this.isWrappingEnabled
            ) && (this.isWrappingEnabled || hour + block.duration <= 24)) {
              currentStart = hour;
              foundSpot = true;
            }
          }
        }
        
        // If still no spot found, place at period start and warn
        if (!foundSpot) {
          currentStart = periodStart;
          this.showToast('Some blocks may overlap due to space constraints');
        }
      }
    }
    
    // Update block position
    this.updateBlock(block.id, { start: currentStart });
    
    // Add to placed blocks
    placedBlocks.push({
      id: block.id,
      start: currentStart,
      duration: block.duration
    });
    
    // Move to next position with gap
    currentStart = currentStart + block.duration + gapSize;
    if (crossesMidnight && currentStart >= 24) {
      currentStart = currentStart % 24;
    }
  });
}

/**
 * Legacy method for compatibility
 */
positionBlocksInPeriod(blocks, periodStart, periodDuration, crossesMidnight = false) {
  // Call the fixed version with an empty placedBlocks array
  this.positionBlocksInPeriodFixed(blocks, periodStart, periodDuration, [], crossesMidnight);
}

/**
 * Helper method to check if two time ranges overlap
 * @param {number} start1 - Start time of first range
 * @param {number} end1 - End time of first range
 * @param {number} start2 - Start time of second range
 * @param {number} end2 - End time of second range
 * @param {boolean} allowWrapAround - Whether to consider wrap-around at midnight
 * @returns {boolean} - True if ranges overlap
 */
timeRangesOverlap(start1, end1, start2, end2, allowWrapAround) {
  // Normalize all times to be within 0-24 range
  start1 = start1 % 24;
  end1 = end1 % 24;
  start2 = start2 % 24;
  end2 = end2 % 24;
  
  // Special case: end time is exactly midnight
  if (end1 === 0) end1 = 24;
  if (end2 === 0) end2 = 24;
  
  // Check if either range wraps around midnight
  const range1Wraps = end1 <= start1;
  const range2Wraps = end2 <= start2;
  
  // If wrap-around is not allowed, adjust end times
  if (!allowWrapAround) {
    if (range1Wraps) end1 = 24;
    if (range2Wraps) end2 = 24;
  }
  
  // Now handle the different cases
  if (!range1Wraps && !range2Wraps) {
    // Neither range wraps, standard check
    return (start1 < end2 && end1 > start2);
  } else if (allowWrapAround) {
    if (range1Wraps && range2Wraps) {
      // Both ranges wrap, they must overlap
      return true;
    } else if (range1Wraps) {
      // First range wraps, second doesn't
      // Overlap if second range intersects with either part of first range
      return (start2 < end1 || end2 > start1);
    } else {
      // Second range wraps, first doesn't
      // Overlap if first range intersects with either part of second range
      return (start1 < end2 || end1 > start2);
    }
  }
  
  // Default case - no overlap
  return false;
}

/**
 * Checks for conflicts between a new time block and existing blocks
 * @param {Array} placedBlocks - Array of already placed blocks
 * @param {number} start - Start time to check
 * @param {number} duration - Duration to check
 * @param {boolean} wrapEnabled - Whether wrap-around is enabled
 * @returns {boolean} - True if a conflict exists
 */
checkForTimeConflicts(placedBlocks, start, duration, wrapEnabled) {
  if (placedBlocks.length === 0) return false;
  
  const end = (start + duration) % 24;
  
  return placedBlocks.some(block => {
    const blockEnd = (block.start + block.duration) % 24;
    return this.timeRangesOverlap(
      start, end, block.start, blockEnd, wrapEnabled
    );
  });
}

/**
 * Finds the best gap to place a block - Fixed implementation
 * @param {Array} placedBlocks - Array of already placed blocks
 * @param {number} duration - Duration needed
 * @returns {number} Best start time found
 */
findBestGapFixed(placedBlocks, duration) {
  // If no blocks are placed yet, start at 0
  if (placedBlocks.length === 0) return 0;
  
  // Create time points from block edges
  const timePoints = [];
  
  // Add all block boundaries
  placedBlocks.forEach(block => {
    // Make sure to handle blocks that wrap around midnight
    const blockStart = block.start % 24;
    let blockEnd = (block.start + block.duration) % 24;
    if (blockEnd === 0 && block.duration > 0) blockEnd = 24;
    
    timePoints.push({ time: blockStart, type: 'start' });
    timePoints.push({ time: blockEnd, type: 'end' });
  });
  
  // Add day boundaries if not wrapping
  if (!this.isWrappingEnabled) {
    // Make sure we don't duplicate boundaries
    if (!timePoints.some(p => p.time === 0)) {
      timePoints.push({ time: 0, type: 'boundary' });
    }
    if (!timePoints.some(p => p.time === 24)) {
      timePoints.push({ time: 24, type: 'boundary' });
    }
  }
  
  // Sort time points
  timePoints.sort((a, b) => a.time - b.time);
  
  // Find gaps by stepping through timePoints
  const gaps = [];
  let openBlocks = 0;
  let lastTime = 0;
  
  timePoints.forEach(point => {
    // If we're at a point where no blocks are open, this is a gap
    if (openBlocks === 0 && point.time > lastTime) {
      gaps.push({
        start: lastTime,
        end: point.time,
        duration: point.time - lastTime
      });
    }
    
    // Update block count based on point type
    if (point.type === 'start') {
      openBlocks++;
    } else if (point.type === 'end') {
      openBlocks = Math.max(0, openBlocks - 1);
    }
    
    // Update last time
    lastTime = point.time;
  });
  
  // Handle wrap-around gap if needed (from last point back to first)
  if (this.isWrappingEnabled && timePoints.length > 0) {
    const firstTime = timePoints[0].time;
    const lastTime = timePoints[timePoints.length - 1].time;
    
    // If the last time point leaves us with no open blocks,
    // there's a potential gap from last point to first point
    if (openBlocks === 0 && firstTime > 0) {
      // Calculate the gap duration, handling the wrap
      const wrapDuration = (24 - lastTime) + firstTime;
      
      gaps.push({
        start: lastTime,
        end: firstTime,
        duration: wrapDuration
      });
    }
  }
  
  // Find best gap (first one that fits)
  // Sort by size to find smallest suitable gap
  const suitableGaps = gaps
    .filter(gap => gap.duration >= duration)
    .sort((a, b) => a.duration - b.duration);
  
  if (suitableGaps.length > 0) {
    return suitableGaps[0].start;
  }
  
  // If no suitable gap, try to fit in one hour increments starting from 0
  for (let hour = 0; hour < 24; hour++) {
    // Check if this position conflicts with any placed blocks
    const hasConflict = this.checkForTimeConflicts(
      placedBlocks, hour, duration, this.isWrappingEnabled
    );
    
    // Also check if it would exceed the timeline without wrapping
    const exceedsTimeline = !this.isWrappingEnabled && (hour + duration > 24);
    
    if (!hasConflict && !exceedsTimeline) {
      return hour;
    }
  }
  
  // If still no spot, start from 0
  return 0;
}

/**
 * Legacy method for compatibility
 */
findBestGap(placedBlocks, duration) {
  return this.findBestGapFixed(placedBlocks, duration);
}

  /**
   * Updates the wrap-around setting for all blocks
   * @param {boolean} isEnabled - Whether wrap is enabled
   */
  setWrappingEnabled(isEnabled) {
    this.isWrappingEnabled = isEnabled;

    // Update all blocks
    for (const block of this.blocks.values()) {
      block.setWrappingEnabled(isEnabled);
    }

    // Update label positions after changing wrap mode
    setTimeout(() => {
      this.updateLabelPositions();
    }, 100);

    // Save current state
    this.saveCurrentState();
  }

  /**
   * Updates the overlap setting
   * @param {boolean} isAllowed - Whether overlap is allowed
   */
  setOverlapAllowed(isAllowed) {
    this.allowOverlap = isAllowed;

    // Save current state
    this.saveCurrentState();
  }

  /**
   * Shows a toast notification
   * @param {string} message - Message to display
   */
  showToast(message) {
    // Get template content
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
   * Clears all blocks from the timeline
   */
  clearTimeline() {
    // Remove all blocks from DOM
    for (const block of this.blocks.values()) {
      block.remove();
    }

    // Clear collection
    this.blocks.clear();

    // Save current state
    this.saveCurrentState();
  }

  /**
   * Serializes timeline data for storage
   * @returns {Object} - Serialized timeline data
   */
  serialize() {
    const blocks = [];

    for (const block of this.blocks.values()) {
      blocks.push(block.serialize());
    }

    return {
      blocks,
      isWrappingEnabled: this.isWrappingEnabled,
      allowOverlap: this.allowOverlap,
      use24HourFormat: this.use24HourFormat
    };
  }

  /**
   * Deserializes timeline data and loads it
   * @param {Object} data - Serialized timeline data
   */
  deserialize(data) {
    // Clear existing blocks
    this.clearTimeline();

    // Set state properties
    this.isWrappingEnabled = data.isWrappingEnabled || false;
    this.allowOverlap = data.allowOverlap || false;
    this.use24HourFormat = data.use24HourFormat !== undefined ? data.use24HourFormat : true;

    // Update hour markers for the current time format
    this.initializeHourMarkers();

    // Add blocks
    if (data.blocks && Array.isArray(data.blocks)) {
      for (const blockData of data.blocks) {
        const block = new Block(blockData, this, this.isWrappingEnabled, this.use24HourFormat);
        this.blocks.set(blockData.id, block);
        this.gridElement.appendChild(block.element);
      }
    }

    // Update label positions after loading
    setTimeout(() => {
      this.updateLabelPositions();
    }, 150);
  }

  /**
   * Saves the current timeline state to localStorage
   */
  saveCurrentState() {
    // Use Storage module to save
    const event = new CustomEvent('timeline:save-current', {
      detail: this.serialize()
    });
    document.dispatchEvent(event);
  }

  /**
   * Generates a unique ID for a block
   * @returns {string} - Unique ID
   */
  generateUniqueId() {
    return 'block_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Generates a color based on existing blocks
   * @returns {string} - Hex color
   */
  generateColor() {
    // Use HSL for better color distribution
    const hue = Math.floor(Math.random() * 360);
    const saturation = 65 + Math.random() * 10;
    const lightness = 45 + Math.random() * 10;

    // Convert to hex for input compatibility
    return this.hslToHex(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
  }

  /**
   * Converts HSL color string to hex
   * @param {string} hsl - HSL color string
   * @returns {string} - Hex color string
   */
  hslToHex(hsl) {
    // Parse HSL values
    const match = hsl.match(/hsl\((\d+),\s*([\d.]+)%,\s*([\d.]+)%\)/);
    if (!match) return '#3a86ff';

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
  hexToHsl(hex) {
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
}