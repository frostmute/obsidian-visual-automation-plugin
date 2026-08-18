import { Plugin, Notice, CanvasView } from "obsidian";
import { CanvasManager } from "./canvas";
import { NodeRenderer, CanvasToolbar } from "./ui";
import { WorkflowStorage } from "./storage";
import { WorkflowExecutor } from "./execution";

interface PluginSettings {
  enableMCP: boolean;
  autoSaveWorkflows: boolean;
  toolbarVisible: boolean;
}

const DEFAULT_SETTINGS: PluginSettings = {
  enableMCP: true,
  autoSaveWorkflows: true,
  toolbarVisible: true
};

export default class VisualAutomationPlugin extends Plugin {
  settings: PluginSettings;
  canvasManager!: CanvasManager;
  nodeRenderer!: NodeRenderer;
  workflowStorage!: WorkflowStorage;
  executor!: WorkflowExecutor;
  toolbar!: CanvasToolbar;

  async onload() {
    await this.loadSettings();

    this.workflowStorage = new WorkflowStorage(this.app, "workflows");
    this.canvasManager = new CanvasManager(this.app, this.workflowStorage);
    this.nodeRenderer = new NodeRenderer();
    this.executor = new WorkflowExecutor(this.app, this.workflowStorage);

    // Register node style types
    this.nodeRenderer.styleNodeType("trigger", { bg: "#e3f2fd", border: "#1976d2", accent: "#0d47a1" });
    this.nodeRenderer.styleNodeType("condition", { bg: "#e8f5e9", border: "#388e3c", accent: "#1b5e20" });
    this.nodeRenderer.styleNodeType("action", { bg: "#fff3e0", border: "#f57c00", accent: "#e65100" });

    // Toolbar
    this.toolbar = new CanvasToolbar(this.app, this.canvasManager, this.nodeRenderer, this);

    // Show toolbar in canvas views
    this.registerEvent(
      this.app.workspace.on("visible-view-change", (oldView, newView) => {
        if (newView instanceof CanvasView && this.settings.toolbarVisible) {
          this.toolbar.createToolbar();
        } else {
          this.toolbar.removeToolbar();
        }
      })
    );

    // UI Commands (fallback for users who prefer command palette)
    this.addCommand({
      id: "add-trigger-node",
      name: "Add Trigger Node",
      callback: () => this.addNode("trigger")
    });

    this.addCommand({
      id: "add-condition-node",
      name: "Add Condition Node",
      callback: () => this.addNode("condition")
    });

    this.addCommand({
      id: "add-action-node",
      name: "Add Action Node",
      callback: () => this.addNode("action")
    });

    this.addCommand({
      id: "delete-selected-node",
      name: "Delete Selected Node",
      callback: () => {
        const node = this.nodeRenderer.getSelectedNode();
        if (node) {
          this.canvasManager.deleteNode(node.id);
          this.nodeRenderer.clearSelection();
          new Notice("Node deleted");
        } else {
          new Notice("No node selected");
        }
      }
    });

    this.addCommand({
      id: "execute-workflow",
      name: "Execute Workflow",
      callback: () => this.executeWorkflow()
    });

    this.addCommand({
      id: "toggle-toolbar",
      name: "Toggle Toolbar",
      callback: async () => {
        this.settings.toolbarVisible = !this.settings.toolbarVisible;
        await this.saveSettings();
        new Notice(`Toolbar ${this.settings.toolbarVisible ? "showed" : "hidden"}`);
      }
    });

    console.log("Visual Automation plugin loaded");
  }

  private async addNode(type: "trigger" | "condition" | "action") {
    const pos = this.getCanvasCenter() ?? { x: 0, y: 0 };
    const node = this.canvasManager.createNode(type, `New ${type.charAt(0).toUpperCase() + type.slice(1)}`, pos);
    if (node) new Notice(`${type.charAt(0).toUpperCase() + type.slice(1)} node created`);
  }

  private getCanvasCenter(): { x: number; y: number } | null {
    const view = this.app.workspace.getActiveViewComponent();
    if (view instanceof CanvasView) {
      return { x: view.canvas.width / 2, y: view.canvas.height / 2 };
    }
    return null;
  }

  private async executeWorkflow() {
    const nodes = this.canvasManager.getWorkflowNodes();
    const connections: any[] = [];
    const canvas = this.canvasManager.getCanvas();
    if (canvas && canvas.links) {
      canvas.links.forEach(l => connections.push({ sourceId: l.source, targetId: l.target }));
    }

    if (nodes.length < 2) {
      new Notice("Need at least 2 nodes to execute");
      return;
    }

    await this.executor.execute(nodes, connections);
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}