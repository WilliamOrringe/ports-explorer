# Ports Explorer

A VS Code extension that lists processes running on network ports (e.g., Node, Python, PHP) and lets you kill them directly from VS Code.

## Features

- **Port Monitoring**: View all processes listening on TCP ports in a tree view within the Explorer panel
- **Process Details**: See port number, process name, PID, and command line for each listening process
- **Refresh Ports**: Manually refresh the port list with a single click
- **Kill Process**: Terminate any process directly from the tree view

## Running Locally

1. Clone this repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Press **F5** in VS Code to open a new Extension Development Host window
4. Open the **Ports Explorer** view in the Explorer sidebar
5. Click the refresh icon to load listening ports

## Usage

- **View Ports**: Open the "Ports Explorer" section in the Explorer panel
- **Refresh**: Click the refresh icon in the view title bar
- **Kill Process**: Click the "X" icon next to any port item to terminate that process
- **Tooltip**: Hover over any item to see the full command line

## Commands

- `Ports Explorer: Refresh Ports` - Refresh the list of listening ports
- `Ports Explorer: Kill Process` - Terminate the selected process

## Settings

- `portsExplorer.portLabels` — custom port labels (defaults provided)
- `portsExplorer.groups` — user-defined groups mapping names to port arrays
- `portsExplorer.groupBy` — `port | process | group | workspace`
- `portsExplorer.autoRefresh` — toggle auto-refresh
- `portsExplorer.autoRefreshInterval` — seconds between refreshes
- `portsExplorer.showOnlyWorkspace` — show only workspace-related processes
- `portsExplorer.workspacePaths` — extra paths to consider workspace-related (monorepos)
## Requirements

- Node.js and pnpm
- VS Code 1.85.0 or higher

## Development

Build the extension:
```bash
pnpm run compile
```

Watch for changes:
```bash
pnpm run watch
```

Package for production:
```bash
pnpm run package
```
