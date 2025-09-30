/**
 * Module for managing the tasks panel UI
 */

export class TasksPanel {
  /**
   * Creates a new TasksPanel instance
   * @param {Object} timeline - Timeline instance
   */
  constructor(timeline) {
    this.timeline = timeline;
    this.panelElement = document.querySelector('.tasks-panel');
    this.listElement = document.getElementById('tasks-list');
    this.countElement = document.getElementById('tasks-count');
    this.pinButton = document.getElementById('tasks-pin');
    this.isPinned = false;

    if (!this.panelElement || !this.listElement) {
      console.error('Tasks panel elements not found');
      return;
    }

    // Initialize the panel
    this.render();

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Sets up event listeners for timeline changes and pin button
   */
  setupEventListeners() {
    // Listen for timeline changes
    document.addEventListener('timeline:save-current', () => {
      this.render();
    });

    // Listen for block updates
    document.addEventListener('block:update', () => {
      this.render();
    });

    // Listen for preset loading (when demo or other presets are loaded)
    document.addEventListener('preset:loaded', () => {
      setTimeout(() => this.render(), 100);
    });

    // Listen for format changes
    document.addEventListener('timeline:format-changed', () => {
      this.render();
    });

    // Pin button click handler
    if (this.pinButton) {
      this.pinButton.addEventListener('click', (e) => {
        e.stopPropagation();
        this.togglePin();
      });
    }
  }

  /**
   * Toggles pin state
   */
  togglePin() {
    this.isPinned = !this.isPinned;

    if (this.isPinned) {
      this.panelElement.classList.add('pinned');
    } else {
      this.panelElement.classList.remove('pinned');
    }
  }

  /**
   * Renders the tasks list
   */
  render() {
    if (!this.listElement) return;

    // Get all blocks from timeline
    const blocks = Array.from(this.timeline.blocks.values());

    // Update count
    if (this.countElement) {
      this.countElement.textContent = blocks.length;
    }

    // Clear the list
    this.listElement.innerHTML = '';

    // If no blocks, show empty state
    if (blocks.length === 0) {
      this.renderEmptyState();
      return;
    }

    // Sort blocks by start time
    blocks.sort((a, b) => a.start - b.start);

    // Render each block
    blocks.forEach(block => {
      this.renderTaskItem(block);
    });
  }

  /**
   * Renders a single task item (minimalist note style)
   * @param {Block} block - Block instance
   */
  renderTaskItem(block) {
    const taskItem = document.createElement('div');
    taskItem.className = 'task-item';
    taskItem.setAttribute('data-block-id', block.id);

    // Set border color to match block color
    taskItem.style.borderLeftColor = block.color;

    // Create title element (just the name)
    const titleElement = document.createElement('div');
    titleElement.className = 'task-item-title';
    titleElement.textContent = block.title;

    // Append elements
    taskItem.appendChild(titleElement);

    // Add click handler to scroll to block
    taskItem.addEventListener('click', () => {
      this.scrollToBlock(block);
    });

    this.listElement.appendChild(taskItem);
  }

  /**
   * Renders empty state
   */
  renderEmptyState() {
    const emptyState = document.createElement('div');
    emptyState.className = 'tasks-list-empty';
    emptyState.textContent = 'Click the timeline to add tasks';
    this.listElement.appendChild(emptyState);
  }

  /**
   * Scrolls to a block in the timeline and highlights it
   * @param {Block} block - Block instance
   */
  scrollToBlock(block) {
    if (!block || !block.element) return;

    // Scroll the block into view
    block.element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center'
    });

    // Highlight the block temporarily
    block.element.classList.add('selected');

    // Remove highlight after 1.5 seconds
    setTimeout(() => {
      block.element.classList.remove('selected');
    }, 1500);
  }

  /**
   * Updates the panel when timeline settings change
   */
  update() {
    this.render();
  }
}

/**
 * Initializes the tasks panel
 * @param {Object} timeline - Timeline instance
 * @returns {TasksPanel} - TasksPanel instance
 */
export function initTasksPanel(timeline) {
  return new TasksPanel(timeline);
}