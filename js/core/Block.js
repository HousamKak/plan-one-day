/**
 * Represents a timeline block with drag and resize capabilities
 */
import { formatTime } from '../utils/TimeUtils.js';

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
   * @param {boolean} use24HourFormat - Whether to use 24-hour time format
   */
  constructor(data, timeline, isWrappingEnabled = false, use24HourFormat = true) {
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
    this.isLocked = data.isLocked || false;
    this.timeline = timeline;
    this.isWrappingEnabled = isWrappingEnabled;
    this.use24HourFormat = use24HourFormat;
    
    // DOM elements
    this.element = null;
    this.labelArrow = null;
    this.wrapElement = null;
    
    // Drag state
    this.isDragging = false;
    this.dragStartX = 0;
    this.originalStart = 0;
    
    // Resize state for right handle
    this.isResizing = false;
    this.resizeStartX = 0;
    this.originalDuration = 0;
    
    // Resize state for left handle
    this.isResizingLeft = false;
    this.resizeLeftStartX = 0;
    this.originalLeft = 0;
    
    // Add property to prevent flickering during resize
    this.isResizeInProgress = false;
    this.labelShownDuringResize = false;
    
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
      this.element.appendChild(titleElement);
      
      // Create left resize handle
      const leftResizeHandle = document.createElement('div');
      leftResizeHandle.classList.add('block-resize-handle-left');
      this.element.appendChild(leftResizeHandle);
      
      // Create right resize handle
      const rightResizeHandle = document.createElement('div');
      rightResizeHandle.classList.add('block-resize-handle-right');
      this.element.appendChild(rightResizeHandle);
      
      // Add event listeners
      this.addEventListeners();
    }
    
    // Update element properties
    this.updatePosition();
    this.element.style.backgroundColor = this.color;
    this.updateLockVisuals();

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
    
    const startTime = formatTime(this.start, this.use24HourFormat);
    const endTime = formatTime((this.start + this.duration) % 24, this.use24HourFormat);
    
    // Make sure to create proper block elements
    titleElement.innerHTML = '';
    
    const titleSpan = document.createElement('span');
    titleSpan.className = 'block-title-text';
    titleSpan.textContent = this.title;
    
    const timeSpan = document.createElement('span');
    timeSpan.className = 'block-time-text';
    timeSpan.innerHTML = `${startTime} - ${endTime}`;
    
    titleElement.appendChild(titleSpan);
    titleElement.appendChild(timeSpan);
    
    if (this.labelArrow) {
      this.labelArrow.innerHTML = '';
      
      // Create container for better styling
      const labelContent = document.createElement('div');
      labelContent.className = 'label-content';
      
      const labelTitleSpan = document.createElement('span');
      labelTitleSpan.className = 'block-title-text';
      labelTitleSpan.textContent = this.title;
      
      const labelTimeSpan = document.createElement('span');
      labelTimeSpan.className = 'block-time-text';
      labelTimeSpan.innerHTML = `${startTime} - ${endTime}`;
      
      // Add to container in the desired order (title above time)
      labelContent.appendChild(labelTitleSpan);
      labelContent.appendChild(labelTimeSpan);
      
      // Add container to label
      this.labelArrow.appendChild(labelContent);
    }
    
    if (this.wrapElement) {
      const wrapTitleElement = this.wrapElement.querySelector('.block-title');
      wrapTitleElement.innerHTML = '';
      
      const wrapTitleSpan = document.createElement('span');
      wrapTitleSpan.className = 'block-title-text';
      wrapTitleSpan.textContent = this.title;
      
      const wrapTimeSpan = document.createElement('span');
      wrapTimeSpan.className = 'block-time-text';
      wrapTimeSpan.innerHTML = `${startTime} - ${endTime}`;
      
      wrapTitleElement.appendChild(wrapTitleSpan);
      wrapTitleElement.appendChild(wrapTimeSpan);
    }
  }
  
  /**
   * Updates the label visibility and creates arrow label if needed
   */
  updateLabelVisibility() {
    const titleElement = this.element.querySelector('.block-title');
    
    // Always make title visible initially if not resizing
    if (!this.isResizeInProgress) {
      titleElement.style.opacity = '1';
    }
    
    // Make sure measurements are accurate
    setTimeout(() => {
      const blockWidth = this.element.offsetWidth;
      const titleWidth = titleElement.scrollWidth;
      
      // Skip if measurements aren't valid
      if (blockWidth === 0 || titleWidth === 0) {
        return;
      }
      
      if (blockWidth < titleWidth + 12) {
        // SMALL BLOCK: Needs external label
        
        // First create and prepare the label arrow if it doesn't exist
        if (!this.labelArrow) {
          this.labelArrow = document.createElement('div');
          this.labelArrow.classList.add('label-arrow');
          this.labelArrow.setAttribute('data-block-id', this.id);
          this.labelArrow.style.backgroundColor = this.color;
          
          // Create container for better styling
          const labelContent = document.createElement('div');
          labelContent.className = 'label-content';
          
          // Copy content from title element
          const titleTextElem = titleElement.querySelector('.block-title-text');
          const timeTextElem = titleElement.querySelector('.block-time-text');
          
          if (titleTextElem && timeTextElem) {
            const labelTitle = document.createElement('span');
            labelTitle.className = 'block-title-text';
            labelTitle.textContent = titleTextElem.textContent;
            
            const labelTime = document.createElement('span');
            labelTime.className = 'block-time-text';
            labelTime.innerHTML = timeTextElem.innerHTML;
            
            labelContent.appendChild(labelTitle);
            labelContent.appendChild(labelTime);
            this.labelArrow.appendChild(labelContent);
          }
          
          // Add to DOM
          this.timeline.gridElement.appendChild(this.labelArrow);
        }
        
        // Position the label arrow before making it visible
        const rect = this.element.getBoundingClientRect();
        const gridRect = this.timeline.gridElement.getBoundingClientRect();
        const blockCenter = rect.left + (rect.width / 2) - gridRect.left;
        
        this._naturalCenter = blockCenter;
        this.labelArrow.style.left = `${blockCenter}px`;
        
        // Make the label visible first
        this.labelArrow.style.display = 'block';
        
        // Track that label was shown during resize
        if (this.isResizeInProgress) {
          this.labelShownDuringResize = true;
        }
        
        // Only hide title if not currently resizing or if we're consistent with it being hidden
        if (!this.isResizeInProgress || this.labelShownDuringResize) {
          titleElement.style.opacity = '0';
        }
        
        // Update overall label positions
        this.timeline.updateLabelPositions();
      } else {
        // LARGE BLOCK: Show internal title
        
        // Only show title if not currently resizing or if we're consistent with it being shown
        if (!this.isResizeInProgress || !this.labelShownDuringResize) {
          titleElement.style.opacity = '1';
        }
        
        // Only hide label if not resizing or if we're just starting to resize
        if (!this.isResizeInProgress) {
          if (this.labelArrow) {
            this.labelArrow.style.display = 'none';
          }
          this.labelShownDuringResize = false;
        }
      }
    }, 0);
  }
  
  /**
   * Positions the label arrow with top/bottom alternating strategy
   * @param {Object} options - Positioning options
   * @param {string} options.position - 'top' or 'bottom' position
   */
  positionLabel(options = {}) {
    if (!this.labelArrow || !this._naturalCenter) return;

    const position = options.position || 'top'; // Default to top if not specified

    // Set the horizontal position centered over the block
    this.labelArrow.style.left = `${this._naturalCenter}px`;

    // Remove any previous position classes
    this.labelArrow.classList.remove('label-arrow-top', 'label-arrow-bottom');

    // Get the timeline grid and block positions
    const gridRect = this.timeline.gridElement.getBoundingClientRect();
    const blockRect = this.element.getBoundingClientRect();

    if (position === 'bottom') {
      // Position below the block with a fixed offset
      this.labelArrow.style.bottom = 'auto'; // Clear bottom position
      this.labelArrow.style.top = `${blockRect.bottom - gridRect.top + 20}px`; // 20px below the block
      this.labelArrow.classList.add('label-arrow-bottom');
    } else {
      // Position above the block with a fixed offset
      this.labelArrow.style.top = 'auto'; // Clear top position
      this.labelArrow.style.bottom = `${gridRect.bottom - blockRect.top + 20}px`; // 20px above the block
      this.labelArrow.classList.add('label-arrow-top');
    }

    // Create a lighter version of the block color for the label
    const lighterColor = this.adjustColorBrightness(this.color, 15); // Make 15% lighter

    this.labelArrow.style.backgroundColor = lighterColor;
    this.labelArrow.style.borderColor = lighterColor;
  }
  
  /**
   * Adjusts color brightness by the given percentage
   * @param {string} color - HSL color string
   * @param {number} percent - Percentage to lighten (positive) or darken (negative)
   * @returns {string} - Adjusted HSL color
   */
  adjustColorBrightness(color, percent) {
    // Parse HSL values
    const match = color.match(/hsl\((\d+),\s*([\d.]+)%,\s*([\d.]+)%\)/);
    if (!match) return color;
    
    let h = parseInt(match[1]);
    let s = parseFloat(match[2]);
    let l = parseFloat(match[3]);
    
    // Adjust lightness
    l = Math.min(100, Math.max(0, l + percent));
    
    return `hsl(${h}, ${s}%, ${l}%)`;
  }
  
  /**
   * Adds event listeners for drag, resize, and context menu
   */
  addEventListeners() {
    // Pointer events for drag
    this.element.addEventListener('pointerdown', this.handlePointerDown.bind(this));
    
    // Resize handle events for right side
    const rightResizeHandle = this.element.querySelector('.block-resize-handle-right');
    rightResizeHandle.addEventListener('pointerdown', this.handleResizeStart.bind(this));
    
    // Resize handle events for left side
    const leftResizeHandle = this.element.querySelector('.block-resize-handle-left');
    leftResizeHandle.addEventListener('pointerdown', this.handleResizeLeftStart.bind(this));
    
    // Context menu event only (not click)
    this.element.addEventListener('contextmenu', this.handleContextMenu.bind(this));
    
    // Keyboard events
    this.element.addEventListener('keydown', this.handleKeyDown.bind(this));
  }
  
  /**
   * Handles pointer down event to start dragging
   * @param {PointerEvent} event
   */
  handlePointerDown(event) {
    // Ignore if block is locked
    if (this.isLocked) {
      return;
    }

    // Ignore if clicked on resize handle
    if (event.target.classList.contains('block-resize-handle-left') ||
        event.target.classList.contains('block-resize-handle-right')) {
      return;
    }

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
   * Handles pointer move event during drag or resize
   * @param {PointerEvent} event 
   */
  handlePointerMove(event) {
    if (!this.isDragging && !this.isResizing && !this.isResizingLeft) return;
    
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
      // Right resize handling
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
    } else if (this.isResizingLeft) {
      // Left resize handling
      // Calculate width change in hours
      const deltaX = event.clientX - this.resizeLeftStartX;
      const deltaHours = (deltaX / gridWidth) * 24;
      
      // Calculate new start and duration
      let newStart = this.originalStart + deltaHours;
      let newDuration = this.originalDuration - deltaHours;
      
      // Constrain minimum duration to 0.25 hours
      if (newDuration < 0.25) {
        newDuration = 0.25;
        newStart = this.originalStart + this.originalDuration - 0.25;
      }
      
      // Constrain to timeline bounds
      if (!this.isWrappingEnabled) {
        newStart = Math.max(0, newStart);
      } else {
        // For wrap mode, constrain to 0-24 range but allow wrapping
        newStart = newStart % 24;
        if (newStart < 0) newStart += 24;
      }
      
      // Round to nearest 0.25 hour
      newStart = Math.round(newStart * 4) / 4;
      newDuration = Math.round(newDuration * 4) / 4;
      
      // Preview position and size
      this.start = newStart;
      this.duration = newDuration;
      this.updatePosition();
    }
  }
  
  /**
   * Handles pointer up event to end dragging or resizing
   */
  handlePointerUp() {
    if (this.isDragging || this.isResizing || this.isResizingLeft) {
      // Check for conflicts with other blocks (only if overlap is not allowed)
      if (this.timeline.hasConflict(this)) {
        // Revert to original position/size
        if (this.isDragging) {
          this.start = this.originalStart;
        } else if (this.isResizing) {
          this.duration = this.originalDuration;
        } else if (this.isResizingLeft) {
          this.start = this.originalStart;
          this.duration = this.originalDuration;
        }
        
        // Show toast notification
        this.timeline.showConflictNotification();
      } else {
        // Commit the change to timeline
        this.timeline.updateBlock(this.id, { 
          start: this.start, 
          duration: this.duration 
        });
      }
      
      // Reset resize state
      const wasResizing = this.isResizing || this.isResizingLeft;
      this.isResizeInProgress = false;
      
      // Dispatch resize end event if we were resizing
      if (wasResizing) {
        document.dispatchEvent(new CustomEvent('block:resize:end', {
          detail: { blockId: this.id }
        }));
      }
      
      // Reset state
      this.isDragging = false;
      this.isResizing = false;
      this.isResizingLeft = false;
      this.element.style.zIndex = '1';
      this.element.style.cursor = 'grab';
      
      // Finalize label visibility based on current dimensions
      this.updateLabelVisibility();
      
      // Remove document-level event listeners
      document.removeEventListener('pointermove', this.handlePointerMove);
      document.removeEventListener('pointerup', this.handlePointerUp);
      
      // Update label positions to avoid overlaps after drag/resize is complete
      setTimeout(() => {
        this.timeline.updateLabelPositions();
      }, 50);
    }
  }
  
  /**
   * Handles resize start event for right handle
   * @param {PointerEvent} event 
   */
  handleResizeStart(event) {
    event.preventDefault();
    event.stopPropagation();
    
    this.isResizing = true;
    this.isResizeInProgress = true;
    this.labelShownDuringResize = false; // Reset at start of resize
    this.resizeStartX = event.clientX;
    this.originalDuration = this.duration;
    
    // Dispatch resize start event
    document.dispatchEvent(new CustomEvent('block:resize:start', {
      detail: { blockId: this.id }
    }));
    
    // Add document-level event listeners
    document.addEventListener('pointermove', this.handlePointerMove.bind(this));
    document.addEventListener('pointerup', this.handlePointerUp.bind(this));
  }
  
  /**
   * Handles resize start event for left handle
   * @param {PointerEvent} event 
   */
  handleResizeLeftStart(event) {
    event.preventDefault();
    event.stopPropagation();
    
    this.isResizingLeft = true;
    this.isResizeInProgress = true;
    this.labelShownDuringResize = false; // Reset at start of resize
    this.resizeLeftStartX = event.clientX;
    this.originalStart = this.start;
    this.originalDuration = this.duration;
    
    // Dispatch resize start event
    document.dispatchEvent(new CustomEvent('block:resize:start', {
      detail: { blockId: this.id }
    }));
    
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
    
    // Dispatch event for the context menu handler
    const contextMenuEvent = new CustomEvent('block:context-menu', {
      detail: {
        blockId: this.id,
        x: event.clientX,
        y: event.clientY
      },
      bubbles: true
    });
    
    this.element.dispatchEvent(contextMenuEvent);
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
            this.timeline.showConflictNotification();
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
            this.timeline.showConflictNotification();
          }
        }
        break;
        
      case 'Delete':
        event.preventDefault();
        this.timeline.removeBlock(this.id);
        break;
    }
    
    this.updatePosition();
    
    // Update label positions after keyboard movement
    setTimeout(() => {
      this.timeline.updateLabelPositions();
    }, 50);
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
   * Updates the time format setting
   * @param {boolean} use24Hour 
   */
  setTimeFormat(use24Hour) {
    this.use24HourFormat = use24Hour;
    this.updatePosition(); // This will update labels with the new format
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
    if (data.use24HourFormat !== undefined) this.use24HourFormat = data.use24HourFormat;
    
    this.updatePosition();
  }
  
  /**
   * Creates a duplicate of this block with new ID
   * @param {string} newId - New ID for the new block
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
   * Toggles the lock state of the block
   */
  toggleLock() {
    this.isLocked = !this.isLocked;
    this.updateLockVisuals();

    // Don't save state immediately to prevent repositioning
    // We'll save it later when needed
    // this.timeline.saveCurrentState();

    return this.isLocked;
  }

  /**
   * Sets the lock state of the block
   * @param {boolean} locked - Whether the block should be locked
   */
  setLocked(locked) {
    this.isLocked = Boolean(locked);
    this.updateLockVisuals();

    // Save state change
    this.timeline.saveCurrentState();
  }

  /**
   * Updates the visual appearance based on lock state
   */
  updateLockVisuals() {
    if (!this.element) return;

    // Add/remove locked class with minimal CSS for debugging
    console.log(`About to change lock visual for ${this.title} to ${this.isLocked}`);

    if (this.isLocked) {
      this.element.classList.add('block-locked');
      this.element.setAttribute('aria-label', `${this.title} (locked)`);
    } else {
      this.element.classList.remove('block-locked');
      this.element.setAttribute('aria-label', this.title);
    }

    // Update resize handles
    const leftHandle = this.element.querySelector('.block-resize-handle-left');
    const rightHandle = this.element.querySelector('.block-resize-handle-right');

    if (leftHandle && rightHandle) {
      if (this.isLocked) {
        leftHandle.style.display = 'none';
        rightHandle.style.display = 'none';
      } else {
        leftHandle.style.display = '';
        rightHandle.style.display = '';
      }
    }
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
      color: this.color,
      isLocked: this.isLocked
    };
  }
}