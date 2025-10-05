# Ports Explorer

> **Effortlessly monitor and manage network ports directly from VS Code**

Ports Explorer is a powerful VS Code extension that provides real-time visibility into all processes listening on network ports. Perfect for developers running multiple services locally, this extension helps you identify, monitor, and terminate processes without leaving your editor.

## Features

### 🔍 **Comprehensive Port Monitoring**
- View all processes listening on TCP ports in an organized tree view
- See detailed information: port number, process name, PID, and full command line
- Automatic categorization into Development, System, and Other processes
- Real-time status indicators for new, changed, or offline ports

### 📊 **Flexible Organization**
- **Multiple View Modes**: Switch between tree and flat list views
- **Smart Grouping**: Organize ports by process, category, workspace, or custom groups
- **Custom Groups**: Create named groups (e.g., "Frontend", "Backend") for quick access
- **Favorites**: Mark frequently-used ports as favorites for easy filtering

### ⚡ **Powerful Actions**
- **Kill Process**: Terminate any process with a single click
- **Open in Browser**: Launch HTTP/HTTPS services directly from the tree
- **Copy URL**: Quickly copy localhost URLs to clipboard
- **Show Details**: View comprehensive process information in a dedicated panel

### 🎯 **Advanced Filtering**
- Filter by favorites, development processes, or workspace-related ports
- Show only processes from your current workspace/project
- Custom port labels for easy identification
- Search and filter capabilities

### 📈 **History & Analytics**
- Track port usage over time
- View historical port activity
- Analytics dashboard for monitoring patterns
- Configurable history limits

### ⚙️ **Highly Configurable**
- Auto-refresh at customizable intervals
- Workspace-aware filtering with configurable paths
- Import/export configuration for team sharing
- Extensive settings for personalization

## Installation

### From VSIX (Current)
1. Download the latest `ports-explorer-x.x.x.vsix` file
2. In VS Code, open the Extensions view (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Click the `...` menu → **Install from VSIX...**
4. Select the downloaded `.vsix` file

### From Marketplace (Coming Soon)
Search for "Ports Explorer" in the VS Code Extensions marketplace and click Install.

## Usage

### Getting Started
1. Open the **Explorer** sidebar (`Ctrl+Shift+E` / `Cmd+Shift+E`)
2. Find the **Ports Explorer** section
3. Click the refresh icon to scan for active ports
4. Explore your running services!

### Common Tasks

#### View Port Details
- Hover over any port to see the full command line
- Click **Show Details** to view comprehensive process information

#### Kill a Process
- Click the `✕` icon next to any port
- Or right-click → **Kill Process**

#### Open in Browser
- Click the globe icon for HTTP/HTTPS services
- Or right-click → **Open in Browser**

#### Organize Ports
- Create custom groups: Click the `+` icon → **Create New Group**
- Add ports to groups: Right-click a port → **Add to Group**
- Switch grouping: Click list icon → **Toggle Tree/List View**

#### Filter Ports
- Click the filter icon to choose:
  - **All Ports**: Show everything
  - **Favorites**: Show only starred ports
  - **Dev Processes**: Show development servers only
  - **Workspace**: Show only workspace-related processes

#### Export/Import Configuration
- Share your groups and settings with teammates
- Click gear icon → **Export Configuration** to save
- Click download icon → **Import Configuration** to load

## Configuration

### Key Settings

```jsonc
{
  // How to group ports in the tree view
  "portsExplorer.groupBy": "category", // port | process | group | category | workspace

  // Custom groups of ports
  "portsExplorer.groups": {
    "Frontend": [3000, 5173, 4200],
    "Backend": [5000, 8000],
    "Databases": [5432, 27017, 6379]
  },

  // Custom labels for specific ports
  "portsExplorer.portLabels": {
    "3000": "React App",
    "5000": "API Server",
    "5432": "PostgreSQL"
  },

  // Auto-refresh interval in seconds (0 to disable)
  "portsExplorer.autoRefresh": 5,

  // Show only workspace-related processes
  "portsExplorer.showOnlyWorkspace": false,

  // Additional paths to consider as workspace (for monorepos)
  "portsExplorer.workspacePaths": [
    "/path/to/frontend",
    "/path/to/backend"
  ],

  // Display mode
  "portsExplorer.viewMode": "tree", // tree | list

  // Default filter
  "portsExplorer.filterMode": "none", // none | favorites | dev | workspace

  // Enable port history tracking
  "portsExplorer.enableHistory": true,

  // Maximum historical entries
  "portsExplorer.historyLimit": 1000,

  // Show status indicators
  "portsExplorer.showPortStatus": true
}
```

## Commands

All commands are accessible via the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

- `Ports Explorer: Refresh Ports` - Manually refresh the port list
- `Ports Explorer: Toggle Tree/List View` - Switch between view modes
- `Ports Explorer: Create New Group` - Create a custom port group
- `Ports Explorer: Manage Groups` - Edit existing groups
- `Ports Explorer: Filter Ports` - Apply filtering
- `Ports Explorer: Show Port History` - View historical port usage
- `Ports Explorer: Show Analytics Dashboard` - View usage analytics
- `Ports Explorer: Export Configuration` - Export settings to file
- `Ports Explorer: Import Configuration` - Import settings from file

## Requirements

- **VS Code**: Version 1.104.0 or higher
- **Node.js**: For running the extension (bundled with VS Code)
- **Operating System**: Windows, macOS, or Linux

## Use Cases

### Web Development
Running React (3000), API server (5000), and database (5432)? See them all at a glance and kill stuck processes instantly.

### Microservices
Managing multiple services locally? Group them by function and monitor their status in real-time.

### Port Conflicts
Getting "port already in use" errors? Quickly identify and terminate conflicting processes.

### Team Collaboration
Export your port groups and labels, share with your team for consistent development environments.

## Troubleshooting

### Ports not showing up?
- Click the refresh icon to manually scan
- Check if auto-refresh is enabled in settings
- Ensure processes are actually listening (not just running)

### Can't kill a process?
- Some system processes require elevated permissions
- Try running VS Code as administrator (Windows) or with sudo (macOS/Linux)

### Workspace filtering not working?
- Verify `portsExplorer.workspacePaths` includes your project directories
- Check that processes include workspace paths in their command line

## Privacy & Permissions

This extension:
- Only scans local network ports on your machine
- Does not send any data externally
- Stores configuration locally in VS Code settings
- Requires permission to read system process information

## Development

Want to contribute? Great!

### Setup
```bash
# Clone the repository
git clone https://github.com/your-username/ports-explorer.git
cd ports-explorer

# Install dependencies
pnpm install

# Open in VS Code
code .
```

### Building
```bash
# Compile TypeScript
pnpm run compile

# Watch for changes
pnpm run watch

# Run tests
pnpm test

# Package for distribution
pnpm run package
```

### Testing
Press `F5` in VS Code to launch the Extension Development Host with the extension loaded.

## Roadmap

- [ ] Support for UDP ports
- [ ] Remote server monitoring
- [ ] Port usage graphs and trends
- [ ] Automatic port conflict resolution
- [ ] Integration with Docker containers
- [ ] Custom actions/scripts per port

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT](LICENSE)

## Support

Found a bug or have a feature request? [Open an issue](https://github.com/your-username/ports-explorer/issues)

---

**Enjoy using Ports Explorer!** ⭐ If you find this extension helpful, please consider leaving a review!
