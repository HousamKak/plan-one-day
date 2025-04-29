/**
 * Storage class for handling local storage operations
 * Manages saving and loading timeline presets
 */
export class Storage {
    /**
     * Creates a new Storage instance
     */
    constructor() {
      // Storage keys
      this.CURRENT_STATE_KEY = 'planner.current';
      this.PRESETS_KEY = 'planner.presets';
      
      // Listen for timeline save events
      document.addEventListener('timeline:save-current', this.handleSaveCurrent.bind(this));
    }
    
    /**
     * Initializes storage and loads existing presets
     * @returns {Object|null} - Current timeline state if available
     */
    initialize() {
      // Ensure presets storage exists
      if (!localStorage.getItem(this.PRESETS_KEY)) {
        localStorage.setItem(this.PRESETS_KEY, JSON.stringify([]));
      }
      
      // Populate preset select element
      this.updatePresetSelector();
      
      // Load current state if available
      const currentState = localStorage.getItem(this.CURRENT_STATE_KEY);
      if (currentState) {
        try {
          return JSON.parse(currentState);
        } catch (error) {
          console.error('Error parsing stored timeline state:', error);
          localStorage.removeItem(this.CURRENT_STATE_KEY);
          return null;
        }
      }
      
      return null;
    }
    
    /**
     * Handles saving current timeline state event
     * @param {CustomEvent} event - Custom event with timeline data
     */
    handleSaveCurrent(event) {
      if (!event || !event.detail) return;
      
      try {
        const serializedData = JSON.stringify(event.detail);
        localStorage.setItem(this.CURRENT_STATE_KEY, serializedData);
      } catch (error) {
        console.error('Error saving timeline state:', error);
      }
    }
    
    /**
     * Saves the current timeline as a named preset
     * @param {string} name - Preset name
     * @param {Object} timelineData - Timeline serialized data
     * @returns {boolean} - Success state
     */
    savePreset(name, timelineData) {
      if (!name || !timelineData) return false;
      
      try {
        // Get existing presets
        const presets = this.getPresets();
        
        // Check if name already exists
        const existingIndex = presets.findIndex(preset => preset.name === name);
        
        // Create preset data with all configuration
        const presetData = {
          name,
          blocks: timelineData.blocks,
          isWrappingEnabled: timelineData.isWrappingEnabled || false,
          allowOverlap: timelineData.allowOverlap || false
        };
        
        if (existingIndex >= 0) {
          // Update existing preset
          presets[existingIndex] = presetData;
        } else {
          // Add new preset
          presets.push(presetData);
        }
        
        // Save presets
        localStorage.setItem(this.PRESETS_KEY, JSON.stringify(presets));
        
        // Update selector
        this.updatePresetSelector();
        
        return true;
      } catch (error) {
        console.error('Error saving preset:', error);
        return false;
      }
    }
    
    /**
     * Loads a preset by name
     * @param {string} name - Preset name
     * @returns {Object|null} - Preset data or null if not found
     */
    loadPreset(name) {
      const presets = this.getPresets();
      const preset = presets.find(p => p.name === name);
      
      if (preset) {
        return {
          blocks: preset.blocks,
          isWrappingEnabled: preset.isWrappingEnabled || false,
          allowOverlap: preset.allowOverlap || false
        };
      }
      
      return null;
    }
    
    /**
     * Gets all saved presets
     * @returns {Array} - Array of preset objects
     */
    getPresets() {
      try {
        const presetsJson = localStorage.getItem(this.PRESETS_KEY);
        if (!presetsJson) return [];
        
        const presets = JSON.parse(presetsJson);
        if (!Array.isArray(presets)) return [];
        
        return presets;
      } catch (error) {
        console.error('Error loading presets:', error);
        return [];
      }
    }
    
    /**
     * Deletes a preset by name
     * @param {string} name - Preset name
     * @returns {boolean} - Success state
     */
    deletePreset(name) {
      try {
        // Get existing presets
        const presets = this.getPresets();
        
        // Filter out the preset to delete
        const filteredPresets = presets.filter(preset => preset.name !== name);
        
        // Save filtered presets
        localStorage.setItem(this.PRESETS_KEY, JSON.stringify(filteredPresets));
        
        // Update selector
        this.updatePresetSelector();
        
        return true;
      } catch (error) {
        console.error('Error deleting preset:', error);
        return false;
      }
    }
    
    /**
     * Updates the preset selector dropdown with current presets
     */
    updatePresetSelector() {
      const selector = document.getElementById('preset-select');
      if (!selector) return;
      
      // Clear existing options except the first one
      while (selector.options.length > 1) {
        selector.remove(1);
      }
      
      // Add options for each preset
      const presets = this.getPresets();
      presets.forEach(preset => {
        const option = document.createElement('option');
        option.value = preset.name;
        option.textContent = preset.name;
        selector.appendChild(option);
      });
    }
    
    /**
     * Clears all storage data
     */
    clearAll() {
      localStorage.removeItem(this.CURRENT_STATE_KEY);
      localStorage.removeItem(this.PRESETS_KEY);
    }
  }