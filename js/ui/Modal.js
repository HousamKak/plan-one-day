/**
 * Module for handling modal dialogs with accessibility support
 */
import { showToast } from './Toast.js';
import { hexToHsl } from '../utils/ColorUtils.js';

/**
 * Opens a block creation/editing modal
 * @param {number} startHour - Starting hour for the new block
 * @param {Object} timeline - Timeline instance
 * @param {string|null} blockId - ID of block to edit (null for creation)
 */
export function openBlockModal(startHour, timeline, blockId = null) {
  // Remove any existing modals first
  const existingModals = document.querySelectorAll('.modal');
  existingModals.forEach(modal => {
    document.body.removeChild(modal);
  });
  
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
  
  // Center the modal content properly
  const modalContent = modal.querySelector('.modal-content');
  modalContent.style.maxWidth = '400px';
  modalContent.style.width = '90%';
  modalContent.style.margin = 'auto';
  
  // Set values if editing
  if (blockId) {
    const block = timeline.getBlock(blockId);
    if (block) {
      titleInput.value = block.title;
      durationInput.value = block.duration;
      
      // Convert HSL to hex for the color input
      try {
        const hexColor = timeline.hslToHex(block.color);
        colorInput.value = hexColor;
        colorPreview.style.backgroundColor = hexColor;
      } catch (error) {
        console.error('Error converting color:', error);
        colorInput.value = '#3a86ff'; // Default color
        colorPreview.style.backgroundColor = '#3a86ff';
      }
    }
  } else {
    // For new blocks, generate a color based on existing blocks
    const hexColor = timeline.generateColor();
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
    
    // Validate inputs
    if (!titleInput.value.trim()) {
      showToast('Please enter a block title');
      return;
    }
    
    if (isNaN(durationInput.value) || parseFloat(durationInput.value) <= 0) {
      showToast('Duration must be a positive number');
      return;
    }
    
    // Create block data object
    const blockData = {
      title: titleInput.value.trim(),
      duration: parseFloat(durationInput.value),
      color: colorInput.value
    };
    
    if (blockId) {
      // Update existing block
      timeline.updateBlock(blockId, blockData);
    } else {
      // Create new block
      blockData.start = startHour;
      timeline.addBlock(blockData);
    }
    
    // Close modal
    closeModal(modal);
    
    // Update label positions after a short delay to ensure DOM is updated
    setTimeout(() => {
      timeline.updateLabelPositions();
    }, 100);
  });
  
  // Cancel button handler
  modal.querySelector('.cancel-btn').addEventListener('click', () => {
    closeModal(modal);
  });
  
  // Close on escape key
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal(modal);
    }
  });
  
  // Close on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal(modal);
    }
  });
  
  // Append modal to body
  document.body.appendChild(modal);
  
  // Focus title input
  titleInput.focus();
  
  // Add fade-in animation
  setTimeout(() => {
    modal.style.opacity = '1';
    modalContent.style.transform = 'translateY(0)';
  }, 10);
}

/**
 * Closes a modal and dispatches a closed event
 * @param {HTMLElement} modal - Modal element to close
 */
function closeModal(modal) {
  if (!modal || !modal.parentNode) return;
  
  // Add fade-out animation
  modal.style.opacity = '0';
  const modalContent = modal.querySelector('.modal-content');
  if (modalContent) {
    modalContent.style.transform = 'translateY(20px)';
  }
  
  // Remove after animation
  setTimeout(() => {
    if (modal.parentNode) {
      document.body.removeChild(modal);
      
      // Dispatch modal closed event
      document.dispatchEvent(new CustomEvent('modal:closed'));
    }
  }, 300);
}

/**
 * Shows a confirmation dialog
 * @param {string} message - Message to display
 * @param {Function} onConfirm - Callback for confirmation
 * @param {Function} onCancel - Callback for cancellation
 */
export function showConfirmDialog(message, onConfirm, onCancel = null) {
  // Create modal element
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.opacity = '0';
  
  modal.innerHTML = `
    <div class="modal-content" style="transform: translateY(20px);">
      <h2>Confirm</h2>
      <p>${message}</p>
      <div class="form-buttons">
        <button type="button" class="cancel-btn">Cancel</button>
        <button type="button" class="submit-btn confirm-btn">Confirm</button>
      </div>
    </div>
  `;
  
  // Add to DOM
  document.body.appendChild(modal);
  
  // Add fade-in animation
  setTimeout(() => {
    modal.style.opacity = '1';
    modal.querySelector('.modal-content').style.transform = 'translateY(0)';
  }, 10);
  
  // Add event handlers
  const confirmBtn = modal.querySelector('.confirm-btn');
  const cancelBtn = modal.querySelector('.cancel-btn');
  
  confirmBtn.addEventListener('click', () => {
    closeModal(modal);
    if (onConfirm) onConfirm();
  });
  
  cancelBtn.addEventListener('click', () => {
    closeModal(modal);
    if (onCancel) onCancel();
  });
  
  // Close on escape key
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal(modal);
      if (onCancel) onCancel();
    }
  });
  
  // Close on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal(modal);
      if (onCancel) onCancel();
    }
  });
  
  // Focus the confirm button
  confirmBtn.focus();
}

/**
 * Initializes keyboard handlers for modal accessibility
 */
export function setupModalKeyboardHandling() {
  // Listen for any modal being added to the DOM
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.classList && node.classList.contains('modal')) {
          trapFocusInModal(node);
        }
      });
    });
  });
  
  // Start observing the body for modals being added
  observer.observe(document.body, { childList: true });
}

/**
 * Sets up keyboard trap for modal accessibility
 * @param {HTMLElement} modal - Modal element
 */
function trapFocusInModal(modal) {
  // Find all focusable elements
  const focusableElements = modal.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  if (focusableElements.length === 0) return;
  
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  
  // Focus the first element
  firstElement.focus();
  
  // Handle keyboard navigation
  modal.addEventListener('keydown', (e) => {
    // Close on Escape
    if (e.key === 'Escape') {
      closeModal(modal);
      return;
    }
    
    // Tab trap
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  });
}