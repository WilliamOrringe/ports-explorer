# Changelog

All notable changes to the "Ports Explorer" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-10-05

### Added
- Initial release of Ports Explorer
- Real-time port monitoring for TCP connections
- Process details display (port, PID, process name, command line)
- Multiple view modes: tree and list
- Smart grouping options: by port, process, category, workspace, or custom groups
- Custom port groups with easy management
- Port categorization (favorites, dev servers, system processes)
- Workspace-aware filtering
- Favorite ports feature with quick filtering
- Process termination from tree view
- Open in browser functionality for HTTP/HTTPS services
- Copy URL to clipboard
- Detailed process information panel
- Port usage history tracking
- Analytics dashboard with usage insights
- Configuration import/export for team sharing
- Auto-refresh capability with configurable intervals
- Custom port labels
- Framework detection (React, Vue, Angular, Django, etc.)
- Project detection from workspace
- Filter modes: all, favorites, dev servers, workspace only
- 16 commands for full control
- Comprehensive test suite
- Full documentation

### Features by Category

#### Monitoring & Display
- View all listening TCP ports in VS Code Explorer
- Automatic process categorization (dev vs system)
- Real-time status indicators
- Framework and project detection
- Command line visibility in tooltips

#### Organization
- Tree view with smart categories
- Flat list view option
- Group by: port, process, category, workspace, custom groups
- Custom port groups (Frontend, Backend, etc.)
- Favorites system

#### Actions
- Kill process with one click
- Open service in browser
- Copy localhost URLs
- View detailed process information
- Add/remove ports from groups

#### Configuration
- Auto-refresh (configurable interval)
- Workspace filtering
- Custom port labels
- Show/hide system processes
- Import/export settings
- Persistent favorites

#### Analytics
- Port usage history
- Most used ports tracking
- Recent activity log
- Analytics dashboard

### Technical
- Built with TypeScript
- Uses systeminformation and node-netstat for cross-platform port scanning
- esbuild for fast bundling
- Comprehensive test coverage
- ESLint + TypeScript strict mode

## [Unreleased]

### Planned Features
- UDP port support
- Remote server monitoring
- Port conflict detection and resolution
- Docker container integration
- Custom actions/scripts per port
- Port usage graphs and trends

---

## Version History

### Semantic Versioning Guide

- **MAJOR** (X.0.0): Breaking changes or major feature releases
- **MINOR** (0.X.0): New features, backwards compatible
- **PATCH** (0.0.X): Bug fixes, minor improvements
- **PRERELEASE** (0.0.X-beta.Y): Beta/preview releases

### How to Release

```bash
# Package only (creates .vsix)
pnpm run vsce:package

# Bump version + package
pnpm run version:patch      # 1.0.0 → 1.0.1
pnpm run version:minor      # 1.0.0 → 1.1.0
pnpm run version:major      # 1.0.0 → 2.0.0
pnpm run version:prerelease # 1.0.0 → 1.0.1-beta.0

# Bump version + package + publish
pnpm run release:patch
pnpm run release:minor
pnpm run release:major
pnpm run release:prerelease
```