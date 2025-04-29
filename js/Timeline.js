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
    
    // Initialize timeline hours
    this.initializeHourMarkers();
    
    // Set up click handler for block creation
    this.gridElement.addEventListener('click', this.handleGridClick.bind(this));
  }
  
  /**
   * Initializes the timeline hour markers
   */
  initializeHourMarkers() {
    const hoursContainer = document.querySelector('.timeline-hours');
    
    // Clear existing content
    hoursContainer.innerHTML = '';
    
    // Add hour markers (0-24)
    for (let hour = 0; hour <= 24; hour++) {
      const hourMarker = document.createElement('div');
      hourMarker.classList.add('hour-marker');
      hourMarker.textContent = `${hour}h`;
      hoursContainer.appendChild(hourMarker);
    }
  }
  
  /**
   * Handles click on the timeline grid to create a new block
   * @param {MouseEvent} event - Click event
   */
  handleGridClick(event) {
    // Ignore if clicked on a block
    if (event.target.closest('.block')) return;
    
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
    const block = new Block(completeData, this, this.isWrappingEnabled);
    
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
      }, this, this.isWrappingEnabled);
      
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
    const newBlock = new Block(newBlockData, this, this.isWrappingEnabled);
    
    // Add to collection and DOM
    this.blocks.set(newId, newBlock);
    this.gridElement.appendChild(newBlock.element);
    
    // Save current state
    this.saveCurrentState();
    
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
    }, this, this.isWrappingEnabled);
    
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
   * Shuffles blocks randomly and lays them out sequentially
   */
  shuffleBlocks() {
    if (this.blocks.size === 0) return;
    
    // Convert blocks to array
    const blockArray = Array.from(this.blocks.values());
    
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
      this.showToast('Not enough space - some blocks may not be visible');
    }
    
    // Save current state
    this.saveCurrentState();
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
      allowOverlap: this.allowOverlap
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
    
    // Add blocks
    if (data.blocks && Array.isArray(data.blocks)) {
      for (const blockData of data.blocks) {
        const block = new Block(blockData, this, this.isWrappingEnabled);
        this.blocks.set(blockData.id, block);
        this.gridElement.appendChild(block.element);
      }
    }
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