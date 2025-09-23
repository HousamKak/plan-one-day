/**
 * Timeline class responsible for managing blocks and handling timeline logic
 */
import { Block } from './Block.js';
import { showToast } from '../ui/Toast.js';
import { hslToHex, hexToHsl, generateRandomColor } from '../utils/ColorUtils.js';

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
   * Gets a block by ID
   * @param {string} id - Block ID
   * @returns {Block|undefined} - Block instance or undefined if not found
   */
  getBlock(id) {
    return this.blocks.get(id);
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
    if (Math.abs(clickY - (timelineRect.top + timelineRect.height/2)) > 20) {
      return;
    }
    
    // Calculate click position in hours
    const rect = this.gridElement.getBoundingClientRect();
    const totalWidth = rect.width;
    const offsetX = event.clientX - rect.left;
    const clickHour = (offsetX / totalWidth) * 24;
    
    // Round to nearest 0.25 hour
    const startHour = Math.max(0, Math.min(24, Math.round(clickHour * 4) / 4));
    
    // Dispatch event for block creation
    const createEvent = new CustomEvent('timeline:create-block', {
      detail: { startHour }
    });
    
    document.dispatchEvent(createEvent);
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
      color: hexToHsl(blockData.color)
    };
    
    // Create block instance
    const block = new Block(completeData, this, this.isWrappingEnabled, this.use24HourFormat);
    
    // Check for conflicts if overlap is not allowed
    if (!this.allowOverlap && this.hasConflict(block)) {
      block.remove();
      showToast('Time conflict');
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

    // Never update locked blocks
    if (block.isLocked) {
      return false;
    }

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
        showToast('Time conflict');
        return false;
      }
    }
    
    // Convert color from hex to hsl if provided
    if (data.color && data.color.startsWith('#')) {
      data.color = hexToHsl(data.color);
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
   * Shuffles blocks randomly and lays them out sequentially
   */
  shuffleBlocks() {
    if (this.blocks.size === 0) return;

    // Convert blocks to array and filter out locked blocks
    const allBlocks = Array.from(this.blocks.values());
    const blockArray = allBlocks.filter(block => !block.isLocked);

    // If no unlocked blocks, don't shuffle
    if (blockArray.length === 0) return;
    
    // Fisher-Yates shuffle
    for (let i = blockArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [blockArray[i], blockArray[j]] = [blockArray[j], blockArray[i]];
    }
    
    // Lay out sequentially
    let currentStart = 0;
    let overflow = false;
    
    for (const block of blockArray) {
      // Check if block fits within 24 hours if wrap is disabled
      if (!this.isWrappingEnabled && currentStart + block.duration > 24) {
        overflow = true;
        // If overlap is allowed, continue placing blocks beyond 24h
        if (!this.allowOverlap) {
          break;
        }
      }
      
      // Update block position
      if (this.updateBlock(block.id, { start: currentStart })) {
        // Move to next position only if update was successful
        currentStart = (currentStart + block.duration) % 24;
        if (!this.isWrappingEnabled && !this.allowOverlap) {
          // For non-wrapping mode without overlap, we use absolute positions
          currentStart = Math.min(24, currentStart);
        }
      }
    }
    
    // Show toast if overflow occurred
    if (overflow) {
      showToast('Not enough space - some blocks may not be visible');
    }
    
    // Save current state
    this.saveCurrentState();
    
    // Update label positions after shuffling
    setTimeout(() => {
      this.updateLabelPositions();
    }, 100);
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
   * Updates the time format setting
   * @param {boolean} use24Hour - Whether to use 24-hour format
   */
  setTimeFormat(use24Hour) {
    this.use24HourFormat = use24Hour;
    
    // Update all blocks
    for (const block of this.blocks.values()) {
      block.setTimeFormat(use24Hour);
    }
    
    // Save current state
    this.saveCurrentState();
    
    // Dispatch an event to update hour markers
    const event = new CustomEvent('timeline:format-changed', {
      detail: { use24HourFormat: use24Hour }
    });
    document.dispatchEvent(event);
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
    
    // Dispatch an event to update hour markers
    const formatEvent = new CustomEvent('timeline:format-changed', {
      detail: { use24HourFormat: this.use24HourFormat }
    });
    document.dispatchEvent(formatEvent);
    
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
    // Generate a random HSL color for better distribution
    const hslColor = generateRandomColor();
    
    // Convert to hex for input compatibility
    return hslToHex(hslColor);
  }
}