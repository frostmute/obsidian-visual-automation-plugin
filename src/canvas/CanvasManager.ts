import { App, Canvas, CanvasView, TFile } from "obsidian";
import { CanvasNodeEx, NodeConfig, WorkflowConnection } from "./CanvasNode";
import { WorkflowStorage, WorkflowData } from "../storage";

export class CanvasManager {
  private app: App;
  private canvas?: Canvas;
  private workflowStorage: WorkflowStorage;

  constructor(app: App, workflowStorage?: WorkflowStorage) {
    this.app = app;
    this.workflowStorage = workflowStorage ?? new WorkflowStorage(app, "workflows");
    this.init();
  }

  private init() {
    this.app.workspace.on("visible-view-change", (oldView, newView) => {
      if (newView instanceof CanvasView) {
        this.canvas = newView.canvas;
      }
    });
  }

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
    } as any) as any;
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

  getAllConnections(): WorkflowConnection[] {
    if (!this.canvas) return [];
    return this.canvas.links.map(link => ({
      sourceId: link.source,
      targetId: link.target,
      type: "direct"
    }));
  }

  saveWorkflow(): Promise<TFile> {
    const nodes = this.getWorkflowNodes();
    const connections = this.getAllConnections();
    const workflowData: WorkflowData = {
      id: this.workflowStorage.generateId(),
      name: "New Workflow",
      nodes: nodes.map(n => n.config),
      connections,
      createdAt: new Date().toISOString()
    };
    return this.workflowStorage.saveWorkflow(workflowData);
  }

  async loadLatestWorkflow(): Promise<WorkflowData | null> {
    return await this.workflowStorage.getLatestWorkflow();
  }

  async loadWorkflow(id: string): Promise<WorkflowData | null> {
    return await this.workflowStorage.loadWorkflow(id);
  }

  async listWorkflows(): Promise<WorkflowData[]> {
    return await this.workflowStorage.listWorkflows();
  }

  async deleteWorkflow(id: string): Promise<void> {
    return await this.workflowStorage.deleteWorkflow(id);
  }
}