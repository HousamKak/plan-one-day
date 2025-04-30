/**
 * Module for handling background images and dark mode toggle
 */

/**
 * Initializes background images and dark mode toggle
 * @param {Array} images - Array of image filenames
 */
export function initBackground(images = ['image.png', 'image2.webp', 'image3.jpg', 'image4.jpg', 'image5.webp']) {
    // Find the timeline container
    const timelineContainer = document.querySelector('.timeline-container');
    if (!timelineContainer) {
      console.error('Timeline container not found');
      return;
    }
    
    // Create background container
    let bgContainer = document.createElement('div');
    bgContainer.className = 'background-container';
    bgContainer.style.position = 'absolute';
    bgContainer.style.top = '0';
    bgContainer.style.left = '0';
    bgContainer.style.width = '100%';
    bgContainer.style.height = '100%';
    bgContainer.style.zIndex = '-1'; // Place behind timeline content
    bgContainer.style.overflow = 'hidden';
    bgContainer.style.borderRadius = 'inherit'; // Match parent border radius
    
    // Add background container as first child of timeline container
    timelineContainer.style.position = 'relative'; // Ensure proper positioning
    timelineContainer.insertBefore(bgContainer, timelineContainer.firstChild);
    
    // Add background overlay
    const overlay = document.createElement('div');
    overlay.className = 'background-overlay';
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
    overlay.style.zIndex = '0';
    bgContainer.appendChild(overlay);
    
    // Add image elements for each image
    images.forEach((image, index) => {
      const imgElement = document.createElement('div');
      imgElement.className = 'background-image';
      imgElement.style.position = 'absolute';
      imgElement.style.top = '0';
      imgElement.style.left = '0';
      imgElement.style.width = '100%';
      imgElement.style.height = '100%';
      imgElement.style.backgroundSize = 'cover';
      imgElement.style.backgroundPosition = 'center';
      imgElement.style.backgroundImage = `url('assets/${image}')`;
      imgElement.style.opacity = index === 0 ? '1' : '0'; // First image visible
      imgElement.style.transition = 'opacity 1.5s ease-in-out';
      bgContainer.appendChild(imgElement);
    });
    
    // Create dark mode toggle
    createDarkModeToggle();
    
    // Start image rotation if more than one image
    if (images.length > 1) {
      startBackgroundCycle(images.length);
    }
  }
  
  /**
   * Creates the dark mode toggle button
   */
  function createDarkModeToggle() {
    // Check if toggle already exists
    if (document.querySelector('.dark-mode-toggle')) {
      return;
    }
    
    // Create toggle button
    const toggle = document.createElement('button');
    toggle.className = 'dark-mode-toggle';
    toggle.setAttribute('aria-label', 'Toggle dark mode');
    toggle.innerHTML = `
      <svg class="icon-sun" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2"/>
        <path d="M12 2V4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 20V22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M4 12L2 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M22 12L20 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M19.7782 4.22183L17.5563 6.44365" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M6.44365 17.5563L4.22183 19.7782" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M19.7782 19.7782L17.5563 17.5563" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M6.44365 6.44365L4.22183 4.22183" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <svg class="icon-moon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    
    // Add to document
    document.body.appendChild(toggle);
    
    // Add click handler
    toggle.addEventListener('click', toggleDarkMode);
    
    // Initialize based on system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.body.classList.add('dark-mode');
    }
    
    // Listen for system preference changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (e.matches) {
          document.body.classList.add('dark-mode');
        } else {
          document.body.classList.remove('dark-mode');
        }
      });
    }
  }
  
  /**
   * Toggles dark mode on/off
   */
  function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
  }
  
  /**
   * Starts cycling through background images
   * @param {number} imageCount - Number of background images
   */
  function startBackgroundCycle(imageCount) {
    if (imageCount <= 1) return;
    
    const images = document.querySelectorAll('.background-image');
    let currentIndex = 0;
    
    // Cycle every 30 seconds
    setInterval(() => {
      // Fade out current image
      images[currentIndex].style.opacity = '0';
      
      // Calculate next index
      currentIndex = (currentIndex + 1) % imageCount;
      
      // Fade in next image
      images[currentIndex].style.opacity = '1';
    }, 30000); // 30 seconds
  }