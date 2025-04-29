/**
 * Represents a timeline block with drag and resize capabilities
 */
export class Block {
  /**
   * Creates a new Block instance
   * @param {Object} data - Block data
   * @param {string} data.id - Unique identifier
   * @param {string} data.title - Block title/name
   * @param {number} data.start - Start time in hours (float)
   * @param {number} data.duration - Duration in hours (float)
   * @param {string} data.color - HSL color string
   * @param {Object} timeline - Timeline instance
   * @param {boolean} isWrappingEnabled - Whether wrap-around is enabled
   */
  constructor(data, timeline, isWrappingEnabled = false) {
    // Validate inputs
    if (!data || typeof data !== 'object') {
      throw new TypeError('Block data is required and must be an object');
    }
    
    if (!data.id || typeof data.id !== 'string') {
      throw new TypeError('Block id is required and must be a string');
    }
    
    if (!data.title || typeof data.title !== 'string') {
      throw new TypeError('Block title is required and must be a string');
    }
    
    if (typeof data.start !== 'number' || data.start < 0) {
      throw new TypeError('Block start must be a number greater than or equal to 0');
    }
    
    if (typeof data.duration !== 'number' || data.duration <= 0) {
      throw new TypeError('Block duration must be a positive number');
    }
    
    if (!data.color || typeof data.color !== 'string') {
      throw new TypeError('Block color is required and must be a string');
    }
    
    if (!timeline) {
      throw new TypeError('Timeline instance is required');
    }

    this.id = data.id;
    this.title = data.title;
    this.start = data.start;
    this.duration = data.duration;
    this.color = data.color;
    this.timeline = timeline;
    this.isWrappingEnabled = isWrappingEnabled;
    
    // DOM elements
    this.element = null;
    this.labelArrow = null;
    this.wrapElement = null;
    
    // Drag state
    this.isDragging = false;
    this.dragStartX = 0;
    this.originalStart = 0;
    
    // Resize state
    this.isResizing = false;
    this.resizeStartX = 0;
    this.originalWidth = 0;
    this.originalDuration = 0;
    
    // Create DOM element
    this.render();
  }
  
  /**
   * Creates and renders the block DOM element
   */
  render() {
    // Create block element if it doesn't exist
    if (!this.element) {
      this.element = document.createElement('div');
      this.element.classList.add('block');
      this.element.setAttribute('tabindex', '0');
      this.element.setAttribute('data-id', this.id);
      
      // Create title element
      const titleElement = document.createElement('div');
      titleElement.classList.add('block-title');
      titleElement.textContent = this.title;
      this.element.appendChild(titleElement);
      
      // Create resize handle
      const resizeHandle = document.createElement('div');
      resizeHandle.classList.add('block-resize-handle');
      this.element.appendChild(resizeHandle);
      
      // Add event listeners
      this.addEventListeners();
    }
    
    // Update element properties
    this.updatePosition();
    this.element.style.backgroundColor = this.color;
    
    return this.element;
  }
  
  /**
   * Updates the block's position and size on the timeline
   */
  updatePosition() {
    if (!this.element) return;
    
    // Get the full timeline width and calculate the width per hour
    const gridWidth = this.timeline.gridElement.offsetWidth;
    const hourWidth = gridWidth / 24;
    
    // Handle wrap-around rendering
    if (this.isWrappingEnabled && this.start + this.duration > 24) {
      // Calculate the part that wraps around
      const firstPartDuration = 24 - this.start;
      const secondPartDuration = this.duration - firstPartDuration;
      
      // First part (from start to 24h)
      const startPercent = (this.start / 24) * 100;
      const firstWidthPercent = (firstPartDuration / 24) * 100;
      
      this.element.style.left = `${startPercent}%`;
      this.element.style.width = `${firstWidthPercent}%`;
      
      // Second part (from 0 to remaining duration)
      if (!this.wrapElement) {
        this.wrapElement = this.element.cloneNode(true);
        this.wrapElement.classList.add('block-wrap-part');
        this.wrapElement.setAttribute('data-original-id', this.id);
        this.timeline.gridElement.appendChild(this.wrapElement);
      }
      
      const secondWidthPercent = (secondPartDuration / 24) * 100;
      this.wrapElement.style.left = '0%';
      this.wrapElement.style.width = `${secondWidthPercent}%`;
      this.wrapElement.style.backgroundColor = this.color;
    } else {
      // Standard rendering (no wrap)
      const startPercent = (this.start / 24) * 100;
      const widthPercent = (this.duration / 24) * 100;
      
      this.element.style.left = `${startPercent}%`;
      this.element.style.width = `${widthPercent}%`;
      
      // Remove wrap element if it exists
      if (this.wrapElement) {
        this.wrapElement.remove();
        this.wrapElement = null;
      }
    }
    
    // Format the time range as a string (e.g., "07:00 - 10:30")
    this.updateLabel();
    
    // Handle label arrow for narrow blocks
    this.updateLabelVisibility();
  }
  
  /**
 * Updates the block label with formatted time
 */
updateLabel() {
  const titleElement = this.element.querySelector('.block-title');
  
  // Convert hours to HH:MM format
  const formatTime = (hours) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };
  
  const startTime = formatTime(this.start);
  const endTime = formatTime((this.start + this.duration) % 24);
  
  // Show title above time range with title larger
  titleElement.innerHTML = `<span class="block-title-text">${this.title}</span>
<span class="block-time-text">${startTime} - ${endTime}</span>`;
  
  if (this.labelArrow) {
    this.labelArrow.innerHTML = `<span class="block-title-text">${this.title}</span>
<span class="block-time-text">${startTime} - ${endTime}</span>`;
  }
  
  if (this.wrapElement) {
    const wrapTitleElement = this.wrapElement.querySelector('.block-title');
    wrapTitleElement.innerHTML = `<span class="block-title-text">${this.title}</span>
<span class="block-time-text">${startTime} - ${endTime}</span>`;
  }
}
  
  /**
   * Updates the label visibility and creates arrow label if needed
   */
  updateLabelVisibility() {
    const titleElement = this.element.querySelector('.block-title');
    const blockWidth = this.element.offsetWidth;
    const titleWidth = titleElement.scrollWidth;
    
    // Create or update label arrow for narrow blocks
    if (blockWidth < titleWidth + 12) {
      titleElement.style.opacity = '0';
      
      if (!this.labelArrow) {
        this.labelArrow = document.createElement('div');
        this.labelArrow.classList.add('label-arrow');
        this.labelArrow.innerHTML = titleElement.innerHTML;
        this.timeline.gridElement.appendChild(this.labelArrow);
      }
      
      // Position the label arrow above the block center
      setTimeout(() => {
        const rect = this.element.getBoundingClientRect();
        const gridRect = this.timeline.gridElement.getBoundingClientRect();
        const blockCenter = rect.left + (rect.width / 2) - gridRect.left;
        
        this.labelArrow.style.left = `${blockCenter}px`;
        this.labelArrow.style.backgroundColor = this.color;
        this.labelArrow.style.borderColor = this.color;
        this.labelArrow.style.display = 'block';
      }, 0);
    } else {
      titleElement.style.opacity = '1';
      
      if (this.labelArrow) {
        this.labelArrow.style.display = 'none';
      }
    }
  }
  
  /**
   * Adds event listeners for drag, resize, and context menu
   */
  addEventListeners() {
    // Pointer events for drag
    this.element.addEventListener('pointerdown', this.handlePointerDown.bind(this));
    
    // Resize handle events
    const resizeHandle = this.element.querySelector('.block-resize-handle');
    resizeHandle.addEventListener('pointerdown', this.handleResizeStart.bind(this));
    
    // Context menu and click events
    this.element.addEventListener('contextmenu', this.handleContextMenu.bind(this));
    this.element.addEventListener('click', this.handleClick.bind(this));
    
    // Keyboard events
    this.element.addEventListener('keydown', this.handleKeyDown.bind(this));
  }
  
  /**
   * Handles pointer down event to start dragging
   * @param {PointerEvent} event 
   */
  handlePointerDown(event) {
    // Ignore if clicked on resize handle
    if (event.target.classList.contains('block-resize-handle')) return;
    
    event.preventDefault();
    
    this.isDragging = true;
    this.dragStartX = event.clientX;
    this.originalStart = this.start;
    
    // Set position to relative to maintain position during drag
    this.element.style.zIndex = '10';
    
    // Add document-level event listeners
    document.addEventListener('pointermove', this.handlePointerMove.bind(this));
    document.addEventListener('pointerup', this.handlePointerUp.bind(this));
    
    // Change cursor style
    this.element.style.cursor = 'grabbing';
  }
  
  /**
   * Handles pointer move event during drag
   * @param {PointerEvent} event 
   */
  handlePointerMove(event) {
    if (!this.isDragging && !this.isResizing) return;
    
    // Get the full timeline width
    const gridRect = this.timeline.gridElement.getBoundingClientRect();
    const gridWidth = gridRect.width;
    
    if (this.isDragging) {
      // Calculate movement in hours
      const deltaX = event.clientX - this.dragStartX;
      const deltaHours = (deltaX / gridWidth) * 24;
      
      // Calculate new start time
      let newStart = this.originalStart + deltaHours;
      
      // Constrain to timeline bounds
      if (!this.isWrappingEnabled) {
        newStart = Math.max(0, Math.min(24 - this.duration, newStart));
      } else {
        // For wrap mode, constrain to 0-24 range but allow wrapping
        newStart = newStart % 24;
        if (newStart < 0) newStart += 24;
      }
      
      // Round to nearest 0.25 hour
      newStart = Math.round(newStart * 4) / 4;
      
      // Preview position
      this.start = newStart;
      this.updatePosition();
    } else if (this.isResizing) {
      // Calculate width change in hours
      const deltaX = event.clientX - this.resizeStartX;
      const deltaHours = (deltaX / gridWidth) * 24;
      
      // Calculate new duration
      let newDuration = this.originalDuration + deltaHours;
      
      // Constrain minimum duration to 0.25 hours
      newDuration = Math.max(0.25, newDuration);
      
      // If wrap is disabled, constrain to timeline bounds
      if (!this.isWrappingEnabled && this.start + newDuration > 24) {
        newDuration = 24 - this.start;
      }
      
      // Round to nearest 0.25 hour
      newDuration = Math.round(newDuration * 4) / 4;
      
      // Preview size
      this.duration = newDuration;
      this.updatePosition();
    }
  }
  
  /**
   * Handles pointer up event to end dragging
   */
  handlePointerUp() {
    if (this.isDragging || this.isResizing) {
      // Check for conflicts with other blocks (only if overlap is not allowed)
      if (this.timeline.hasConflict(this)) {
        // Revert to original position
        if (this.isDragging) {
          this.start = this.originalStart;
        } else if (this.isResizing) {
          this.duration = this.originalDuration;
        }
        
        // Show toast notification
        this.timeline.showToast('Time conflict');
      } else {
        // Commit the change to timeline
        this.timeline.updateBlock(this.id, { 
          start: this.start, 
          duration: this.duration 
        });
      }
      
      // Reset state
      this.isDragging = false;
      this.isResizing = false;
      this.element.style.zIndex = '1';
      this.element.style.cursor = 'grab';
      
      // Update position
      this.updatePosition();
      
      // Remove document-level event listeners
      document.removeEventListener('pointermove', this.handlePointerMove);
      document.removeEventListener('pointerup', this.handlePointerUp);
    }
  }
  
  /**
   * Handles resize start event
   * @param {PointerEvent} event 
   */
  handleResizeStart(event) {
    event.preventDefault();
    event.stopPropagation();
    
    this.isResizing = true;
    this.resizeStartX = event.clientX;
    this.originalDuration = this.duration;
    
    // Add document-level event listeners
    document.addEventListener('pointermove', this.handlePointerMove.bind(this));
    document.addEventListener('pointerup', this.handlePointerUp.bind(this));
  }
  
  /**
   * Handles context menu event to show edit/duplicate/delete options
   * @param {MouseEvent} event 
   */
  handleContextMenu(event) {
    event.preventDefault();
    
    // Create context menu from template
    const template = document.getElementById('block-context-menu-template');
    const contextMenu = template.content.cloneNode(true).querySelector('.context-menu');
    
    // Position the menu
    contextMenu.style.left = `${event.clientX}px`;
    contextMenu.style.top = `${event.clientY}px`;
    
    // Add event listeners to buttons
    contextMenu.querySelector('.edit-block').addEventListener('click', () => {
      this.timeline.editBlock(this.id);
      document.body.removeChild(contextMenu);
    });
    
    contextMenu.querySelector('.duplicate-block').addEventListener('click', () => {
      this.timeline.duplicateBlock(this.id);
      document.body.removeChild(contextMenu);
    });
    
    contextMenu.querySelector('.delete-block').addEventListener('click', () => {
      this.timeline.removeBlock(this.id);
      document.body.removeChild(contextMenu);
    });
    
    // Add click outside to close
    const closeMenu = (e) => {
      if (!contextMenu.contains(e.target)) {
        document.body.removeChild(contextMenu);
        document.removeEventListener('click', closeMenu);
      }
    };
    
    // Add to DOM
    document.body.appendChild(contextMenu);
    
    // Add event listener after a short delay to prevent immediate closing
    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 10);
  }
  
  /**
   * Handles click event on block (shows same context menu)
   * @param {MouseEvent} event 
   */
  handleClick(event) {
    // Simulate a context menu click at the center of the block
    const rect = this.element.getBoundingClientRect();
    const fakeEvent = {
      preventDefault: () => {},
      clientX: rect.left + rect.width / 2,
      clientY: rect.top - 10
    };
    
    this.handleContextMenu(fakeEvent);
  }
  
  /**
   * Handles keyboard events for accessibility
   * @param {KeyboardEvent} event 
   */
  handleKeyDown(event) {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        if (this.start > 0) {
          this.start = Math.max(0, this.start - 0.25);
          if (!this.timeline.hasConflict(this)) {
            this.timeline.updateBlock(this.id, { start: this.start });
          } else {
            this.start = this.start + 0.25;
            this.timeline.showToast('Time conflict');
          }
        }
        break;
        
      case 'ArrowRight':
        event.preventDefault();
        if (this.start < 24 - this.duration || this.isWrappingEnabled) {
          this.start = this.isWrappingEnabled ? (this.start + 0.25) % 24 : Math.min(24 - this.duration, this.start + 0.25);
          if (!this.timeline.hasConflict(this)) {
            this.timeline.updateBlock(this.id, { start: this.start });
          } else {
            this.start = this.start - 0.25;
            if (this.start < 0) this.start += 24;
            this.timeline.showToast('Time conflict');
          }
        }
        break;
        
      case 'Delete':
        event.preventDefault();
        this.timeline.removeBlock(this.id);
        break;
    }
    
    this.updatePosition();
  }
  
  /**
   * Updates the wrap-around setting
   * @param {boolean} isEnabled 
   */
  setWrappingEnabled(isEnabled) {
    this.isWrappingEnabled = isEnabled;
    this.updatePosition();
  }
  
  /**
   * Removes the block elements from the DOM
   */
  remove() {
    if (this.element) {
      this.element.remove();
    }
    
    if (this.wrapElement) {
      this.wrapElement.remove();
    }
    
    if (this.labelArrow) {
      this.labelArrow.remove();
    }
  }
  
  /**
   * Updates block properties and refreshes its display
   * @param {Object} data - Block data to update
   */
  update(data) {
    if (data.title !== undefined) this.title = data.title;
    if (data.start !== undefined) this.start = data.start;
    if (data.duration !== undefined) this.duration = data.duration;
    if (data.color !== undefined) this.color = data.color;
    
    this.updatePosition();
  }
  
  /**
   * Creates a duplicate of this block with new ID
   * @param {string} newId - New ID for the duplicate
   * @returns {Object} Data for the new block
   */
  duplicate(newId) {
    return {
      id: newId,
      title: this.title,
      start: (this.start + this.duration) % 24,
      duration: this.duration,
      color: this.color
    };
  }
  
  /**
   * Serializes the block data
   * @returns {Object} Block data for serialization
   */
  serialize() {
    return {
      id: this.id,
      title: this.title,
      start: this.start,
      duration: this.duration,
      color: this.color
    };
  }
}