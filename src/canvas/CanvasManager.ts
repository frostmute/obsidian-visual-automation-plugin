import { App, Canvas, CanvasView, TFile, Notice } from "obsidian";
import { CanvasNodeEx, NodeConfig, WorkflowConnection } from "./CanvasNode";

export class CanvasManager {
  private app: App;
  private canvas?: Canvas;

  constructor(app: App) {
    this.app = app;
    this.init();
  }

  private init() {
    this.app.workspace.on("visible-view-change", this.onViewChange);
  }

  private onViewChange = (oldView: unknown, newView: unknown) => {
    if (newView instanceof CanvasView) {
      this.canvas = newView.canvas;
    }
  };

  getCanvas(): Canvas | undefined {
    return this.canvas;
  }

  createNode(type: "trigger" | "condition" | "action", name: string, pos: { x: number; y: number }): CanvasNodeEx | null {
    if (!this.canvas) return null;

    const nodeId = this.canvas.idCounter++;
    const config: NodeConfig = { type, name, properties: {} };
    const node = this.canvas.addNode({
      id: nodeId,
      pos,
      width: 150,
      height: 80,
    } as never);

    (node as unknown as Record<string, unknown>).nodeType = type;
    (node as unknown as Record<string, unknown>).config = config;

    return node as CanvasNodeEx;
  }

  deleteNode(nodeId: string) {
    if (!this.canvas) return;
    this.canvas.removeNode(nodeId);
  }

  createConnection(sourceId: string, targetId: string): WorkflowConnection | null {
    if (!this.canvas) return null;
    const link = this.canvas.addLink({
      source: sourceId,
      target: targetId,
    } as never) as CanvasLink;
    if (!link) return null;
    return { sourceId, targetId, type: "direct" };
  }

  deleteConnection(sourceId: string, targetId: string) {
    if (!this.canvas) return;
    const link = this.canvas.links.find(l => l.source === sourceId && l.target === targetId);
    if (link) this.canvas.removeLink(link);
  }

  getWorkflowNodes(): CanvasNodeEx[] {
    if (!this.canvas) return [];
    return Object.values(this.canvas.nodes).filter(n => (n as CanvasNodeEx).nodeType) as CanvasNodeEx[];
  }

  saveWorkflow(vault: TFile) {
    // TODO: persist workflow to file
  }
}