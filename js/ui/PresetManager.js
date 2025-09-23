/**
 * Module for managing timeline presets UI
 */
import { showToast } from './Toast.js';
import { showInputDialog, showConfirmDialog } from './Modal.js';

/**
 * Initializes the preset manager UI elements
 * @param {Object} timeline - Timeline instance
 * @param {Object} storage - Storage instance
 */
export function initPresetManager(timeline, storage) {
  const saveButton = document.querySelector('.btn-save');
  const presetSelect = document.getElementById('preset-select');
  const presetContainer = document.getElementById('preset-container');
  
  if (!saveButton || !presetSelect || !presetContainer) {
    console.error('Preset UI elements not found');
    return;
  }
  
  // Save preset button
  saveButton.addEventListener('click', () => {
    promptForPresetName(timeline, storage);
  });
  
  // Load preset select
  presetSelect.addEventListener('change', () => {
    const selectedValue = presetSelect.value;
    if (selectedValue) {
      loadPreset(selectedValue, timeline, storage);
      presetSelect.value = ''; // Reset select to default
    }
  });
  
  // Listen for preset updates to add delete buttons
  document.addEventListener('presets:updated', (event) => {
    updatePresetsWithDeleteButtons(event.detail.presets, timeline, storage);
  });
  
  // Trigger initial population of preset UI with delete buttons
  const initialPresets = storage.getPresets();
  updatePresetsWithDeleteButtons(initialPresets, timeline, storage);
}

/**
 * Prompts user for a preset name and saves it
 * @param {Object} timeline - Timeline instance
 * @param {Object} storage - Storage instance
 */
function promptForPresetName(timeline, storage) {
  showInputDialog(
    'Save Preset',
    'Enter a name for this preset:',
    'My Preset',
    '',
    (presetName) => {
      const timelineData = timeline.serialize();

      if (storage.savePreset(presetName, timelineData)) {
        showToast(`Preset "${presetName}" saved`, { type: 'success' });
      } else {
        showToast('Error saving preset', { type: 'error' });
      }
    }
  );
}

/**
 * Updates the preset selector to include delete buttons
 * @param {Array} presets - Array of preset objects
 * @param {Object} timeline - Timeline instance
 * @param {Object} storage - Storage instance
 */
function updatePresetsWithDeleteButtons(presets, timeline, storage) {
  if (!presets || !Array.isArray(presets)) return;
  
  // Get the DOM elements
  const presetContainer = document.getElementById('preset-container');
  const presetSelect = document.getElementById('preset-select');
  
  if (!presetContainer || !presetSelect) return;
  
  // Create a custom dropdown with delete buttons
  let customContainer = document.querySelector('.custom-preset-container');
  let presetButton = document.querySelector('.preset-button');
  
  if (!customContainer) {
    // Create a container for the custom dropdown
    customContainer = document.createElement('div');
    customContainer.className = 'custom-preset-container';
    customContainer.style.position = 'absolute';
    customContainer.style.top = '100%';
    customContainer.style.left = '0';
    customContainer.style.width = '100%';
    customContainer.style.backgroundColor = 'var(--neumorph-bg)';
    customContainer.style.border = 'none';
    customContainer.style.borderRadius = 'var(--neumorph-border-radius)';
    customContainer.style.boxShadow = 'var(--neumorph-shadow-distance) var(--neumorph-shadow-distance) calc(var(--neumorph-shadow-distance) * 2) var(--neumorph-shadow-dark), calc(-1 * var(--neumorph-shadow-distance)) calc(-1 * var(--neumorph-shadow-distance)) calc(var(--neumorph-shadow-distance) * 2) var(--neumorph-light)';
    customContainer.style.zIndex = '50';
    customContainer.style.maxHeight = '200px';
    // Only show scrollbar when needed (after 3 items)
    customContainer.style.overflowY = presets.length > 3 ? 'auto' : 'hidden';
    customContainer.style.display = 'none';
    
    // Add it to the preset container
    presetContainer.appendChild(customContainer);
    
    // Replace select with a button that shows the custom dropdown
    presetButton = document.createElement('button');
    presetButton.className = 'preset-button';
    presetButton.style.width = '150px'; // Make wider
    presetButton.style.textAlign = 'left';
    presetButton.style.padding = '0.375rem 0.75rem';
    presetButton.style.border = 'none'; // No border for neomorphic style
    presetButton.style.borderRadius = 'var(--neumorph-border-radius)';
    presetButton.style.backgroundColor = 'var(--neumorph-bg)';
    presetButton.style.cursor = 'pointer';
    presetButton.textContent = 'Load'; // Simplified label
    presetButton.setAttribute('aria-label', 'Load preset');
    presetButton.setAttribute('aria-haspopup', 'true');
    presetButton.setAttribute('aria-expanded', 'false');
    
    // Hide the original select and insert the button
    presetSelect.style.display = 'none';
    presetContainer.insertBefore(presetButton, presetSelect);
    
    // Button click handler
    presetButton.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = customContainer.style.display === 'block';
      customContainer.style.display = isVisible ? 'none' : 'block';
      presetButton.setAttribute('aria-expanded', isVisible ? 'false' : 'true');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!presetContainer.contains(e.target)) {
        customContainer.style.display = 'none';
        presetButton.setAttribute('aria-expanded', 'false');
      }
    });
  } else {
    // Update scrollbar visibility based on item count
    customContainer.style.overflowY = presets.length > 3 ? 'auto' : 'hidden';
  }
  
  // Clear existing items
  customContainer.innerHTML = '';
  
  // Add "no presets" message if empty
  if (presets.length === 0) {
    const noPresets = document.createElement('div');
    noPresets.className = 'preset-item';
    noPresets.style.padding = '0.5rem';
    noPresets.style.color = 'var(--light-text)';
    noPresets.textContent = 'No saved presets';
    customContainer.appendChild(noPresets);
    return;
  }
  
  // Add items for each preset
  presets.forEach(preset => {
    const item = document.createElement('div');
    item.className = 'preset-item';
    item.style.display = 'flex';
    item.style.justifyContent = 'space-between';
    item.style.alignItems = 'center';
    item.style.padding = '0.5rem 0.75rem';
    item.style.cursor = 'pointer';
    item.style.borderBottom = '1px solid var(--border-color)';
    item.style.backgroundColor = 'var(--neumorph-bg)';
    item.style.transition = 'all var(--transition-speed) ease';
    item.setAttribute('role', 'option');
    item.setAttribute('tabindex', '0');
    
    // Preset name
    const nameSpan = document.createElement('span');
    nameSpan.textContent = preset.name;
    item.appendChild(nameSpan);
    
    // Delete button (only show for non-Demo presets)
    let deleteButton = null;
    if (preset.name !== 'Demo') {
      deleteButton = document.createElement('button');
      deleteButton.className = 'preset-delete';
      deleteButton.setAttribute('aria-label', `Delete preset ${preset.name}`);
      deleteButton.style.background = 'none';
      deleteButton.style.border = 'none';
      deleteButton.style.color = 'var(--error-color)';
      deleteButton.style.cursor = 'pointer';
      deleteButton.style.padding = '0.25rem';

      // Add trash icon
      const trashTemplate = document.getElementById('trash-icon-template');
      if (trashTemplate) {
        const trashIcon = trashTemplate.content.cloneNode(true).querySelector('svg');
        deleteButton.appendChild(trashIcon);
      } else {
        deleteButton.textContent = '🗑️';
      }

      // Add delete event
      deleteButton.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        deletePreset(preset.name, timeline, storage);
      });

      item.appendChild(deleteButton);
    }
    
    // Add neomorphic hover effect
    item.addEventListener('mouseenter', () => {
      item.style.backgroundColor = 'var(--neumorph-light)';
    });
    
    item.addEventListener('mouseleave', () => {
      item.style.backgroundColor = 'var(--neumorph-bg)';
    });
    
    // Add click event to load preset
    item.addEventListener('click', (e) => {
      if (!deleteButton || (e.target !== deleteButton && !deleteButton.contains(e.target))) {
        loadPreset(preset.name, timeline, storage);
        customContainer.style.display = 'none';
        presetButton.setAttribute('aria-expanded', 'false');
      }
    });
    
    // Add keyboard support
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        loadPreset(preset.name, timeline, storage);
        customContainer.style.display = 'none';
        presetButton.setAttribute('aria-expanded', 'false');
      } else if (e.key === 'Delete' && preset.name !== 'Demo') {
        e.preventDefault();
        deletePreset(preset.name, timeline, storage);
      }
    });
    
    customContainer.appendChild(item);
  });
}

/**
 * Loads a preset by name
 * @param {string} name - Preset name
 * @param {Object} timeline - Timeline instance
 * @param {Object} storage - Storage instance
 */
function loadPreset(name, timeline, storage) {
  const presetData = storage.loadPreset(name);
  
  if (presetData) {
    timeline.deserialize(presetData);
    
    // Update toggle states to match loaded preset
    document.getElementById('wrap-toggle').setAttribute('aria-pressed', presetData.isWrappingEnabled ? 'true' : 'false');
    document.getElementById('overlap-toggle').setAttribute('aria-pressed', presetData.allowOverlap ? 'true' : 'false');
    document.getElementById('time-format-toggle').setAttribute('aria-pressed', !presetData.use24HourFormat ? 'true' : 'false');
    
    showToast(`Preset "${name}" loaded`, { type: 'success' });
  } else {
    showToast('Error loading preset', { type: 'error' });
  }
}

/**
 * Deletes a preset by name
 * @param {string} name - Preset name
 * @param {Object} timeline - Timeline instance
 * @param {Object} storage - Storage instance
 */
function deletePreset(name, timeline, storage) {
  // Protect the Demo profile from deletion
  if (name === 'Demo') {
    showToast('Demo profile cannot be deleted', { type: 'error' });
    return;
  }

  showConfirmDialog(
    `Are you sure you want to delete the preset "${name}"?`,
    () => {
      if (storage.deletePreset(name)) {
        showToast(`Preset "${name}" deleted`, { type: 'success' });

        // Update UI immediately after deletion
        const updatedPresets = storage.getPresets();
        updatePresetsWithDeleteButtons(updatedPresets, timeline, storage);
      } else {
        showToast('Error deleting preset', { type: 'error' });
      }
    }
  );
}