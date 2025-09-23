/**
 * Module for handling context menus
 */
import { openBlockModal, showConfirmDialog } from './Modal.js';
import { showToast } from './Toast.js';

/**
 * Initializes the context menu functionality for blocks
 * @param {Object} timeline - Timeline instance
 */
export function initContextMenu(timeline) {
  // Listen for custom context menu events from blocks
  document.addEventListener('block:context-menu', (event) => {
    const { blockId, x, y } = event.detail;
    showBlockContextMenu(blockId, x, y, timeline);
  });
  
  // Listen for clicks outside of context menu to close it
  document.addEventListener('click', (e) => {
    const contextMenu = document.querySelector('.context-menu');
    if (contextMenu && !contextMenu.contains(e.target)) {
      contextMenu.remove();
    }
  });
  
  // Close context menu on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const contextMenu = document.querySelector('.context-menu');
      if (contextMenu) {
        contextMenu.remove();
      }
    }
  });
}

/**
 * Shows the context menu for a block
 * @param {string} blockId - ID of the block
 * @param {number} x - X position for the menu
 * @param {number} y - Y position for the menu
 * @param {Object} timeline - Timeline instance
 */
function showBlockContextMenu(blockId, x, y, timeline) {
  // Create context menu from template
  const template = document.getElementById('block-context-menu-template');
  if (!template) {
    console.error('Context menu template not found');
    return;
  }
  
  // Remove any existing context menus
  const existingMenu = document.querySelector('.context-menu');
  if (existingMenu) {
    existingMenu.remove();
  }
  
  const contextMenu = template.content.cloneNode(true).querySelector('.context-menu');

  // Get the block to check its lock state
  const block = timeline.getBlock(blockId);

  // Position the menu
  contextMenu.style.left = `${x}px`;
  contextMenu.style.top = `${y}px`;

  // Update lock button text based on current state
  const lockButton = contextMenu.querySelector('.toggle-lock');
  if (block && block.isLocked) {
    lockButton.textContent = '🔓 Unlock';
  } else {
    lockButton.textContent = '🔒 Lock';
  }

  // Add event listeners to buttons
  contextMenu.querySelector('.edit-block').addEventListener('click', () => {
    editBlock(blockId, timeline);
    contextMenu.remove();
  });

  contextMenu.querySelector('.duplicate-block').addEventListener('click', () => {
    duplicateBlock(blockId, timeline);
    contextMenu.remove();
  });

  lockButton.addEventListener('click', () => {
    toggleBlockLock(blockId, timeline);
    contextMenu.remove();
  });

  contextMenu.querySelector('.delete-block').addEventListener('click', () => {
    deleteBlock(blockId, timeline);
    contextMenu.remove();
  });
  
  // Add to DOM
  document.body.appendChild(contextMenu);
  
  // Reposition if off screen
  repositionMenuIfNeeded(contextMenu);
  
  // Add keyboard navigation
  addKeyboardNavigation(contextMenu);
}

/**
 * Repositions the menu if it's off screen
 * @param {HTMLElement} menu - Context menu element
 */
function repositionMenuIfNeeded(menu) {
  const rect = menu.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Check if menu is off screen horizontally
  if (rect.right > viewportWidth) {
    menu.style.left = `${viewportWidth - rect.width - 10}px`;
  }
  
  // Check if menu is off screen vertically
  if (rect.bottom > viewportHeight) {
    menu.style.top = `${viewportHeight - rect.height - 10}px`;
  }
}

/**
 * Adds keyboard navigation to context menu
 * @param {HTMLElement} menu - Context menu element
 */
function addKeyboardNavigation(menu) {
  const menuItems = Array.from(menu.querySelectorAll('button'));
  if (menuItems.length === 0) return;
  
  // Focus the first item
  menuItems[0].focus();
  
  // Handle keyboard navigation
  menu.addEventListener('keydown', (e) => {
    const currentIndex = menuItems.findIndex(item => item === document.activeElement);
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        menuItems[(currentIndex + 1) % menuItems.length].focus();
        break;
      case 'ArrowUp':
        e.preventDefault();
        menuItems[(currentIndex - 1 + menuItems.length) % menuItems.length].focus();
        break;
      case 'Home':
        e.preventDefault();
        menuItems[0].focus();
        break;
      case 'End':
        e.preventDefault();
        menuItems[menuItems.length - 1].focus();
        break;
    }
  });
}

/**
 * Edits a block
 * @param {string} blockId - Block ID
 * @param {Object} timeline - Timeline instance
 */
function editBlock(blockId, timeline) {
  const block = timeline.getBlock(blockId);
  if (!block) {
    showToast('Block not found', { type: 'error' });
    return;
  }
  
  openBlockModal(block.start, timeline, blockId);
}

/**
 * Duplicates a block
 * @param {string} blockId - Block ID
 * @param {Object} timeline - Timeline instance
 */
function duplicateBlock(blockId, timeline) {
  const newBlockId = timeline.duplicateBlock(blockId);
  
  if (newBlockId) {
    showToast('Block duplicated', { type: 'success' });
  } else {
    showToast('Failed to duplicate block', { type: 'error' });
  }
}

/**
 * Toggles the lock state of a block
 * @param {string} blockId - Block ID
 * @param {Object} timeline - Timeline instance
 */
function toggleBlockLock(blockId, timeline) {
  const block = timeline.getBlock(blockId);
  if (!block) {
    showToast('Block not found', { type: 'error' });
    return;
  }

  const wasLocked = block.isLocked;
  block.toggleLock();

  if (block.isLocked && !wasLocked) {
    showToast(`"${block.title}" locked`, { type: 'success' });
  } else if (!block.isLocked && wasLocked) {
    showToast(`"${block.title}" unlocked`, { type: 'success' });
  }
}

/**
 * Deletes a block
 * @param {string} blockId - Block ID
 * @param {Object} timeline - Timeline instance
 */
function deleteBlock(blockId, timeline) {
  const block = timeline.getBlock(blockId);
  const blockTitle = block ? block.title : 'this block';

  showConfirmDialog(
    `Are you sure you want to delete "${blockTitle}"?`,
    () => {
      if (timeline.removeBlock(blockId)) {
        showToast('Block deleted');
      } else {
        showToast('Failed to delete block', { type: 'error' });
      }
    }
  );
}