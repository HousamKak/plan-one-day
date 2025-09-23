/**
 * ShuffleManager.js
 * Responsible for timeline block shuffling strategies and algorithms
 */
import { showToast } from '../ui/Toast.js';

export class ShuffleManager {
  /**
   * Creates a new ShuffleManager
   * @param {Object} timeline - Timeline instance to manage
   */
  constructor(timeline) {
    this.timeline = timeline;
    
    // Define strategy mappings for display names
    this.strategyNameMap = {
      'random': 'Random',
      'compact': 'Compact',
      'spread': 'Evenly Distributed',
      'clustered': 'Clustered',
      'timeOfDay': 'Time-of-Day Optimized',
      'priority': 'Priority-Based',
      'energy': 'Energy-Based',
      'balanced': 'Balanced Variety',
      'theme': 'Theme-Based'
    };
  }

  /**
   * Executes the selected shuffle strategy
   * @param {string} strategy - The selected strategy
   */
  executeStrategy(strategy) {
    // Convert blocks to array and filter out locked blocks
    const allBlocks = Array.from(this.timeline.blocks.values());
    const blockArray = allBlocks.filter(block => !block.isLocked);

    // If no unlocked blocks, show message and return
    if (blockArray.length === 0) {
      showToast('No unlocked blocks to shuffle');
      return;
    }

    // Show message if some blocks are locked
    const lockedCount = allBlocks.length - blockArray.length;
    if (lockedCount > 0) {
      showToast(`Shuffling ${blockArray.length} blocks (${lockedCount} locked)`);
    }

    // Apply the selected strategy
    switch (strategy) {
      case 'random':
        this.applyRandomStrategy(blockArray);
        break;
      case 'compact':
        this.applyCompactStrategy(blockArray);
        break;
      case 'spread':
        this.applySpreadStrategy(blockArray);
        break;
      case 'clustered':
        this.applyClusteredStrategy(blockArray);
        break;
      case 'timeOfDay':
        this.applyTimeOfDayStrategy(blockArray);
        break;
      case 'priority':
        this.applyPriorityStrategy(blockArray);
        break;
      case 'energy':
        this.applyEnergyStrategy(blockArray);
        break;
      case 'balanced':
        this.applyBalancedStrategy(blockArray);
        break;
      case 'theme':
        this.applyThemeStrategy(blockArray);
        break;
      default:
        this.applyRandomStrategy(blockArray);
    }
    
    // Save current state
    this.timeline.saveCurrentState();
    
    // Update label positions after shuffling
    setTimeout(() => {
      this.timeline.updateLabelPositions();
    }, 100);
    
    // Show toast notification
    showToast(`Applied "${this.strategyNameMap[strategy]}" arrangement`);
  }

  /**
   * Applies random strategy (basic shuffle)
   * @param {Array} blockArray - Array of blocks to arrange
   */
  applyRandomStrategy(blockArray) {
    // Fisher-Yates shuffle
    for (let i = blockArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [blockArray[i], blockArray[j]] = [blockArray[j], blockArray[i]];
    }

    // Lay out sequentially with some random gaps
    let currentStart = 0;
    let overflow = false;

    // Initialize placed blocks with all locked blocks to treat them as obstacles
    const placedBlocks = this.getLockedBlocksAsPlaced();
    
    blockArray.forEach((block, index) => {
      // Maybe add a random gap (30% chance)
      if (index > 0 && Math.random() < 0.3) {
        const gapSize = Math.random() * 1.5; // Random gap up to 1.5 hours
        currentStart = (currentStart + gapSize) % 24;
      }
      
      // Check if block fits within 24 hours if wrap is disabled
      if (!this.timeline.isWrappingEnabled && currentStart + block.duration > 24) {
        overflow = true;
        // If overlap is not allowed, try to place at beginning
        if (!this.timeline.allowOverlap) {
          currentStart = 0;
        }
      }
      
      const originalStart = currentStart;
      let placementSuccessful = false;
      let attempts = 0;
      const maxAttempts = 24; // Prevent infinite loops
      
      // Loop until we find a valid position or exhaust attempts
      while (!placementSuccessful && attempts < maxAttempts) {
        // Check for conflicts with already placed blocks
        let hasConflict = false;
        
        if (!this.timeline.allowOverlap) {
          hasConflict = placedBlocks.some(placedBlock => {
            if (placedBlock.id === block.id) return false;
            return this.timeRangesOverlap(
              currentStart, 
              currentStart + block.duration, 
              placedBlock.start, 
              placedBlock.start + placedBlock.duration,
              this.timeline.isWrappingEnabled
            );
          });
        }
        
        if (!hasConflict) {
          // Position is valid, update the block
          block.start = currentStart;
          // Only add to placed blocks if it's not locked (locked blocks are already in placedBlocks)
          if (!block.isLocked) {
            placedBlocks.push({
              id: block.id,
              start: currentStart,
              duration: block.duration
            });
          }
          // Safety check: never move locked blocks
          if (!block.isLocked) {
            this.timeline.updateBlock(block.id, { start: currentStart });
          }
          placementSuccessful = true;
        } else {
          // Try next position
          currentStart = (currentStart + 0.25) % 24;
          attempts++;
        }
      }
      
      // If we couldn't place the block after all attempts
      if (!placementSuccessful) {
        // Force placement at original position
        // Safety check: never move locked blocks
        if (!block.isLocked) {
          this.timeline.updateBlock(block.id, { start: originalStart });
        }
        // Only add to placed blocks if it's not locked (locked blocks are already in placedBlocks)
        if (!block.isLocked) {
          placedBlocks.push({
            id: block.id,
            start: originalStart,
            duration: block.duration
          });
        }
        showToast('Some blocks may overlap due to space constraints');
      }
      
      // Move to next position for next block
      currentStart = (block.start + block.duration) % 24;
      if (!this.timeline.isWrappingEnabled && !this.timeline.allowOverlap) {
        currentStart = Math.min(24, currentStart);
      }
    });
    
    // Show toast if overflow occurred
    if (overflow) {
      showToast('Some blocks were repositioned due to 24-hour limit');
    }
  }

  /**
   * Applies compact strategy (minimizes gaps)
   * @param {Array} blockArray - Array of blocks to arrange
   */
  applyCompactStrategy(blockArray) {
    // Sort blocks by duration (longest first for better packing)
    blockArray.sort((a, b) => b.duration - a.duration);

    // Initialize placed blocks with all locked blocks to treat them as obstacles
    const placedBlocks = this.getLockedBlocksAsPlaced();
    
    // Lay out sequentially with no gaps
    let currentStart = 0;
    let overflow = false;
    
    blockArray.forEach(block => {
      // Check if block fits within 24 hours if wrap is disabled
      if (!this.timeline.isWrappingEnabled && currentStart + block.duration > 24) {
        overflow = true;
        // If overlap is not allowed, try to find a gap
        if (!this.timeline.allowOverlap) {
          // Find the best gap among already placed blocks
          currentStart = this.findBestGap(placedBlocks, block.duration);
        }
      }
      
      // Verify no conflicts if overlap is not allowed
      if (!this.timeline.allowOverlap) {
        let hasConflict = this.checkForTimeConflicts(
          placedBlocks, 
          currentStart, 
          block.duration, 
          this.timeline.isWrappingEnabled
        );
        
        // If there's a conflict, try to find another spot
        if (hasConflict) {
          // Try positions in 15-minute increments
          let foundPosition = false;
          for (let hour = 0; hour < 24 && !foundPosition; hour += 0.25) {
            hasConflict = this.checkForTimeConflicts(
              placedBlocks, 
              hour, 
              block.duration, 
              this.timeline.isWrappingEnabled
            );
            
            if (!hasConflict) {
              currentStart = hour;
              foundPosition = true;
            }
          }
          
          // If we still have conflicts, just place at 0 and warn
          if (!foundPosition) {
            currentStart = 0;
            showToast('Some blocks may overlap due to space constraints');
          }
        }
      }
      
      // Update block position
      this.timeline.updateBlock(block.id, { start: currentStart });
      
      // Add to placed blocks
      // Only add to placed blocks if it's not locked (locked blocks are already in placedBlocks)
      if (!block.isLocked) {
        placedBlocks.push({
          id: block.id,
          start: currentStart,
          duration: block.duration
        });
      }
      
      // Move to next position
      currentStart = (currentStart + block.duration) % 24;
      if (!this.timeline.isWrappingEnabled && !this.timeline.allowOverlap) {
        currentStart = Math.min(24, currentStart);
      }
    });
    
    // Show toast
    showToast('Applied compact arrangement with minimal gaps');
  }

  /**
   * Applies evenly distributed strategy
   * @param {Array} blockArray - Array of blocks to arrange
   */
  applySpreadStrategy(blockArray) {
    // Calculate total duration of all blocks
    const totalDuration = blockArray.reduce((sum, block) => sum + block.duration, 0);
    
    // Calculate ideal gap based on remaining time and number of gaps needed
    const availableTime = this.timeline.isWrappingEnabled ? 24 : Math.min(24, totalDuration);
    const numberOfGaps = blockArray.length > 1 ? blockArray.length : 1;
    let idealGapSize = 0;
    
    if (totalDuration < availableTime) {
      // Calculate gap size, ensuring it's not negative
      idealGapSize = Math.max(0, (availableTime - totalDuration) / numberOfGaps);
      
      // Limit gap size to something reasonable
      idealGapSize = Math.min(idealGapSize, 2); // Max 2 hour gaps
    }
    
    // Randomize block order before distributing
    for (let i = blockArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [blockArray[i], blockArray[j]] = [blockArray[j], blockArray[i]];
    }

    // Initialize placed blocks with all locked blocks to treat them as obstacles
    const placedBlocks = this.getLockedBlocksAsPlaced();

    // Distribute blocks evenly
    let currentStart = 0;
    let overflow = false;
    
    blockArray.forEach((block, index) => {
      let foundValidPosition = false;
      let attemptedStart = currentStart;
      
      // If we don't allow overlaps, check for conflicts
      if (!this.timeline.allowOverlap) {
        // Check if current position conflicts with placed blocks
        let hasConflict = this.checkForTimeConflicts(
          placedBlocks, 
          attemptedStart, 
          block.duration, 
          this.timeline.isWrappingEnabled
        );
        
        // If there's a conflict, try different positions
        if (hasConflict) {
          // Try positions in 15-minute increments
          for (let hour = 0; hour < 24 && !foundValidPosition; hour += 0.25) {
            hasConflict = this.checkForTimeConflicts(
              placedBlocks, 
              hour, 
              block.duration, 
              this.timeline.isWrappingEnabled
            );
            
            if (!hasConflict) {
              attemptedStart = hour;
              foundValidPosition = true;
            }
          }
          
          // If we still have conflicts, just use original position and warn
          if (!foundValidPosition) {
            showToast('Some blocks may overlap due to space constraints');
          }
        } else {
          foundValidPosition = true;
        }
      } else {
        foundValidPosition = true; // Always valid if overlaps are allowed
      }
      
      // Handle wrapping constraints
      if (!this.timeline.isWrappingEnabled && attemptedStart + block.duration > 24) {
        overflow = true;
        // If we can't wrap and would exceed 24h, place at beginning of day
        if (!this.timeline.allowOverlap) {
          attemptedStart = 0;
        }
      }
      
      // Update block position
      // Safety check: never move locked blocks
      if (!block.isLocked) {
        this.timeline.updateBlock(block.id, { start: attemptedStart });
      }
      
      // Add to placed blocks
      // Only add to placed blocks if it's not locked (locked blocks are already in placedBlocks)
      if (!block.isLocked) {
        placedBlocks.push({
          id: block.id,
          start: attemptedStart,
          duration: block.duration
        });
      }
      
      // Calculate next position with ideal gap
      currentStart = (attemptedStart + block.duration + idealGapSize) % 24;
      
      // Handle day boundary if wrapping is disabled
      if (!this.timeline.isWrappingEnabled) {
        currentStart = Math.min(24, currentStart);
      }
    });
    
    // Show toast
    showToast('Applied evenly distributed arrangement');
  }

  /**
   * Applies clustered strategy (groups similar blocks)
   * @param {Array} blockArray - Array of blocks to arrange
   */
  applyClusteredStrategy(blockArray) {
    // Group blocks by duration category
    const shortBlocks = blockArray.filter(block => block.duration <= 0.5);
    const mediumBlocks = blockArray.filter(block => block.duration > 0.5 && block.duration <= 1.5);
    const longBlocks = blockArray.filter(block => block.duration > 1.5);
    
    // Randomize each group
    [shortBlocks, mediumBlocks, longBlocks].forEach(group => {
      for (let i = group.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [group[i], group[j]] = [group[j], group[i]];
      }
    });
    
    // Determine placement order (medium-short-long or long-medium-short)
    const placementGroups = Math.random() < 0.5 ? 
      [mediumBlocks, shortBlocks, longBlocks] : 
      [longBlocks, mediumBlocks, shortBlocks];
    
    // Flatten all groups into single array
    const orderedBlocks = placementGroups.flat();
    
    // Initialize placed blocks with all locked blocks to treat them as obstacles
    const placedBlocks = this.getLockedBlocksAsPlaced();

    // Lay out sequentially with small gaps between categories
    let currentStart = 0;
    let overflow = false;
    let currentCategory = null;
    
    orderedBlocks.forEach(block => {
      let blockCategory;
      if (block.duration <= 0.5) blockCategory = 'short';
      else if (block.duration <= 1.5) blockCategory = 'medium';
      else blockCategory = 'long';
      
      // Add gap between different categories
      if (currentCategory !== null && currentCategory !== blockCategory) {
        currentStart = (currentStart + 0.5) % 24; // 30 min gap between categories
      }
      currentCategory = blockCategory;
      
      // Check if block fits within 24 hours if wrap is disabled
      if (!this.timeline.isWrappingEnabled && currentStart + block.duration > 24) {
        overflow = true;
        // If overlap is not allowed, start from beginning
        if (!this.timeline.allowOverlap) {
          currentStart = 0;
        }
      }
      
      // Verify no conflicts if overlap is not allowed
      if (!this.timeline.allowOverlap) {
        let hasConflict = this.checkForTimeConflicts(
          placedBlocks, 
          currentStart, 
          block.duration, 
          this.timeline.isWrappingEnabled
        );
        
        // If there's a conflict, find another position
        if (hasConflict) {
          // Try to find a position within the same category section if possible
          // Starting from the current start time, try every 15-min increment
          let foundSpot = false;
          let tryStart = currentStart;
          const maxAttempts = 96; // Max 24 hours of attempts
          let attempts = 0;
          
          while (!foundSpot && attempts < maxAttempts) {
            tryStart = (tryStart + 0.25) % 24;
            hasConflict = this.checkForTimeConflicts(
              placedBlocks, 
              tryStart, 
              block.duration, 
              this.timeline.isWrappingEnabled
            );
            
            if (!hasConflict && 
                (!this.timeline.isWrappingEnabled || tryStart + block.duration <= 24 || this.timeline.allowOverlap)) {
              currentStart = tryStart;
              foundSpot = true;
            }
            
            attempts++;
          }
          
          // If still no spot found, just place at beginning and warn
          if (!foundSpot) {
            currentStart = 0;
            showToast('Some blocks may overlap due to space constraints');
          }
        }
      }
      
      // Update block position
      this.timeline.updateBlock(block.id, { start: currentStart });
      
      // Add to placed blocks
      // Only add to placed blocks if it's not locked (locked blocks are already in placedBlocks)
      if (!block.isLocked) {
        placedBlocks.push({
          id: block.id,
          start: currentStart,
          duration: block.duration
        });
      }
      
      // Move to next position
      currentStart = (currentStart + block.duration) % 24;
      if (!this.timeline.isWrappingEnabled && !this.timeline.allowOverlap) {
        currentStart = Math.min(24, currentStart);
      }
    });
    
    // Show toast
    showToast('Applied clustered arrangement by duration');
  }

  /**
   * Applies time of day strategy (morning/afternoon/evening)
   * @param {Array} blockArray - Array of blocks to arrange
   */
  applyTimeOfDayStrategy(blockArray) {
    if (blockArray.length === 0) return;
    
    // Define time periods (hours)
    const morning = { start: 5, end: 12 }; // 5 AM - 12 PM
    const afternoon = { start: 12, end: 17 }; // 12 PM - 5 PM
    const evening = { start: 17, end: 22 }; // 5 PM - 10 PM
    const night = { start: 22, end: 5 }; // 10 PM - 5 AM
    
    // Calculate period durations
    const morningDuration = morning.end - morning.start;
    const afternoonDuration = afternoon.end - afternoon.start;
    const eveningDuration = evening.end - evening.start;
    const nightDuration = (24 - night.start) + night.end;
    
    // Sort blocks by duration (longest first)
    blockArray.sort((a, b) => b.duration - a.duration);
    
    // Initialize block arrays for each period
    const morningBlocks = [];
    const afternoonBlocks = [];
    const eveningBlocks = [];
    const nightBlocks = [];
    
    // Initialize remaining time in each period
    let remainingMorningTime = morningDuration;
    let remainingAfternoonTime = afternoonDuration;
    let remainingEveningTime = eveningDuration;
    let remainingNightTime = nightDuration;
    
    // Initialize placed blocks with all locked blocks to treat them as obstacles
    const placedBlocks = this.getLockedBlocksAsPlaced();

    // First pass: distribute blocks to periods
    blockArray.forEach(block => {
      // Check if block is too long for any period
      const isExtremelyLong = block.duration > Math.max(
        morningDuration, 
        afternoonDuration, 
        eveningDuration, 
        nightDuration
      );
      
      // For very long blocks or blocks that don't fit anywhere available
      if (isExtremelyLong || (
          block.duration > remainingMorningTime && 
          block.duration > remainingAfternoonTime && 
          block.duration > remainingEveningTime && 
          block.duration > remainingNightTime
      )) {
        // Find period with most remaining time
        const periods = [
          { name: 'morning', remaining: remainingMorningTime, array: morningBlocks },
          { name: 'afternoon', remaining: remainingAfternoonTime, array: afternoonBlocks },
          { name: 'evening', remaining: remainingEveningTime, array: eveningBlocks },
          { name: 'night', remaining: remainingNightTime, array: nightBlocks }
        ].sort((a, b) => b.remaining - a.remaining);
        
        // Add to the period with most space
        periods[0].array.push(block);
        
        // Update remaining time (even if negative - we'll handle overlaps later)
        switch (periods[0].name) {
          case 'morning': remainingMorningTime -= block.duration; break;
          case 'afternoon': remainingAfternoonTime -= block.duration; break;
          case 'evening': remainingEveningTime -= block.duration; break;
          case 'night': remainingNightTime -= block.duration; break;
        }
        
        return;
      }
      
      // Normal case: try to place in each period in order
      if (block.duration <= remainingMorningTime) {
        morningBlocks.push(block);
        remainingMorningTime -= block.duration;
      } else if (block.duration <= remainingAfternoonTime) {
        afternoonBlocks.push(block);
        remainingAfternoonTime -= block.duration;
      } else if (block.duration <= remainingEveningTime) {
        eveningBlocks.push(block);
        remainingEveningTime -= block.duration;
      } else {
        // Default to night period
        nightBlocks.push(block);
        remainingNightTime -= block.duration;
      }
    });
    
    // Position blocks within each period, tracking blocks as they're placed
    this.positionBlocksInPeriod(
      morningBlocks, morning.start, morningDuration, placedBlocks, false
    );
    
    this.positionBlocksInPeriod(
      afternoonBlocks, afternoon.start, afternoonDuration, placedBlocks, false
    );
    
    this.positionBlocksInPeriod(
      eveningBlocks, evening.start, eveningDuration, placedBlocks, false
    );
    
    this.positionBlocksInPeriod(
      nightBlocks, night.start, nightDuration, placedBlocks, true // Night crosses midnight
    );
    
    showToast('Applied time-of-day optimized arrangement');
  }

  /**
   * Positions blocks within a specific time period
   * @param {Array} blocks - Blocks to position
   * @param {number} periodStart - Start time of the period
   * @param {number} periodDuration - Duration of the period
   * @param {Array} placedBlocks - Blocks already placed (to check conflicts)
   * @param {boolean} crossesMidnight - Whether the period crosses midnight
   */
  positionBlocksInPeriod(blocks, periodStart, periodDuration, placedBlocks, crossesMidnight = false) {
    if (blocks.length === 0) return;
    
    // Randomize blocks for variety
    for (let i = blocks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
    }
    
    // Calculate total block duration
    const totalBlockDuration = blocks.reduce((sum, block) => sum + block.duration, 0);
    
    // Calculate gap size based on remaining time
    let gapSize = 0;
    if (totalBlockDuration < periodDuration) {
      gapSize = (periodDuration - totalBlockDuration) / (blocks.length + 1);
      // Ensure gap size is reasonable
      gapSize = Math.min(gapSize, 1); // Cap at 1 hour max
    }
    
    // Position blocks within period
    let currentStart = periodStart + gapSize;
    
    blocks.forEach(block => {
      // Handle midnight crossing if needed
      if (crossesMidnight && currentStart >= 24) {
        currentStart = currentStart % 24;
      }
      
      // Check wrap settings
      if (!this.timeline.isWrappingEnabled && currentStart + block.duration > 24) {
        // If we can't wrap and would exceed 24h, place at beginning of day
        currentStart = 0;
      }
      
      // Check for conflicts if overlaps aren't allowed
      if (!this.timeline.allowOverlap) {
        let hasConflict = this.checkForTimeConflicts(
          placedBlocks, 
          currentStart, 
          block.duration, 
          this.timeline.isWrappingEnabled
        );
        
        // If there's a conflict, try to find another position within the period
        if (hasConflict) {
          let foundSpot = false;
          
          // Determine search range based on period
          let searchStart = periodStart;
          let searchEnd = periodStart + periodDuration;
          
          if (crossesMidnight) {
            if (searchEnd > 24) {
              searchEnd = searchEnd % 24;
              // If end wraps, we need to search from periodStart to 24
              // and from 0 to searchEnd
              
              // First try from periodStart to 24
              for (let hour = periodStart; hour < 24 && !foundSpot; hour += 0.25) {
                if (!this.checkForTimeConflicts(
                  placedBlocks, hour, block.duration, this.timeline.isWrappingEnabled
                ) && (this.timeline.isWrappingEnabled || hour + block.duration <= 24)) {
                  currentStart = hour;
                  foundSpot = true;
                }
              }
              
              // Then try from 0 to searchEnd if not found
              if (!foundSpot) {
                for (let hour = 0; hour < searchEnd && !foundSpot; hour += 0.25) {
                  if (!this.checkForTimeConflicts(
                    placedBlocks, hour, block.duration, this.timeline.isWrappingEnabled
                  )) {
                    currentStart = hour;
                    foundSpot = true;
                  }
                }
              }
            }
          } else {
            // Normal case - search through the period
            for (let hour = searchStart; hour < searchEnd - block.duration && !foundSpot; hour += 0.25) {
              if (!this.checkForTimeConflicts(
                placedBlocks, hour, block.duration, this.timeline.isWrappingEnabled
              )) {
                currentStart = hour;
                foundSpot = true;
              }
            }
          }
          
          // If still no spot, try anywhere on the timeline
          if (!foundSpot) {
            for (let hour = 0; hour < 24 && !foundSpot; hour += 0.25) {
              if (!this.checkForTimeConflicts(
                placedBlocks, hour, block.duration, this.timeline.isWrappingEnabled
              ) && (this.timeline.isWrappingEnabled || hour + block.duration <= 24)) {
                currentStart = hour;
                foundSpot = true;
              }
            }
          }
          
          // If still no spot found, place at period start and warn
          if (!foundSpot) {
            currentStart = periodStart;
            showToast('Some blocks may overlap due to space constraints');
          }
        }
      }
      
      // Update block position
      this.timeline.updateBlock(block.id, { start: currentStart });
      
      // Add to placed blocks
      // Only add to placed blocks if it's not locked (locked blocks are already in placedBlocks)
      if (!block.isLocked) {
        placedBlocks.push({
          id: block.id,
          start: currentStart,
          duration: block.duration
        });
      }
      
      // Move to next position with gap
      currentStart = currentStart + block.duration + gapSize;
      if (crossesMidnight && currentStart >= 24) {
        currentStart = currentStart % 24;
      }
    });
  }

  /**
   * Helper method to check if two time ranges overlap
   * @param {number} start1 - Start time of first range
   * @param {number} end1 - End time of first range
   * @param {number} start2 - Start time of second range
   * @param {number} end2 - End time of second range
   * @param {boolean} allowWrapAround - Whether to consider wrap-around at midnight
   * @returns {boolean} - True if ranges overlap
   */
  timeRangesOverlap(start1, end1, start2, end2, allowWrapAround) {
    // Normalize all times to be within 0-24 range
    start1 = start1 % 24;
    end1 = end1 % 24;
    start2 = start2 % 24;
    end2 = end2 % 24;
    
    // Special case: end time is exactly midnight
    if (end1 === 0) end1 = 24;
    if (end2 === 0) end2 = 24;
    
    // Check if either range wraps around midnight
    const range1Wraps = end1 <= start1;
    const range2Wraps = end2 <= start2;
    
    // If wrap-around is not allowed, adjust end times
    if (!allowWrapAround) {
      if (range1Wraps) end1 = 24;
      if (range2Wraps) end2 = 24;
    }
    
    // Now handle the different cases
    if (!range1Wraps && !range2Wraps) {
      // Neither range wraps, standard check
      return (start1 < end2 && end1 > start2);
    } else if (allowWrapAround) {
      if (range1Wraps && range2Wraps) {
        // Both ranges wrap, they must overlap
        return true;
      } else if (range1Wraps) {
        // First range wraps, second doesn't
        // Overlap if second range intersects with either part of first range
        return (start2 < end1 || end2 > start1);
      } else {
        // Second range wraps, first doesn't
        // Overlap if first range intersects with either part of second range
        return (start1 < end2 || end1 > start2);
      }
    }
    
    // Default case - no overlap
    return false;
  }

  /**
   * Checks for conflicts between a new time block and existing blocks
   * @param {Array} placedBlocks - Array of already placed blocks (including locked blocks)
   * @param {number} start - Start time to check
   * @param {number} duration - Duration to check
   * @param {boolean} wrapEnabled - Whether wrap-around is enabled
   * @returns {boolean} - True if a conflict exists
   */
  checkForTimeConflicts(placedBlocks, start, duration, wrapEnabled) {
    if (placedBlocks.length === 0) return false;

    const end = (start + duration) % 24;

    return placedBlocks.some(block => {
      const blockEnd = (block.start + block.duration) % 24;
      return this.timeRangesOverlap(
        start, end, block.start, blockEnd, wrapEnabled
      );
    });
  }

  /**
   * Finds the best gap to place a block
   * @param {Array} placedBlocks - Array of already placed blocks
   * @param {number} duration - Duration needed
   * @returns {number} Best start time found
   */
  findBestGap(placedBlocks, duration) {
    // If no blocks are placed yet, start at 0
    if (placedBlocks.length === 0) return 0;
    
    // Create time points from block edges
    const timePoints = [];
    
    // Add all block boundaries
    placedBlocks.forEach(block => {
      // Make sure to handle blocks that wrap around midnight
      const blockStart = block.start % 24;
      let blockEnd = (block.start + block.duration) % 24;
      if (blockEnd === 0 && block.duration > 0) blockEnd = 24;
      
      timePoints.push({ time: blockStart, type: 'start' });
      timePoints.push({ time: blockEnd, type: 'end' });
    });
    
    // Add day boundaries if not wrapping
    if (!this.timeline.isWrappingEnabled) {
      // Make sure we don't duplicate boundaries
      if (!timePoints.some(p => p.time === 0)) {
        timePoints.push({ time: 0, type: 'boundary' });
      }
      if (!timePoints.some(p => p.time === 24)) {
        timePoints.push({ time: 24, type: 'boundary' });
      }
    }
    
    // Sort time points
    timePoints.sort((a, b) => a.time - b.time);
    
    // Find gaps by stepping through timePoints
    const gaps = [];
    let openBlocks = 0;
    let lastTime = 0;
    
    timePoints.forEach(point => {
      // If we're at a point where no blocks are open, this is a gap
      if (openBlocks === 0 && point.time > lastTime) {
        gaps.push({
          start: lastTime,
          end: point.time,
          duration: point.time - lastTime
        });
      }
      
      // Update block count based on point type
      if (point.type === 'start') {
        openBlocks++;
      } else if (point.type === 'end') {
        openBlocks = Math.max(0, openBlocks - 1);
      }
      
      // Update last time
      lastTime = point.time;
    });
    
    // Handle wrap-around gap if needed (from last point back to first)
    if (this.timeline.isWrappingEnabled && timePoints.length > 0) {
      const firstTime = timePoints[0].time;
      const lastTime = timePoints[timePoints.length - 1].time;
      
      // If the last time point leaves us with no open blocks,
      // there's a potential gap from last point to first point
      if (openBlocks === 0 && firstTime > 0) {
        // Calculate the gap duration, handling the wrap
        const wrapDuration = (24 - lastTime) + firstTime;
        
        gaps.push({
          start: lastTime,
          end: firstTime,
          duration: wrapDuration
        });
      }
    }
    
    // Find best gap (first one that fits)
    // Sort by size to find smallest suitable gap
    const suitableGaps = gaps
      .filter(gap => gap.duration >= duration)
      .sort((a, b) => a.duration - b.duration);
    
    if (suitableGaps.length > 0) {
      return suitableGaps[0].start;
    }
    
    // If no suitable gap, try to fit in one hour increments starting from 0
    for (let hour = 0; hour < 24; hour++) {
      // Check if this position conflicts with any placed blocks
      const hasConflict = this.checkForTimeConflicts(
        placedBlocks, hour, duration, this.timeline.isWrappingEnabled
      );
      
      // Also check if it would exceed the timeline without wrapping
      const exceedsTimeline = !this.timeline.isWrappingEnabled && (hour + duration > 24);
      
      if (!hasConflict && !exceedsTimeline) {
        return hour;
      }
    }
    
    // If still no spot, start from 0
    return 0;
  }

  /**
   * Applies priority-based strategy (high priority tasks first)
   * @param {Array} blockArray - Array of blocks to arrange
   */
  applyPriorityStrategy(blockArray) {
    // Assign random priorities if blocks don't have them
    blockArray.forEach(block => {
      if (!block.priority) {
        // Randomly assign priority: 30% high, 50% medium, 20% low
        const rand = Math.random();
        if (rand < 0.3) block.priority = 'high';
        else if (rand < 0.8) block.priority = 'medium';
        else block.priority = 'low';
      }
    });

    // Sort by priority: high, medium, low
    const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
    blockArray.sort((a, b) => {
      const aPriority = priorityOrder[a.priority] || 2;
      const bPriority = priorityOrder[b.priority] || 2;
      if (aPriority !== bPriority) {
        return bPriority - aPriority; // High priority first
      }
      // Same priority: randomize order
      return Math.random() - 0.5;
    });

    this.layoutBlocksSequentially(blockArray, 0.25); // Small gaps between blocks
    showToast('Applied priority-based arrangement (high → medium → low)');
  }

  /**
   * Applies energy-based strategy (high energy in morning, low energy later)
   * @param {Array} blockArray - Array of blocks to arrange
   */
  applyEnergyStrategy(blockArray) {
    // Assign random energy levels if blocks don't have them
    blockArray.forEach(block => {
      if (!block.energy) {
        // Randomly assign energy: 25% high, 50% medium, 25% low
        const rand = Math.random();
        if (rand < 0.25) block.energy = 'high';
        else if (rand < 0.75) block.energy = 'medium';
        else block.energy = 'low';
      }
    });

    // Define energy time slots
    const morningSlot = { start: 6, end: 10, preferred: ['high'] };
    const midMorningSlot = { start: 10, end: 14, preferred: ['high', 'medium'] };
    const afternoonSlot = { start: 14, end: 18, preferred: ['medium'] };
    const eveningSlot = { start: 18, end: 22, preferred: ['low', 'medium'] };
    const slots = [morningSlot, midMorningSlot, afternoonSlot, eveningSlot];

    // Group blocks by energy level
    const highEnergyBlocks = blockArray.filter(b => b.energy === 'high');
    const mediumEnergyBlocks = blockArray.filter(b => b.energy === 'medium');
    const lowEnergyBlocks = blockArray.filter(b => b.energy === 'low');

    const placedBlocks = this.getLockedBlocksAsPlaced();

    // Place high energy blocks in morning slots first
    this.placeBlocksInSlots(highEnergyBlocks, [morningSlot, midMorningSlot], placedBlocks);

    // Place medium energy blocks in remaining morning/afternoon slots
    this.placeBlocksInSlots(mediumEnergyBlocks, [midMorningSlot, afternoonSlot, eveningSlot], placedBlocks);

    // Place low energy blocks in afternoon/evening slots
    this.placeBlocksInSlots(lowEnergyBlocks, [afternoonSlot, eveningSlot], placedBlocks);

    showToast('Applied energy-based arrangement (high energy → morning, low → evening)');
  }

  /**
   * Applies balanced strategy (alternates between different types for variety)
   * @param {Array} blockArray - Array of blocks to arrange
   */
  applyBalancedStrategy(blockArray) {
    // Assign random categories if blocks don't have them
    const categories = ['work', 'personal', 'health', 'learning', 'social'];
    blockArray.forEach(block => {
      if (!block.category) {
        block.category = categories[Math.floor(Math.random() * categories.length)];
      }
    });

    // Group blocks by category
    const categoryGroups = {};
    categories.forEach(cat => categoryGroups[cat] = []);

    blockArray.forEach(block => {
      const cat = block.category || 'personal';
      if (!categoryGroups[cat]) categoryGroups[cat] = [];
      categoryGroups[cat].push(block);
    });

    // Shuffle each category group
    Object.values(categoryGroups).forEach(group => {
      for (let i = group.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [group[i], group[j]] = [group[j], group[i]];
      }
    });

    // Interleave blocks from different categories
    const balancedArray = [];
    const maxLength = Math.max(...Object.values(categoryGroups).map(g => g.length));

    for (let i = 0; i < maxLength; i++) {
      categories.forEach(cat => {
        if (categoryGroups[cat][i]) {
          balancedArray.push(categoryGroups[cat][i]);
        }
      });
    }

    this.layoutBlocksSequentially(balancedArray, 0.5); // Medium gaps for variety
    showToast('Applied balanced variety arrangement (alternating categories)');
  }

  /**
   * Applies theme-based strategy (groups similar task types)
   * @param {Array} blockArray - Array of blocks to arrange
   */
  applyThemeStrategy(blockArray) {
    // Assign themes based on block titles if not already assigned
    const workKeywords = ['meeting', 'work', 'project', 'call', 'email', 'office'];
    const healthKeywords = ['exercise', 'workout', 'gym', 'run', 'yoga', 'health'];
    const personalKeywords = ['family', 'shopping', 'personal', 'home', 'chores'];
    const learningKeywords = ['study', 'learn', 'read', 'course', 'training'];

    blockArray.forEach(block => {
      if (!block.theme) {
        const title = (block.title || '').toLowerCase();
        if (workKeywords.some(keyword => title.includes(keyword))) {
          block.theme = 'work';
        } else if (healthKeywords.some(keyword => title.includes(keyword))) {
          block.theme = 'health';
        } else if (learningKeywords.some(keyword => title.includes(keyword))) {
          block.theme = 'learning';
        } else if (personalKeywords.some(keyword => title.includes(keyword))) {
          block.theme = 'personal';
        } else {
          // Random assignment for unclear titles
          const themes = ['work', 'personal', 'health', 'learning'];
          block.theme = themes[Math.floor(Math.random() * themes.length)];
        }
      }
    });

    // Group by theme
    const themeGroups = {
      work: [],
      personal: [],
      health: [],
      learning: []
    };

    blockArray.forEach(block => {
      const theme = block.theme || 'personal';
      if (themeGroups[theme]) {
        themeGroups[theme].push(block);
      } else {
        themeGroups.personal.push(block); // Default fallback
      }
    });

    // Randomize within each theme group
    Object.values(themeGroups).forEach(group => {
      for (let i = group.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [group[i], group[j]] = [group[j], group[i]];
      }
    });

    // Determine theme order (work typically early, health/personal flexible)
    const themeOrder = ['work', 'learning', 'health', 'personal'];
    const orderedBlocks = [];

    themeOrder.forEach(theme => {
      if (themeGroups[theme].length > 0) {
        orderedBlocks.push(...themeGroups[theme]);
      }
    });

    this.layoutBlocksSequentially(orderedBlocks, 0.75); // Larger gaps between themes
    showToast('Applied theme-based arrangement (work → learning → health → personal)');
  }

  /**
   * Helper method to layout blocks sequentially with specified gap
   * @param {Array} blockArray - Array of blocks to layout
   * @param {number} gapSize - Gap size between blocks in hours
   */
  layoutBlocksSequentially(blockArray, gapSize = 0) {
    const placedBlocks = this.getLockedBlocksAsPlaced();
    let currentStart = 0;

    blockArray.forEach(block => {
      // Check for conflicts and find valid position
      let validPosition = this.findValidPosition(placedBlocks, currentStart, block.duration);

      // Update block position
      // Safety check: never move locked blocks
      if (!block.isLocked) {
        // Safety check: never move locked blocks
        if (!block.isLocked) {
          this.timeline.updateBlock(block.id, { start: validPosition });
        }
      }

      // Add to placed blocks
      // Only add to placed blocks if it's not locked (locked blocks are already in placedBlocks)
      if (!block.isLocked) {
        // Only add to placed blocks if it's not locked (locked blocks are already in placedBlocks)
        if (!block.isLocked) {
          placedBlocks.push({
            id: block.id,
            start: validPosition,
            duration: block.duration
          });
        }
      }

      // Move to next position with gap
      currentStart = (validPosition + block.duration + gapSize) % 24;
      if (!this.timeline.isWrappingEnabled) {
        currentStart = Math.min(24, currentStart);
      }
    });
  }

  /**
   * Helper method to place blocks in preferred time slots
   * @param {Array} blocks - Blocks to place
   * @param {Array} preferredSlots - Array of time slots with start/end times
   * @param {Array} placedBlocks - Already placed blocks to avoid conflicts
   */
  placeBlocksInSlots(blocks, preferredSlots, placedBlocks) {
    blocks.forEach(block => {
      let placed = false;

      // Try each preferred slot in order
      for (let slot of preferredSlots) {
        const slotDuration = slot.end - slot.start;
        if (block.duration <= slotDuration) {
          // Try to place within this slot
          for (let time = slot.start; time <= slot.end - block.duration && !placed; time += 0.25) {
            if (!this.checkForTimeConflicts(placedBlocks, time, block.duration, this.timeline.isWrappingEnabled)) {
              // Safety check: never move locked blocks
              if (!block.isLocked) {
                this.timeline.updateBlock(block.id, { start: time });
              }
              // Only add to placed blocks if it's not locked (locked blocks are already in placedBlocks)
              if (!block.isLocked) {
                placedBlocks.push({
                  id: block.id,
                  start: time,
                  duration: block.duration
                });
              }
              placed = true;
            }
          }
        }
        if (placed) break;
      }

      // If couldn't place in preferred slots, place anywhere available
      if (!placed) {
        const validPosition = this.findValidPosition(placedBlocks, 0, block.duration);
        // Safety check: never move locked blocks
      if (!block.isLocked) {
        // Safety check: never move locked blocks
        if (!block.isLocked) {
          this.timeline.updateBlock(block.id, { start: validPosition });
        }
      }
        // Only add to placed blocks if it's not locked (locked blocks are already in placedBlocks)
        if (!block.isLocked) {
          placedBlocks.push({
            id: block.id,
            start: validPosition,
            duration: block.duration
          });
        }
      }
    });
  }

  /**
   * Helper method to find a valid position for a block
   * @param {Array} placedBlocks - Already placed blocks
   * @param {number} preferredStart - Preferred start time
   * @param {number} duration - Block duration
   * @returns {number} Valid start time
   */
  findValidPosition(placedBlocks, preferredStart, duration) {
    // Try preferred position first
    if (!this.checkForTimeConflicts(placedBlocks, preferredStart, duration, this.timeline.isWrappingEnabled)) {
      return preferredStart;
    }

    // Try positions in 15-minute increments
    for (let hour = 0; hour < 24; hour += 0.25) {
      if (!this.checkForTimeConflicts(placedBlocks, hour, duration, this.timeline.isWrappingEnabled)) {
        if (this.timeline.isWrappingEnabled || hour + duration <= 24) {
          return hour;
        }
      }
    }

    // Fallback to preferred start (will overlap but still functional)
    return preferredStart;
  }

  /**
   * Gets all locked blocks formatted as placed blocks for conflict detection
   * @returns {Array} Array of locked blocks in placed block format
   */
  getLockedBlocksAsPlaced() {
    const allBlocks = Array.from(this.timeline.blocks.values());
    const lockedBlocks = allBlocks.filter(block => block.isLocked);

    return lockedBlocks.map(block => ({
      id: block.id,
      start: block.start,
      duration: block.duration,
      isLocked: true
    }));
  }
}