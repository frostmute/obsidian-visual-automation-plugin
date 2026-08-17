import { App, CanvasView, Plugin } from "obsidian";
import { CanvasManager } from "../canvas/CanvasManager";
import { NodeRenderer } from "./NodeRenderer";

export class CanvasToolbar {
  private container: HTMLElement | null = null;
  private app: App;
  private canvasManager: CanvasManager;
  private nodeRenderer: NodeRenderer;
  private plugin: Plugin;

  constructor(app: App, canvasManager: CanvasManager, nodeRenderer: NodeRenderer, plugin: Plugin) {
    this.app = app;
    this.canvasManager = canvasManager;
    this.nodeRenderer = nodeRenderer;
    this.plugin = plugin;
  }

  createToolbar() {
    const toolbar = document.createElement("div");
    toolbar.id = "va-canvas-toolbar";
    toolbar.style.cssText = `
      position: fixed;
      top: 60px;
      right: 10px;
      z-index: 1000;
      display: flex;
      gap: 8px;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(8px);
      border-radius: 8px;
      padding: 8px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.15);
    `;

    toolbar.appendChild(this.createButton("⚡", "Add Trigger", () => this.addNode("trigger")));
    toolbar.appendChild(this.createButton("❓", "Add Condition", () => this.addNode("condition")));
    toolbar.appendChild(this.createButton("⚙️", "Add Action", () => this.addNode("action")));
    toolbar.appendChild(this.createButton("🗑", "Delete Selected", () => this.deleteSelected()));
    toolbar.appendChild(this.createButton("▶", "Execute", () => this.execute()));

    document.body.appendChild(toolbar);
    this.container = toolbar;
  }

  removeToolbar() {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }

  private createButton(icon: string, tooltip: string, callback: () => void): HTMLElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.style.cssText = `
      width: 32px;
      height: 32px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: white;
      cursor: pointer;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    `;
    btn.title = tooltip;
    btn.textContent = icon;

    btn.onmouseenter = () => {
      btn.style.background = "#f0f0f0";
      btn.style.borderColor = "#bbb";
    };
    btn.onmouseleave = () => {
      btn.style.background = "white";
      btn.style.borderColor = "#ddd";
    };
    btn.onclick = (e) => {
      e.stopPropagation();
      callback();
    };

    return btn;
  }

  private addNode(type: "trigger" | "condition" | "action") {
    const view = this.app.workspace.getActiveViewComponent();
    if (!(view instanceof CanvasView)) {
      new this.plugin.app.notice("No canvas open");
      return;
    }

    const canvas = view.canvas;
    const mousePos = { x: (view as any).getMousePosition()?.x ?? canvas.width / 2, y: (view as any).getMousePosition()?.y ?? canvas.height / 2 };

    const node = this.canvasManager.createNode(type, `New ${type}`, mousePos);
    if (node) new this.plugin.app.notice(`${type[0].toUpperCase() + type.slice(1)} node created`);
  }

  private deleteSelected() {
    const node = this.nodeRenderer.getSelectedNode();
    if (node) {
      this.canvasManager.deleteNode(node.id);
      this.nodeRenderer.clearSelection();
      new this.plugin.app.notice("Node deleted");
    } else {
      new this.plugin.app.notice("Select a node first");
    }
  }

  private execute() {
    const view = this.app.workspace.getActiveViewComponent();
    if (!(view instanceof CanvasView)) {
      new this.plugin.app.notice("No canvas open");
      return;
    }
    (this.plugin as any).executor?.execute();
  }

  isVisible(): boolean {
    return this.container !== null;
  }

  show() {
    if (!this.container) this.createToolbar();
    else this.container.style.display = "flex";
  }

  hide() {
    if (this.container) this.container.style.display = "none";
  }
}