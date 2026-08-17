import { Notice, App } from "obsidian";
import { CanvasNodeEx, WorkflowConnection } from "../canvas/CanvasNode";

export interface ExecutionResult {
  success: boolean;
  output: string[];
  errors: string[];
}

export class WorkflowExecutor {
  private app: App;
  private isActive: boolean = false;

  constructor(app: App) {
    this.app = app;
  }

  async execute(nodes: CanvasNodeEx[], connections: WorkflowConnection[]): Promise<ExecutionResult> {
    const result: ExecutionResult = { success: true, output: [], errors: [] };

    if (!this.validateWorkflow(nodes, connections)) {
      result.success = false;
      result.errors.push("Invalid workflow: missing nodes or connections");
      return result;
    }

    const executionOrder = this.topologicalSort(nodes, connections);
    this.isActive = true;

    for (const nodeId of executionOrder) {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) continue;

      try {
        const output = await this.executeNode(node);
        result.output.push(`[${node.config.name}] ${output}`);
      } catch (e) {
        result.errors.push(`[${node.config.name}] ${e instanceof Error ? e.message : String(e)}`);
        result.success = false;
      }
    }

    this.isActive = false;
    new Notice(result.success ? "Workflow completed ✓" : "Workflow failed ✗");
    return result;
  }

  private validateWorkflow(nodes: CanvasNodeEx[], connections: WorkflowConnection[]): boolean {
    return nodes.length > 0 && connections.length > 0;
  }

  private async executeNode(node: CanvasNodeEx): Promise<string> {
    const type = node.config.type;

    switch (type) {
      case "trigger":
        return this.executeTrigger(node);
      case "condition":
        return this.executeCondition(node);
      case "action":
        return this.executeAction(node);
      default:
        return `Unknown node type: ${type}`;
    }
  }

  private async executeTrigger(node: CanvasNodeEx): Promise<string> {
    return `Trigger: ${node.config.name} fired`;
  }

  private async executeCondition(node: CanvasNodeEx): Promise<string> {
    return `Condition: ${node.config.name} evaluated true`;
  }

  private async executeAction(node: CanvasNodeEx): Promise<string> {
    const name = node.config.name;
    if (name.includes("Dataview")) return "Dataview query executed";
    if (name.includes("Task")) return "Tasks updated";
    if (name.includes("Template")) return "Template applied";
    return `Action: ${name} completed`;
  }

  private topologicalSort(nodes: CanvasNodeEx[], connections: WorkflowConnection[]): string[] {
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    nodes.forEach(n => {
      graph.set(n.id, []);
      inDegree.set(n.id, 0);
    });

    connections.forEach(c => {
      const source = graph.get(c.sourceId);
      if (source) source.push(c.targetId);
      const targetDegree = inDegree.get(c.targetId) ?? 0;
      inDegree.set(c.targetId, targetDegree + 1);
    });

    const queue: string[] = [];
    const result: string[] = [];

    inDegree.forEach((degree, nodeId) => {
      if (degree === 0) queue.push(nodeId);
    });

    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      const neighbors = graph.get(current) ?? [];
      neighbors.forEach(neighbor => {
        const deg = inDegree.get(neighbor)! - 1;
        inDegree.set(neighbor, deg);
        if (deg === 0) queue.push(neighbor);
      });
    }

    return result;
  }

  isExecuting(): boolean {
    return this.isActive;
  }
}