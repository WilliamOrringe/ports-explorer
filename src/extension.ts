// src/extension.ts
import * as vscode from "vscode";
import netstat from "node-netstat";
import * as si from "systeminformation";
import * as path from "path";
import * as fs from "fs";

type GroupByOption = "port" | "process" | "group" | "category" | "workspace";
type PortCategory = "favorites" | "dev" | "system";
type ViewMode = "tree" | "list";
type FilterMode = "none" | "favorites" | "dev" | "workspace";

interface ProjectInfo {
  name: string;
  path: string;
  framework: string;
}

interface PortData {
  port: number;
  pid: number;
  process: string;
  cmdline: string;
  category: PortCategory;
  isFavorite: boolean;
  project?: ProjectInfo;
  workspaceFolder?: string | undefined;
  status?: "new" | "changed" | "stable" | "offline";
  lastSeen?: Date;
  firstSeen?: Date;
}

interface PortHistoryEntry {
  port: number;
  pid: number;
  process: string;
  timestamp: Date;
  action: "started" | "stopped" | "changed";
  details?: string;
}

interface GroupDefinition {
  name: string;
  ports: number[];
  description?: string;
  color?: string;
}

interface PortAnalytics {
  totalPorts: number;
  activeDev: number;
  systemPorts: number;
  favoriteCount: number;
  mostUsedPorts: Array<{ port: number; count: number; label: string }>;
  recentActivity: PortHistoryEntry[];
}

/* -------------------------
   Defaults & heuristics
   ------------------------- */
const DEFAULT_PORT_LABELS: Record<number, string> = {
  3000: "React/Next.js",
  3001: "React (alt)",
  4200: "Angular",
  5000: "Flask/.NET",
  5173: "Vite",
  8000: "Django/Python",
  8080: "Spring Boot/Tomcat",
  8888: "Jupyter",
  1313: "Hugo",
  3030: "Meteor",
};

const DEV_PROCESS_HINTS = [
  "node",
  "npm",
  "pnpm",
  "yarn",
  "vite",
  "webpack",
  "ng",
  "next",
  "nuxt",
  "python",
  "gunicorn",
  "uvicorn",
  "django",
  "flask",
  "dotnet",
  "java",
  "php",
  "rails",
];

function getConfig<T = any>(key: string, defaultValue?: T): T {
  return vscode.workspace
    .getConfiguration("portsExplorer")
    .get<T>(key, defaultValue as T)!;
}

/* -------------------------
   Tree Items
   ------------------------- */
class CategoryItem extends vscode.TreeItem {
  constructor(
    public readonly id: string,
    label: string,
    public readonly count = 0
  ) {
    super(label, vscode.TreeItemCollapsibleState.Expanded);
    this.contextValue = "category";
  }
}

class PortItem extends vscode.TreeItem {
  constructor(public readonly data: PortData) {
    super(`:${data.port}`, vscode.TreeItemCollapsibleState.None);
    this.description = data.project
      ? `${data.project.framework} · ${data.project.name}`
      : `${data.process} (PID ${data.pid})`;
    this.tooltip = makeTooltip(data);
    this.contextValue = data.isFavorite ? "portItemFavorite" : "portItem";
    this.iconPath = new vscode.ThemeIcon(iconFor(data));
    this.command = {
      command: "portsExplorer.showDetails",
      title: "Show Details",
      arguments: [this],
    };
  }
}

function makeTooltip(d: PortData) {
  let tip = `Port: ${d.port}\nProcess: ${d.process}\nPID: ${d.pid}`;
  if (d.project) {
    tip =
      `Project: ${d.project.name}\nFramework: ${d.project.framework}\nPath: ${d.project.path}\n` +
      tip;
  }
  if (d.workspaceFolder) {
    tip += `\nWorkspace: ${d.workspaceFolder}`;
  }
  tip += `\nCmd: ${d.cmdline || "N/A"}`;
  return tip;
}

function iconFor(d: PortData | ProjectInfo | string): string {
  const label =
    typeof d === "string"
      ? d
      : ("framework" in (d as any)
          ? (d as any).framework
          : (d as PortData).process) || "";
  const s = String(label).toLowerCase();
  if (s.includes("react") || s.includes("next")) {
    return "react";
  }
  if (s.includes("vue") || s.includes("vite")) {
    return "vue";
  }
  if (s.includes("angular")) {
    return "angular";
  }
  if (s.includes("python") || s.includes("django") || s.includes("flask")) {
    return "python";
  }
  if (s.includes("node") || s.includes("express")) {
    return "nodejs";
  }
  if (s.includes("java") || s.includes("spring")) {
    return "coffee";
  }
  if (s.includes("dotnet") || s.includes("asp.net")) {
    return "database";
  }
  return "server";
}

/* -------------------------
   Provider
   ------------------------- */
export class PortProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<
    vscode.TreeItem | undefined | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private ports: PortData[] = [];
  private previousPorts: Map<string, PortData> = new Map();
  private portHistory: PortHistoryEntry[] = [];
  private favorites: Set<number>;
  private autoRefreshTimer?: NodeJS.Timeout;
  private currentFilter: FilterMode = "none";
  private searchTerm: string = "";

  constructor(private context: vscode.ExtensionContext) {
    this.favorites = new Set(
      context.workspaceState.get<number[]>("portsFavorites", [])
    );
    this.portHistory = context.workspaceState.get<PortHistoryEntry[]>(
      "portHistory",
      []
    );
    this.currentFilter = getConfig<FilterMode>("filterMode", "none");

    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("portsExplorer")) {
        this.setupAutoRefresh();
        this.refresh();
      }
    });
    this.setupAutoRefresh();
  }

  dispose() {
    if (this.autoRefreshTimer) {
      clearInterval(this.autoRefreshTimer);
    }
  }

  refresh() {
    this.load();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    console.log(
      `[Ports Explorer] getChildren called, element:`,
      element?.label,
      `ports count: ${this.ports.length}`
    );

    // Apply filtering
    let filteredPorts = this.getFilteredPorts();

    const viewMode = getConfig<ViewMode>("viewMode", "tree");
    const groupBy = getConfig<GroupByOption>("groupBy", "category");

    if (!element) {
      // Root level
      if (filteredPorts.length === 0) {
        console.log("[Ports Explorer] No ports found, showing placeholder");
        const placeholder = new vscode.TreeItem(
          this.currentFilter === "none"
            ? "Click refresh to load ports"
            : "No ports match current filter",
          vscode.TreeItemCollapsibleState.None
        );
        placeholder.contextValue = "message";
        return [placeholder];
      }

      // List view - show all ports directly
      if (viewMode === "list") {
        return filteredPorts.map((d) => new PortItem(d));
      }

      // Tree view - show grouped structure
      return this.getGroupedItems(filteredPorts, groupBy);
    } else {
      // Children of a category/group
      return this.getCategoryChildren(
        element as CategoryItem,
        filteredPorts,
        groupBy
      );
    }
  }

  private getFilteredPorts(): PortData[] {
    let filtered = [...this.ports];

    // Apply search term
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.port.toString().includes(term) ||
          p.process.toLowerCase().includes(term) ||
          (p.project?.name || "").toLowerCase().includes(term) ||
          (p.cmdline || "").toLowerCase().includes(term)
      );
    }

    // Apply current filter
    switch (this.currentFilter) {
      case "favorites":
        filtered = filtered.filter((p) => p.isFavorite);
        break;
      case "dev":
        filtered = filtered.filter((p) => p.category === "dev");
        break;
      case "workspace":
        filtered = filtered.filter((p) => p.workspaceFolder);
        break;
    }

    return filtered;
  }

  private getGroupedItems(
    ports: PortData[],
    groupBy: GroupByOption
  ): vscode.TreeItem[] {
    if (groupBy === "port" || groupBy === "category") {
      const fav = ports.filter((p) => p.isFavorite);
      const dev = ports.filter((p) => !p.isFavorite && p.category === "dev");
      const sys = ports.filter((p) => !p.isFavorite && p.category === "system");
      const cats: CategoryItem[] = [];

      if (fav.length) {
        cats.push(
          new CategoryItem(
            "favorites",
            `⭐ Favorites (${fav.length})`,
            fav.length
          )
        );
      }
      if (dev.length) {
        cats.push(
          new CategoryItem("dev", `🔧 Dev Servers (${dev.length})`, dev.length)
        );
      }
      if (sys.length) {
        cats.push(
          new CategoryItem("system", `💻 System (${sys.length})`, sys.length)
        );
      }
      return cats;
    }

    if (groupBy === "process") {
      const byProc = new Map<string, number>();
      ports.forEach((p) =>
        byProc.set(
          p.process || "Unknown",
          (byProc.get(p.process || "Unknown") || 0) + 1
        )
      );
      return Array.from(byProc.entries()).map(
        ([proc, count]) => new CategoryItem(proc, `${proc} (${count})`, count)
      );
    }

    if (groupBy === "group") {
      const userGroups = getConfig<Record<string, (number | string)[]>>(
        "groups",
        {}
      );
      const groups = Object.keys(userGroups);
      const items: CategoryItem[] = groups.map((g) => {
        const count = (userGroups[g] || []).length;
        return new CategoryItem(g, `${g} (${count})`, count);
      });

      const allGrouped = new Set<number>();
      Object.values(userGroups).forEach((arr) =>
        arr.forEach((n) => allGrouped.add(Number(n)))
      );
      const ungrouped = ports.filter((p) => !allGrouped.has(p.port));
      if (ungrouped.length) {
        items.push(
          new CategoryItem(
            "__ungrouped",
            `Ungrouped (${ungrouped.length})`,
            ungrouped.length
          )
        );
      }
      return items;
    }

    if (groupBy === "workspace") {
      const wsMap = new Map<string, number>();
      ports.forEach((p) =>
        wsMap.set(
          p.workspaceFolder || "__outside__",
          (wsMap.get(p.workspaceFolder || "__outside__") || 0) + 1
        )
      );
      return Array.from(wsMap.entries()).map(
        ([k, c]) =>
          new CategoryItem(
            k,
            `${
              k === "__outside__" ? "Outside Workspace" : path.basename(k)
            } (${c})`,
            c
          )
      );
    }

    return [];
  }

  private getCategoryChildren(
    element: CategoryItem,
    ports: PortData[],
    groupBy: GroupByOption
  ): PortItem[] {
    const id = element.id;
    let filtered: PortData[] = [];

    if (groupBy === "category") {
      if (id === "favorites") {
        filtered = ports.filter((p) => p.isFavorite);
      } else if (id === "dev") {
        filtered = ports.filter((p) => !p.isFavorite && p.category === "dev");
      } else if (id === "system") {
        filtered = ports.filter(
          (p) => !p.isFavorite && p.category === "system"
        );
      }
    } else if (groupBy === "port") {
      if (id === "favorites") {
        filtered = ports.filter((p) => p.isFavorite);
      }
    } else if (groupBy === "process") {
      filtered = ports.filter((p) => p.process === id);
    } else if (groupBy === "group") {
      const groups = getConfig<Record<string, (number | string)[]>>(
        "groups",
        {}
      );
      if (id === "__ungrouped") {
        const all = new Set<number>();
        Object.values(groups).forEach((arr) =>
          arr.forEach((n) => all.add(Number(n)))
        );
        filtered = ports.filter((p) => !all.has(p.port));
      } else {
        const arr = groups[id] || [];
        filtered = ports.filter((p) =>
          arr.map((n) => Number(n)).includes(p.port)
        );
      }
    } else if (groupBy === "workspace") {
      if (id === "__outside__" || id.startsWith("__outside__")) {
        filtered = ports.filter((p) => !p.workspaceFolder);
      } else {
        filtered = ports.filter((p) => p.workspaceFolder === id);
      }
    }

    return filtered.map((d) => new PortItem(d));
  }

  // View and Filter Management
  toggleViewMode() {
    const current = getConfig<ViewMode>("viewMode", "tree");
    const newMode: ViewMode = current === "tree" ? "list" : "tree";
    vscode.workspace
      .getConfiguration("portsExplorer")
      .update("viewMode", newMode, vscode.ConfigurationTarget.Global);
    this._onDidChangeTreeData.fire();
  }

  setFilter(mode: FilterMode) {
    this.currentFilter = mode;
    this._onDidChangeTreeData.fire();
  }

  setSearchTerm(term: string) {
    this.searchTerm = term;
    this._onDidChangeTreeData.fire();
  }

  toggleFavorite(item: PortItem) {
    const port = item.data.port;
    if (this.favorites.has(port)) {
      this.favorites.delete(port);
    } else {
      this.favorites.add(port);
    }
    this.context.workspaceState.update(
      "portsFavorites",
      Array.from(this.favorites)
    );
    this.ports.forEach((p) => {
      if (p.port === port) {
        p.isFavorite = this.favorites.has(port);
      }
    });
    this._onDidChangeTreeData.fire();
  }

  private setupAutoRefresh() {
    if (this.autoRefreshTimer) {
      clearInterval(this.autoRefreshTimer);
    }
    const seconds = getConfig<number>("autoRefresh", 0);
    if (seconds > 0) {
      this.autoRefreshTimer = setInterval(() => this.refresh(), seconds * 1000);
    }
  }

  private getPortLabels(): Record<number, string> {
    const raw = getConfig<Record<string, string>>("portLabels", {});
    const parsed: Record<number, string> = {};
    for (const [k, v] of Object.entries(raw || {})) {
      const n = parseInt(k, 10);
      if (!isNaN(n)) {
        parsed[n] = v;
      }
    }
    return { ...DEFAULT_PORT_LABELS, ...parsed };
  }

  private categorizePort(
    port: number,
    process: string,
    cmdline: string
  ): PortCategory {
    const processLower = process.toLowerCase();
    const cmdLower = cmdline.toLowerCase();

    // Always dev if explicitly labeled (like 3000, 5173, etc.)
    if (this.getPortLabels()[port]) {
      return "dev";
    }

    // Known dev processes
    const isDevProcess = DEV_PROCESS_HINTS.some((hint) =>
      processLower.includes(hint)
    );

    // Dev keywords in command line
    const devIndicators = [
      "webpack",
      "vite",
      "nodemon",
      "ts-node",
      "next",
      "nuxt",
      "parcel",
      "rollup",
      "esbuild",
      "dev-server",
      "hot-reload",
      "live-server",
      "npm run dev",
      "yarn dev",
      "pnpm dev",
      "django runserver",
      "flask run",
      "rails server",
      "dotnet run",
      "dotnet watch",
    ];
    const hasDevCmd = devIndicators.some((ind) => cmdLower.includes(ind));

    // Workspace tie-in
    let inWorkspace = false;
    if (vscode.workspace.workspaceFolders) {
      inWorkspace = vscode.workspace.workspaceFolders.some((f) =>
        cmdLower.includes(f.uri.fsPath.toLowerCase())
      );
    }

    const strictWorkspace = getConfig<boolean>("strictWorkspace", false);

    // Rule: must look like a dev process AND (cmd has dev keyword OR workspace tie-in)
    if (isDevProcess && (hasDevCmd || inWorkspace)) {
      return "dev";
    }

    // Strict mode requires workspace tie-in
    if (strictWorkspace && !inWorkspace) {
      return "system";
    }

    return "system";
  }

  private extractWorkingDirectory(
    cmdline: string | undefined
  ): string | undefined {
    if (!cmdline) {
      return undefined;
    }
    const lower = cmdline.toLowerCase();

    // match any workspace folder path
    const wsf = vscode.workspace.workspaceFolders || [];
    for (const f of wsf) {
      const p = f.uri.fsPath;
      if (p && lower.includes(p.toLowerCase())) {
        return p;
      }
    }

    // check configured workspacePaths (relative or absolute)
    const extras = getConfig<string[]>("workspacePaths", []);
    for (const e of extras) {
      if (!e) {
        continue;
      }
      const candidate = path.isAbsolute(e)
        ? e
        : wsf[0]
        ? path.join(wsf[0].uri.fsPath, e)
        : e;
      if (candidate && lower.includes(candidate.toLowerCase())) {
        return candidate;
      }
    }

    // look for quoted paths
    const match = cmdline.match(/"([^"]+)"|'([^']+)'/);
    if (match) {
      const candidate = (match[1] || match[2] || "").trim();
      if (candidate && fs.existsSync(candidate)) {
        return candidate;
      }
    }

    // heuristics: token with slash or backslash that exists on FS
    const tokens = cmdline.split(/\s+/).filter(Boolean);
    for (const t of tokens) {
      if (t.includes("/") || t.includes("\\")) {
        const cleaned = t.replace(/(^['"`]+|['"`]+$)/g, "");
        let cur = cleaned;
        while (cur) {
          if (fs.existsSync(cur)) {
            return cur;
          }
          const parent = path.dirname(cur);
          if (parent === cur) {
            break;
          }
          cur = parent;
        }
      }
    }

    return undefined;
  }

  /* -------------------------
     Scanning logic
     ------------------------- */
  async load() {
    console.log("[Ports Explorer] Starting port scan...");
    this.ports = [];
    const showOnlyWorkspace = getConfig<boolean>("showOnlyWorkspace", false);
    const extraPaths = (getConfig<string[]>("workspacePaths", []) || []).map(
      (s) => s.toLowerCase()
    );
    const workspaceRoots = (vscode.workspace.workspaceFolders || []).map((f) =>
      f.uri.fsPath.toLowerCase()
    );
    const allPaths = [...workspaceRoots, ...extraPaths];

    try {
      const connections = await si.networkConnections();
      const processes = await si.processes();
      console.log(
        `[Ports Explorer] Found ${connections?.length || 0} connections`
      );

      const seen = new Set<string>();
      for (const conn of connections || []) {
        if (
          conn.protocol === "tcp" &&
          (conn.state === "LISTEN" || conn.state === "LISTENING") &&
          conn.localPort
        ) {
          const pid = conn.pid || 0;
          const port = Number(conn.localPort);
          const key = `${port}-${pid}`;
          if (seen.has(key)) {
            continue;
          }
          seen.add(key);

          // lookup process info
          let procName = (conn.process as string) || "Unknown";
          let cmdline = "";
          if (pid && processes && Array.isArray((processes as any).list)) {
            const p = (processes as any).list.find((x: any) => x.pid === pid);
            if (p) {
              procName = p.name || procName;
              cmdline = (p.command || p.params || "").toString();
            }
          }

          // workspace filter
          if (showOnlyWorkspace && allPaths.length > 0) {
            const lowerCmd = (cmdline || "").toLowerCase();
            const matches = allPaths.some((ap) => lowerCmd.includes(ap));
            if (!matches) {
              continue;
            }
          }

          const category = this.categorizePort(port, procName, cmdline);
          const isFav = this.favorites.has(port);

          const portData: PortData = {
            port,
            pid,
            process: procName,
            cmdline,
            category,
            isFavorite: isFav,
          };
          if (category === "dev") {
            portData.project = await this.detectProject(cmdline);
          }
          portData.workspaceFolder = this.extractWorkingDirectory(cmdline);
          this.ports.push(portData);
        }
      }

      if (this.ports.length === 0) {
        console.log(
          "[Ports Explorer] No ports from systeminformation, trying netstat fallback"
        );
        await this.loadWithNetstat();
      }
    } catch (err) {
      console.warn(
        "[Ports Explorer] systeminformation failed, falling back to netstat:",
        err
      );
      await this.loadWithNetstat();
    } finally {
      console.log(
        `[Ports Explorer] Scan complete. Found ${this.ports.length} ports`
      );
      // optional: hide system processes if configured
      const showSystem = getConfig<boolean>("showSystemProcesses", true);
      if (!showSystem) {
        this.ports = this.ports.filter(
          (p) => p.category === "dev" || p.isFavorite
        );
      }
      this._onDidChangeTreeData.fire();
    }
  }

  private loadWithNetstat(): Promise<void> {
    return new Promise((resolve) => {
      const seen = new Set<string>();
      const detectionPromises: Promise<void>[] = [];
      netstat(
        {
          sync: false,
          done: async () => {
            await Promise.all(detectionPromises);
            resolve();
          },
        },
        (data: any) => {
          if (!data || data.protocol !== "tcp") {
            return;
          }
          const state = (data.state || "").toString().toLowerCase();
          if (!state.includes("listen")) {
            return;
          }

          const port = Number(data.local?.port || 0);
          const pid = data.pid || 0;
          const key = `${port}-${pid}`;
          if (seen.has(key) || !port) {
            return;
          }
          seen.add(key);

          const processName = data.process || "Unknown";
          const cmdline = data.cmdline || "";

          const category = this.categorizePort(port, processName, cmdline);
          const isFav = this.favorites.has(port);

          const portData: PortData = {
            port,
            pid,
            process: processName,
            cmdline,
            category,
            isFavorite: isFav,
          };
          if (category === "dev") {
            const p = this.detectProject(cmdline).then((pr) => {
              if (pr) {
                portData.project = pr;
              }
            });
            detectionPromises.push(p);
          }
          portData.workspaceFolder = this.extractWorkingDirectory(cmdline);
          this.ports.push(portData);
        }
      );
    });
  }

  private async detectProject(
    cmdline: string | undefined
  ): Promise<ProjectInfo | undefined> {
    if (!cmdline) {
      return undefined;
    }
    const wd = this.extractWorkingDirectory(cmdline);
    if (!wd) {
      return undefined;
    }
    try {
      if (!fs.existsSync(wd)) {
        return undefined;
      }
      const pkg = path.join(wd, "package.json");
      const req = path.join(wd, "requirements.txt");
      const gem = path.join(wd, "Gemfile");
      const composer = path.join(wd, "composer.json");
      const pom = path.join(wd, "pom.xml");

      let framework = "Unknown";
      if (fs.existsSync(pkg)) {
        const content = JSON.parse(fs.readFileSync(pkg, "utf8"));
        const deps = {
          ...(content.dependencies || {}),
          ...(content.devDependencies || {}),
        };
        if (deps.next) {
          framework = "Next.js";
        } else if (deps.react) {
          framework = "React";
        } else if (deps.vue) {
          framework = "Vue";
        } else if (deps["@angular/core"]) {
          framework = "Angular";
        } else if (deps.vite) {
          framework = "Vite";
        } else if (deps.nuxt) {
          framework = "Nuxt";
        } else {
          framework = "Node.js";
        }
      } else if (fs.existsSync(req)) {
        const txt = fs.readFileSync(req, "utf8").toLowerCase();
        if (txt.includes("django")) {
          framework = "Django";
        } else if (txt.includes("flask")) {
          framework = "Flask";
        } else {
          framework = "Python";
        }
      } else if (fs.existsSync(gem)) {
        const txt = fs.readFileSync(gem, "utf8").toLowerCase();
        framework = txt.includes("rails") ? "Ruby on Rails" : "Ruby";
      } else if (fs.existsSync(composer)) {
        const comp = JSON.parse(fs.readFileSync(composer, "utf8"));
        framework =
          comp.require && comp.require["laravel/framework"] ? "Laravel" : "PHP";
      } else if (fs.existsSync(pom)) {
        const xml = fs.readFileSync(pom, "utf8");
        framework = xml.includes("spring-boot") ? "Spring Boot" : "Java/Maven";
      }

      return { name: path.basename(wd), path: wd, framework };
    } catch (e) {
      console.warn("[Ports Explorer] detectProject error", e);
      return undefined;
    }
  }
}

/* -------------------------
   Activation & commands
   ------------------------- */
export function activate(context: vscode.ExtensionContext) {
  const provider = new PortProvider(context);
  vscode.window.registerTreeDataProvider("portsExplorer", provider);

  // initial load
  provider.refresh();

  context.subscriptions.push(
    vscode.commands.registerCommand("portsExplorer.refresh", () =>
      provider.refresh()
    ),

    // View Management
    vscode.commands.registerCommand("portsExplorer.toggleView", () => {
      provider.toggleViewMode();
      const viewMode = getConfig<ViewMode>("viewMode", "tree");
      vscode.window.showInformationMessage(`Switched to ${viewMode} view`);
    }),

    // Filtering
    vscode.commands.registerCommand("portsExplorer.filterPorts", async () => {
      const options = [
        { label: "$(clear-all) No Filter", value: "none" },
        { label: "$(star) Favorites Only", value: "favorites" },
        { label: "$(code) Dev Servers Only", value: "dev" },
        { label: "$(folder) Workspace Only", value: "workspace" },
      ];

      const selected = await vscode.window.showQuickPick(options, {
        placeHolder: "Select filter to apply",
      });

      if (selected) {
        provider.setFilter(selected.value as FilterMode);
        vscode.window.showInformationMessage(
          `Applied filter: ${selected.label.replace(/\$\([^)]+\)\s*/, "")}`
        );
      }
    }),

    // Group Management
    vscode.commands.registerCommand("portsExplorer.createGroup", async () => {
      const groupName = await vscode.window.showInputBox({
        prompt: "Enter group name",
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return "Group name cannot be empty";
          }
          return undefined;
        },
      });

      if (groupName) {
        const portsInput = await vscode.window.showInputBox({
          prompt: "Enter ports (comma-separated, e.g. 3000,8080,5000)",
          validateInput: (value) => {
            if (!value || value.trim().length === 0) {
              return "Please enter at least one port";
            }
            const ports = value.split(",").map((p) => p.trim());
            for (const port of ports) {
              if (
                isNaN(Number(port)) ||
                Number(port) <= 0 ||
                Number(port) > 65535
              ) {
                return `Invalid port: ${port}`;
              }
            }
            return undefined;
          },
        });

        if (portsInput) {
          const ports = portsInput.split(",").map((p) => Number(p.trim()));
          const currentGroups = getConfig<Record<string, number[]>>(
            "groups",
            {}
          );
          currentGroups[groupName] = ports;

          await vscode.workspace
            .getConfiguration("portsExplorer")
            .update("groups", currentGroups, vscode.ConfigurationTarget.Global);
          vscode.window.showInformationMessage(
            `Created group "${groupName}" with ${ports.length} ports`
          );
        }
      }
    }),

    vscode.commands.registerCommand("portsExplorer.manageGroups", async () => {
      const groups = getConfig<Record<string, number[]>>("groups", {});
      const groupNames = Object.keys(groups);

      if (groupNames.length === 0) {
        vscode.window.showInformationMessage(
          "No custom groups defined. Use 'Create New Group' to add one."
        );
        return;
      }

      const options = groupNames.map((name) => ({
        label: `$(tag) ${name}`,
        description: `Ports: ${groups[name].join(", ")}`,
        value: name,
      }));

      options.push({
        label: "$(trash) Delete a group",
        description: "",
        value: "__delete__",
      });

      const selected = await vscode.window.showQuickPick(options, {
        placeHolder: "Select group to manage",
      });

      if (selected?.value === "__delete__") {
        const deleteOptions = groupNames.map((name) => ({
          label: name,
          value: name,
        }));
        const toDelete = await vscode.window.showQuickPick(deleteOptions, {
          placeHolder: "Select group to delete",
        });

        if (toDelete) {
          delete groups[toDelete.value];
          await vscode.workspace
            .getConfiguration("portsExplorer")
            .update("groups", groups, vscode.ConfigurationTarget.Global);
          vscode.window.showInformationMessage(
            `Deleted group "${toDelete.value}"`
          );
        }
      }
    }),

    // Port Actions
    vscode.commands.registerCommand(
      "portsExplorer.addToGroup",
      async (item: PortItem) => {
        if (!item?.data) {
          return;
        }

        const groups = getConfig<Record<string, number[]>>("groups", {});
        const groupNames = Object.keys(groups);

        if (groupNames.length === 0) {
          vscode.window.showInformationMessage(
            "No groups available. Create a group first."
          );
          return;
        }

        const options = groupNames.map((name) => ({
          label: name,
          value: name,
        }));
        const selected = await vscode.window.showQuickPick(options, {
          placeHolder: `Add port ${item.data.port} to which group?`,
        });

        if (selected) {
          if (!groups[selected.value].includes(item.data.port)) {
            groups[selected.value].push(item.data.port);
            await vscode.workspace
              .getConfiguration("portsExplorer")
              .update("groups", groups, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage(
              `Added port ${item.data.port} to group "${selected.value}"`
            );
          } else {
            vscode.window.showInformationMessage(
              `Port ${item.data.port} is already in group "${selected.value}"`
            );
          }
        }
      }
    ),

    vscode.commands.registerCommand(
      "portsExplorer.removeFromGroup",
      async (item: PortItem) => {
        if (!item?.data) {
          return;
        }

        const groups = getConfig<Record<string, number[]>>("groups", {});
        const groupsWithPort = Object.entries(groups).filter(([_, ports]) =>
          ports.includes(item.data.port)
        );

        if (groupsWithPort.length === 0) {
          vscode.window.showInformationMessage(
            `Port ${item.data.port} is not in any groups.`
          );
          return;
        }

        const options = groupsWithPort.map(([name, _]) => ({
          label: name,
          value: name,
        }));
        const selected = await vscode.window.showQuickPick(options, {
          placeHolder: `Remove port ${item.data.port} from which group?`,
        });

        if (selected) {
          groups[selected.value] = groups[selected.value].filter(
            (p) => p !== item.data.port
          );
          await vscode.workspace
            .getConfiguration("portsExplorer")
            .update("groups", groups, vscode.ConfigurationTarget.Global);
          vscode.window.showInformationMessage(
            `Removed port ${item.data.port} from group "${selected.value}"`
          );
        }
      }
    ),

    // Configuration Management
    vscode.commands.registerCommand("portsExplorer.exportConfig", async () => {
      const config = {
        groups: getConfig("groups", {}),
        portLabels: getConfig("portLabels", {}),
        favorites: Array.from(provider["favorites"]),
        settings: {
          groupBy: getConfig("groupBy", "category"),
          viewMode: getConfig("viewMode", "tree"),
          autoRefresh: getConfig("autoRefresh", 0),
          showOnlyWorkspace: getConfig("showOnlyWorkspace", false),
          workspacePaths: getConfig("workspacePaths", []),
        },
      };

      const content = JSON.stringify(config, null, 2);
      const doc = await vscode.workspace.openTextDocument({
        content,
        language: "json",
      });
      await vscode.window.showTextDocument(doc);
      vscode.window.showInformationMessage(
        "Configuration exported to new document"
      );
    }),

    vscode.commands.registerCommand("portsExplorer.importConfig", async () => {
      const document = vscode.window.activeTextEditor?.document;
      if (!document) {
        vscode.window.showErrorMessage(
          "Please open a JSON file with configuration to import"
        );
        return;
      }

      try {
        const content = document.getText();
        const config = JSON.parse(content);

        const items = ["Groups", "Port Labels", "Favorites", "Settings", "All"];

        const selected = await vscode.window.showQuickPick(items, {
          placeHolder: "What would you like to import?",
        });

        if (!selected) {
          return;
        }

        const configObj = vscode.workspace.getConfiguration("portsExplorer");

        if (selected === "Groups" || selected === "All") {
          if (config.groups) {
            await configObj.update(
              "groups",
              config.groups,
              vscode.ConfigurationTarget.Global
            );
          }
        }
        if (selected === "Port Labels" || selected === "All") {
          if (config.portLabels) {
            await configObj.update(
              "portLabels",
              config.portLabels,
              vscode.ConfigurationTarget.Global
            );
          }
        }
        if (selected === "Favorites" || selected === "All") {
          if (config.favorites) {
            context.workspaceState.update("portsFavorites", config.favorites);
          }
        }
        if (selected === "Settings" || selected === "All") {
          if (config.settings) {
            for (const [key, value] of Object.entries(config.settings)) {
              await configObj.update(
                key,
                value,
                vscode.ConfigurationTarget.Global
              );
            }
          }
        }

        vscode.window.showInformationMessage(
          `Configuration imported: ${selected}`
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to import configuration: ${error}`
        );
      }
    }),

    // History and Analytics
    vscode.commands.registerCommand("portsExplorer.showHistory", async () => {
      const history = context.workspaceState.get<PortHistoryEntry[]>(
        "portHistory",
        []
      );

      if (history.length === 0) {
        vscode.window.showInformationMessage("No port history available");
        return;
      }

      const content = history
        .slice(-50) // Show last 50 entries
        .reverse()
        .map(
          (entry) =>
            `${entry.timestamp.toLocaleString()} - Port ${entry.port} (${
              entry.process
            }) ${entry.action} - ${entry.details || ""}`
        )
        .join("\n");

      const doc = await vscode.workspace.openTextDocument({
        content: `Port History (Last 50 entries)\n${"=".repeat(
          50
        )}\n\n${content}`,
        language: "plaintext",
      });
      await vscode.window.showTextDocument(doc);
    }),

    vscode.commands.registerCommand("portsExplorer.showAnalytics", async () => {
      const ports = provider["ports"] as PortData[];
      const history = context.workspaceState.get<PortHistoryEntry[]>(
        "portHistory",
        []
      );

      const analytics: PortAnalytics = {
        totalPorts: ports.length,
        activeDev: ports.filter((p) => p.category === "dev").length,
        systemPorts: ports.filter((p) => p.category === "system").length,
        favoriteCount: ports.filter((p) => p.isFavorite).length,
        mostUsedPorts: getMostUsedPorts(ports, history),
        recentActivity: history.slice(-10).reverse(),
      };

      const content = `
# Ports Explorer Analytics Dashboard

## Current Status
- **Total Active Ports**: ${analytics.totalPorts}
- **Development Servers**: ${analytics.activeDev}
- **System Processes**: ${analytics.systemPorts}
- **Favorite Ports**: ${analytics.favoriteCount}

## Most Used Ports
${analytics.mostUsedPorts
  .map((p) => `- Port ${p.port}: ${p.label} (${p.count} sessions)`)
  .join("\n")}

## Recent Activity
${analytics.recentActivity
  .map(
    (a) =>
      `- ${a.timestamp.toLocaleString()}: Port ${a.port} (${a.process}) ${
        a.action
      }`
  )
  .join("\n")}

## Port Distribution
- Development: ${Math.round(
        (analytics.activeDev / analytics.totalPorts) * 100
      )}%
- System: ${Math.round((analytics.systemPorts / analytics.totalPorts) * 100)}%

---
*Generated: ${new Date().toLocaleString()}*
`;

      const doc = await vscode.workspace.openTextDocument({
        content,
        language: "markdown",
      });
      await vscode.window.showTextDocument(doc);
    }),

    vscode.commands.registerCommand(
      "portsExplorer.killProcess",
      (item: PortItem) => {
        if (!item || !item.data || !item.data.pid) {
          return;
        }
        try {
          process.kill(item.data.pid);
          vscode.window.showInformationMessage(
            `Killed ${item.data.process} (PID ${item.data.pid})`
          );
          provider.refresh();
        } catch (err: any) {
          vscode.window.showErrorMessage(
            `Failed to kill: ${err?.message || err}`
          );
        }
      }
    ),

    vscode.commands.registerCommand(
      "portsExplorer.toggleFavorite",
      (item: PortItem) => {
        if (!item) {
          return;
        }
        provider.toggleFavorite(item);
        vscode.window.showInformationMessage(
          item.data.isFavorite
            ? `Removed :${item.data.port} from favorites`
            : `Added :${item.data.port} to favorites`
        );
      }
    ),

    vscode.commands.registerCommand(
      "portsExplorer.openInBrowser",
      (item: PortItem) => {
        if (!item) {
          return;
        }
        const url = `http://localhost:${item.data.port}`;
        vscode.env.openExternal(vscode.Uri.parse(url));
      }
    ),

    vscode.commands.registerCommand(
      "portsExplorer.copyUrl",
      async (item: PortItem) => {
        if (!item) {
          return;
        }
        const url = `http://localhost:${item.data.port}`;
        await vscode.env.clipboard.writeText(url);
        vscode.window.showInformationMessage(`Copied ${url}`);
      }
    ),

    vscode.commands.registerCommand(
      "portsExplorer.showDetails",
      (item: PortItem) => {
        if (!item) {
          return;
        }
        const d = item.data;
        const details = [
          `Port: ${d.port}`,
          `Process: ${d.process}`,
          `PID: ${d.pid}`,
          `Category: ${d.category}`,
          `Cmd: ${d.cmdline || "N/A"}`,
          `Project: ${
            d.project ? `${d.project.name} (${d.project.framework})` : "N/A"
          }`,
          `Workspace: ${d.workspaceFolder || "N/A"}`,
          `Favorite: ${d.isFavorite ? "Yes" : "No"}`,
        ].join("\n");
        vscode.window.showInformationMessage(details, { modal: true });
      }
    )
  );

  console.log("[Ports Explorer] activated");
}

// Helper functions
function getMostUsedPorts(
  ports: PortData[],
  history: PortHistoryEntry[]
): Array<{ port: number; count: number; label: string }> {
  const portCounts = new Map<number, number>();
  const portLabels = new Map<number, string>();

  // Count occurrences in history
  history.forEach((entry) => {
    portCounts.set(entry.port, (portCounts.get(entry.port) || 0) + 1);
  });

  // Add current ports and their labels
  ports.forEach((port) => {
    if (!portCounts.has(port.port)) {
      portCounts.set(port.port, 1);
    }
    const label = port.project?.framework || port.process || "Unknown";
    portLabels.set(port.port, label);
  });

  return Array.from(portCounts.entries())
    .map(([port, count]) => ({
      port,
      count,
      label: portLabels.get(port) || "Unknown",
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

export function deactivate() {
  // nothing special yet
}
