# Idea Canvas

A modern, interactive mind mapping and task management tool built with React and Konva.js. Create, organize, and visualize your ideas with an intuitive drag-and-drop interface.

## Features

### Current Features

- **Task Management**: Create, edit, and delete tasks with double-click functionality
- **Hierarchical Organization**: Build parent-child relationships between tasks
- **Category System**: Group related tasks into visual categories
- **Multi-Selection**: Select multiple tasks using Ctrl+click or drag selection
- **Batch Operations**: Move multiple tasks simultaneously
- **Visual Feedback**: Real-time preview effects for relationship creation
- **Auto-Save**: Automatic saving every 5 seconds to prevent data loss
- **Export Options**: Save your canvas as images or JSON files
- **Undo/Redo**: Full history support with keyboard shortcuts (Ctrl+Z/Ctrl+Y)
- **Responsive Design**: Adapts to different screen sizes

### Color-Coded Task Types

- **Free Tasks**: Pink background - independent tasks
- **Parent Tasks**: Light blue background - tasks with children
- **Child Tasks**: Light green background - tasks with parents

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd idea-canvas
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

## Usage

### Basic Operations

- **Create Task**: Double-click on empty canvas area
- **Edit Task**: Double-click on any task
- **Delete Task**: Right-click on any task
- **Move Task**: Drag any task to reposition

### Advanced Operations

- **Create Parent-Child Relationship**: Drag a task to the bottom area of another task
- **Create Category**: Drag a task to the top area of another task
- **Add to Category**: Drag a task into an existing category
- **Multi-Select**: Hold Ctrl and click tasks, or drag to select multiple tasks
- **Batch Move**: Select multiple tasks and drag any one to move all

### Keyboard Shortcuts

- `Ctrl+Z`: Undo last action
- `Ctrl+Y`: Redo last undone action

## Future Features

### Planned Enhancements

- **Task Templates**: Pre-defined task structures for common workflows
- **Collaborative Editing**: Real-time multi-user collaboration
- **Advanced Export**: PDF, SVG, and other format support
- **Task Properties**: Due dates, priorities, and custom fields
- **Search and Filter**: Find tasks by content or properties
- **Zoom and Pan**: Navigate large canvases with mouse wheel
- **Keyboard Navigation**: Full keyboard accessibility
- **Task Dependencies**: Visual dependency arrows between tasks
- **Timeline View**: Gantt chart style project timeline
- **Integration**: Connect with external tools (Trello, Notion, etc.)
- **Mobile Support**: Touch-optimized interface for tablets and phones
- **Dark Mode**: Alternative color scheme for low-light environments
- **Custom Themes**: User-defined color schemes and layouts
- **Task Comments**: Add notes and comments to tasks
- **File Attachments**: Attach documents and images to tasks
- **Progress Tracking**: Visual progress indicators for tasks
- **Automation**: Rule-based task management and notifications

### Technical Improvements

- **Performance Optimization**: Virtual rendering for large canvases
- **Offline Support**: PWA capabilities for offline usage
- **Data Synchronization**: Cloud storage integration
- **Plugin System**: Extensible architecture for custom features
- **Advanced Analytics**: Usage statistics and productivity insights

## Technology Stack

- **Frontend**: React 18, Konva.js
- **State Management**: Zustand
- **Build Tool**: Vite
- **Styling**: CSS3 with modern features
- **Package Manager**: npm

## Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

## License

This project is open source and available under the MIT License.
