/**
 * ShuffleUIManager.js
 * Responsible for UI components related to shuffle operations
 */
import { ShuffleManager } from './ShuffleManager.js';

export class ShuffleUIManager {
  /**
   * Creates a new ShuffleUIManager
   * @param {Object} timeline - Timeline instance to manage
   */
  constructor(timeline) {
    this.timeline = timeline;
    this.shuffleManager = new ShuffleManager(timeline);
    
    // Ensure styles are loaded
    this.ensureStylesLoaded();
  }

  /**
   * Opens modal to select a shuffling strategy
   */
  openStrategyModal() {
    // Create modal from HTML
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h2>Shuffle Strategy</h2>
        <p>Choose how you want to arrange your time blocks:</p>
        
        <div class="strategy-options">
          <button class="strategy-btn" data-strategy="random">
            <strong>Random</strong>
            <span>Completely randomize block order</span>
          </button>

          <button class="strategy-btn" data-strategy="compact">
            <strong>Compact</strong>
            <span>Minimize gaps between blocks</span>
          </button>

          <button class="strategy-btn" data-strategy="spread">
            <strong>Evenly Distributed</strong>
            <span>Spread blocks throughout the day</span>
          </button>

          <button class="strategy-btn" data-strategy="clustered">
            <strong>Clustered</strong>
            <span>Group similar blocks together</span>
          </button>

          <button class="strategy-btn" data-strategy="timeOfDay">
            <strong>Time-of-Day Optimized</strong>
            <span>Place blocks in morning/afternoon/evening periods</span>
          </button>

          <button class="strategy-btn" data-strategy="priority">
            <strong>Priority-Based</strong>
            <span>High priority tasks first, then medium, then low</span>
          </button>

          <button class="strategy-btn" data-strategy="energy">
            <strong>Energy-Based</strong>
            <span>High-energy tasks in morning, low-energy later</span>
          </button>

          <button class="strategy-btn" data-strategy="balanced">
            <strong>Balanced Variety</strong>
            <span>Alternates between different task categories</span>
          </button>

          <button class="strategy-btn" data-strategy="theme">
            <strong>Theme-Based</strong>
            <span>Groups work, health, learning, and personal tasks</span>
          </button>
        </div>
        
        <div class="form-buttons">
          <button type="button" class="cancel-btn">Cancel</button>
        </div>
      </div>
    `;

    // Add event listeners
    const cancelBtn = modal.querySelector('.cancel-btn');
    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    // Add click handlers to strategy buttons
    const strategyButtons = modal.querySelectorAll('.strategy-btn');
    strategyButtons.forEach(button => {
      button.addEventListener('click', () => {
        const strategy = button.getAttribute('data-strategy');
        document.body.removeChild(modal);
        this.shuffleManager.executeStrategy(strategy);
      });
    });

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });

    // Close modal on Escape key
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.body.removeChild(modal);
      }
    });

    // Add to DOM
    document.body.appendChild(modal);
    
    // Enable animation
    setTimeout(() => {
      modal.classList.add('modal-visible');
      modal.querySelector('.modal-content').classList.add('modal-content-visible');
    }, 10);
  }

  /**
   * Ensures shuffle-related styles are loaded
   * Creates styles if not already in document
   */
  ensureStylesLoaded() {
    // Check if styles already exist
    if (document.getElementById('shuffle-modal-styles')) {
      return;
    }
    
    // Create style element
    const styleElement = document.createElement('style');
    styleElement.id = 'shuffle-modal-styles';
    styleElement.textContent = `
      .strategy-options {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin: 20px 0;
      }
      
      .strategy-btn {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        padding: 12px 15px;
        background-color: var(--neumorph-bg);
        border: none;
        border-radius: var(--neumorph-border-radius);
        cursor: pointer;
        transition: all var(--transition-speed) ease;
        text-align: left;
        box-shadow: 
          var(--neumorph-shadow-distance) var(--neumorph-shadow-distance)
          calc(var(--neumorph-shadow-distance) * 2) var(--neumorph-shadow-dark),
          calc(-1 * var(--neumorph-shadow-distance)) calc(-1 * var(--neumorph-shadow-distance))
          calc(var(--neumorph-shadow-distance) * 2) var(--neumorph-light);
      }
      
      .strategy-btn:hover {
        background-color: var(--neumorph-light);
      }
      
      .strategy-btn:active {
        box-shadow: 
          inset var(--neumorph-shadow-distance) var(--neumorph-shadow-distance)
          calc(var(--neumorph-shadow-distance) * 1.5) var(--neumorph-inset-shadow-dark),
          inset calc(-1 * var(--neumorph-shadow-distance)) calc(-1 * var(--neumorph-shadow-distance))
          calc(var(--neumorph-shadow-distance) * 1.5) var(--neumorph-inset-shadow-light);
      }
      
      .strategy-btn strong {
        display: block;
        margin-bottom: 4px;
        color: var(--text-color);
      }
      
      .strategy-btn span {
        font-size: 0.85rem;
        color: var(--light-text);
      }
      
      /* Modal animation classes */
      .modal-visible {
        opacity: 1;
      }
      
      .modal-content-visible {
        transform: translateY(0) !important;
      }
      
      /* Responsive adjustments */
      @media (max-width: 768px) {
        .strategy-btn {
          padding: 10px 12px;
        }
        
        .strategy-btn span {
          font-size: 0.8rem;
        }
      }
    `;
    
    // Add to document head
    document.head.appendChild(styleElement);
  }
}