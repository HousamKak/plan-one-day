# 24-Hour Visual Day Planner

## Overview
The 24-Hour Visual Day Planner is a web-based application designed to help users visually organize their day. It provides an interactive timeline where users can create, edit, and manage blocks of time, allowing for efficient planning and scheduling.

## Features
- **Interactive Timeline**: Drag and resize blocks to adjust their duration and position.
- **Time Wrapping**: Option to enable or disable wrapping of blocks around midnight.
- **Conflict Detection**: Prevents overlapping blocks when overlap is disabled.
- **Customizable Time Format**: Toggle between 12-hour and 24-hour time formats.
- **Presets Management**: Save and load timeline configurations as presets.
- **Shuffling Strategies**: Rearrange blocks using various strategies like compact, spread, clustered, and time-of-day optimized.
- **Keyboard Accessibility**: Fully accessible modals and controls for improved usability.

## Installation
1. Clone the repository or download the project files.
2. Open the `index.html` file in a web browser to launch the application.

## Usage
### Adding a Block
1. Click on the timeline grid to open the block creation modal.
2. Fill in the block details (name, duration, and color).
3. Click "Create" to add the block to the timeline.

### Editing a Block
1. Right-click on a block to open the context menu.
2. Select "Edit" to modify the block's details.

### Managing Presets
- **Save a Preset**: Click the save button, enter a name, and save the current timeline configuration.
- **Load a Preset**: Select a preset from the dropdown menu to load it.

### Toolbar Controls
- **Clear Timeline**: Removes all blocks from the timeline.
- **Shuffle Blocks**: Opens a modal to select a shuffling strategy.
- **Toggle Wrap-Around**: Enables or disables wrapping of blocks around midnight.
- **Toggle Overlap**: Allows or prevents overlapping blocks.
- **Toggle Time Format**: Switches between 12-hour and 24-hour time formats.

## File Structure
```
project-root/
├── index.html          # Main HTML file
├── css/
│   └── style.css       # Stylesheet
├── js/
│   ├── Block.js        # Block class for managing timeline blocks
│   ├── Storage.js      # Storage class for managing presets
│   ├── Timeline.js     # Timeline class for managing the timeline
│   └── ui.js           # UI initialization and event handling
└── README.md           # Project documentation
```

## Development
### Prerequisites
- A modern web browser (e.g., Chrome, Firefox, Edge).
- A text editor or IDE for code modifications (e.g., VS Code).

### Running the Project
1. Open the `index.html` file in a browser to view the application.
2. Modify the JavaScript or CSS files as needed to customize functionality or appearance.

### Key Classes
- **`Block`**: Represents individual timeline blocks with drag and resize capabilities.
- **`Timeline`**: Manages the timeline grid, block interactions, and shuffling strategies.
- **`Storage`**: Handles saving and loading of presets using localStorage.

## Accessibility
The application includes features to ensure accessibility:
- Keyboard navigation for modals and controls.
- ARIA attributes for buttons and toggles.
- Visual focus indicators for interactive elements.

## License
This project is licensed under the MIT License. See the LICENSE file for details.

## Acknowledgments
- Icons and UI components inspired by modern design principles.
- Developed with a focus on usability and accessibility.