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
    
    // Add window unload event to ensure state is saved when leaving the page
    window.addEventListener('beforeunload', () => {
      // Dispatch a custom event to trigger saving the current state
      const currentState = JSON.parse(localStorage.getItem(this.CURRENT_STATE_KEY));
      if (currentState) {
        document.dispatchEvent(new CustomEvent('timeline:save-current', {
          detail: currentState
        }));
      }
    });
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

    // Create demo profile if it doesn't exist
    this.createDemoProfileIfNeeded();

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
    
    // Dispatch event to notify UI to add delete buttons
    const event = new CustomEvent('presets:updated', {
      detail: { presets }
    });
    document.dispatchEvent(event);
  }
  
  /**
   * Creates a demo profile for testing and algorithm showcase if it doesn't exist
   */
  createDemoProfileIfNeeded() {
    const presets = this.getPresets();
    const demoExists = presets.some(preset => preset.name === 'Demo');

    // Always recreate for now (to update structure if needed)
    // Remove this condition to only create once: if (!demoExists) {
    if (true) {
      const demoProfile = {
        name: 'Demo',
        blocks: [
          {
            id: 'demo-1',
            title: 'Morning Meeting',
            duration: 1,
            start: 0,
            color: '#3a86ff'
          },
          {
            id: 'demo-2',
            title: 'Gym Workout',
            duration: 1.5,
            start: 1,
            color: '#f72585'
          },
          {
            id: 'demo-3',
            title: 'Project Work',
            duration: 2,
            start: 2.5,
            color: '#7209b7'
          },
          {
            id: 'demo-4',
            title: 'Quick Call',
            duration: 0.5,
            start: 4.5,
            color: '#560bad'
          },
          {
            id: 'demo-5',
            title: 'Lunch Break',
            duration: 1,
            start: 5,
            color: '#ff7f00'
          },
          {
            id: 'demo-6',
            title: 'Read Course Material',
            duration: 1.5,
            start: 6,
            color: '#4cc9f0'
          },
          {
            id: 'demo-7',
            title: 'Email Processing',
            duration: 0.75,
            start: 7.5,
            color: '#240046'
          },
          {
            id: 'demo-8',
            title: 'Team Stand-up',
            duration: 0.5,
            start: 8.25,
            color: '#9d4edd'
          },
          {
            id: 'demo-9',
            title: 'Personal Study',
            duration: 2,
            start: 8.75,
            color: '#06ffa5'
          },
          {
            id: 'demo-10',
            title: 'Shopping',
            duration: 1,
            start: 10.75,
            color: '#ffb700'
          },
          {
            id: 'demo-11',
            title: 'Yoga Session',
            duration: 1,
            start: 11.75,
            color: '#fb8500'
          },
          {
            id: 'demo-12',
            title: 'Family Time',
            duration: 2,
            start: 12.75,
            color: '#8ecae6'
          },
          {
            id: 'demo-13',
            title: 'Code Review',
            duration: 1.5,
            start: 14.75,
            color: '#219ebc'
          },
          {
            id: 'demo-14',
            title: 'Running',
            duration: 0.75,
            start: 16.25,
            color: '#023047'
          },
          {
            id: 'demo-15',
            title: 'Learn JavaScript',
            duration: 1.25,
            start: 17,
            color: '#ffb3c6'
          },
          {
            id: 'demo-16',
            title: 'Quick Chores',
            duration: 0.5,
            start: 18.25,
            color: '#fb8b24'
          },
          {
            id: 'demo-17',
            title: 'Client Meeting',
            duration: 1,
            start: 18.75,
            color: '#d62828'
          },
          {
            id: 'demo-18',
            title: 'Social Call',
            duration: 0.75,
            start: 19.75,
            color: '#fcbf49'
          }
        ],
        isWrappingEnabled: true,
        allowOverlap: false
      };

      // Save the demo profile
      try {
        const presets = this.getPresets();

        // Remove existing demo profile if it exists (both old and new names)
        const filteredPresets = presets.filter(p => p.name !== 'Demo' && p.name !== '🎯 Demo Profile - Algorithm Testing');

        // Add new demo profile at the beginning
        filteredPresets.unshift(demoProfile);

        localStorage.setItem(this.PRESETS_KEY, JSON.stringify(filteredPresets));
        console.log('Demo profile created/updated for algorithm testing');
      } catch (error) {
        console.error('Error creating demo profile:', error);
      }
    }
  }

  /**
   * Clears all storage data
   */
  clearAll() {
    localStorage.removeItem(this.CURRENT_STATE_KEY);
    localStorage.removeItem(this.PRESETS_KEY);
  }
}