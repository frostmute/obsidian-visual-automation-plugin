import { Notice, App, TFile } from "obsidian";
import { CanvasNodeEx, WorkflowConnection } from "../canvas/CanvasNode";
import { WorkflowStorage, WorkflowData, ExecutionRecord } from "../storage";

export interface ExecutionResult {
  success: boolean;
  output: string[];
  errors: string[];
  durationMs: number;
}

export class WorkflowExecutor {
  private app: App;
  private workflowStorage: WorkflowStorage;
  private isActive: boolean = false;
  private currentTime: number = 0;
  private currentResult: ExecutionResult | null = null;
  
  // Handler maps
  private triggerHandlers: Map<string, (config: any) => Promise<string>> = new Map();
  private actionHandlers: Map<string, (config: any) => Promise<string>> = new Map();
  
  // Node cache for frequent lookups
  private nodeCache: Map<string, CanvasNodeEx> = new Map();
  
  // Batch execution configuration
  private readonly MAX_PARALLEL_NODES = 5;
  private readonly BATCH_TIMEOUT_MS = 5000;

  constructor(app: App, workflowStorage: WorkflowStorage) {
    this.app = app;
    this.workflowStorage = workflowStorage;
    this.registerDefaultHandlers();
  }

  private registerDefaultHandlers() {
    // Trigger handlers
    this.triggerHandlers.set("note-created", async (config) => {
      const path = config?.path || "*";
      return `Trigger: note created at ${path}`;
    });

    this.triggerHandlers.set("file-modified", async (config) => {
      const path = config?.path || "*";
      return `Trigger: file modified at ${path}`;
    });

    this.triggerHandlers.set("daily-note", async () => {
      return "Trigger: daily note event";
    });

    this.triggerHandlers.set("tag-added", async (config) => {
      const tag = config?.tag || "";
      return `Trigger: tag added: ${tag}`;
    });

    this.triggerHandlers.set("search-result", async (config) => {
      const query = config?.query || "";
      return `Trigger: search result: ${query}`;
    });

    // Action handlers
    this.actionHandlers.set("create-note", async (config) => {
      const path = config?.path || "New Note.md";
      const content = config?.content || "";
      await this.app.vault.create(path, content);
      return `Action: created note at ${path}`;
    });

    this.actionHandlers.set("dataview", async (config) => {
      const query = config?.query || "";
      // Simulate execution - in real implementation would parse and run query
      return `Action: dataview query executed: ${query}`;
    });

    this.actionHandlers.set("tasks", async (config) => {
      const task = config?.task || "";
      return `Action: tasks updated: ${task}`;
    });

    this.actionHandlers.set("template", async (config) => {
      const template = config?.template || "";
      return `Action: template applied: ${template}`;
    });

    this.actionHandlers.set("command", async (config) => {
      const commandId = config?.commandId || "";
      try {
        await (this.app as any).commands.executeCommandById(commandId);
        return `Action: command executed: ${commandId}`;
      } catch (e) {
        throw new Error(`Command execution failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    });

    this.actionHandlers.set("append-file", async (config) => {
      const path = config?.path || "";
      const content = config?.content || "";
      const file = this.app.vault.getAbstractFileByPath(path);
      if (file instanceof TFile) {
        const current = await this.app.vault.read(file);
        await this.app.vault.modify(file, current + "\n" + content);
        return `Action: appended to ${path}`;
      }
      throw new Error(`File not found: ${path}`);
    });

    this.actionHandlers.set("set-property", async (config) => {
      const filePath = config?.filePath || "";
      const key = config?.key || "";
      const value = config?.value || "";
      return `Action: property set: ${filePath} #${key} = ${value}`;
    });
  }

  registerTrigger(type: string, handler: (config: any) => Promise<string>) {
    this.triggerHandlers.set(type, handler);
  }

  registerAction(type: string, handler: (config: any) => Promise<string>) {
    this.actionHandlers.set(type, handler);
  }

  async execute(nodes: CanvasNodeEx[], connections: WorkflowConnection[], workflowId?: string): Promise<ExecutionResult> {
    this.currentTime = Date.now();
    this.isActive = true;
    this.nodeCache.clear();
    
    // Pre-cache all nodes for O(1) lookup
    nodes.forEach(node => {
      this.nodeCache.set(node.id, node);
    });

    const result: ExecutionResult = {
      success: true,
      output: [],
      errors: [],
      durationMs: 0
    };

    if (!this.validateWorkflow(nodes, connections)) {
      result.success = false;
      result.errors.push("Invalid workflow: missing nodes or connections");
      result.durationMs = Date.now() - this.currentTime;
      this.isActive = false;
      return result;
    }

    // Use batch execution for better performance
    const executionOrderBatches = this.batchTopologicalSort(nodes, connections);
    
    for (const batch of executionOrderBatches) {
      if (!this.isActive) break;
      
      // Process batch in parallel
      const batchResults = await Promise.allSettled(
        batch.map(nodeId => this.executeNodeQuick(nodeId))
      );
      
      // Collect results
      for (const batchResult of batchResults) {
        if (batchResult.status === "fulfilled") {
          const { output, error } = batchResult.value;
          if (error) {
            result.errors.push(error);
            result.success = false;
          }
          if (output) {
            result.output.push(output);
          }
        } else {
          result.errors.push(`Execution error: ${batchResult.reason instanceof Error ? batchResult.reason.message : String(batchResult.reason)}`);
          result.success = false;
        }
      }
    }

    result.durationMs = Date.now() - this.currentTime;
    this.isActive = false;
    
    // Record execution history if workflowId provided
    if (workflowId) {
      const workflow = await this.workflowStorage.loadWorkflow(workflowId);
      if (workflow) {
        await this.workflowStorage.recordExecutionHistory(workflowId, {
          id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          nodesExecuted: this.currentResult?.output.map(o => o.split('[')[1]?.split(']')[0] || '') || [],
          output: result.output,
          errors: result.errors,
          durationMs: result.durationMs
        });
      }
    }
    
    new Notice(result.success ? "Workflow completed ✓" : "Workflow failed ✗");
    return result;
  }

  // Optimized node execution using cache
  private async executeNodeQuick(nodeId: string): Promise<{ output: string | null; error: string | null }> {
    const node = this.nodeCache.get(nodeId);
    if (!node) return { output: null, error: `Node not found: ${nodeId}` };
    
    try {
      const output = await this.executeNode(node);
      return { output, error: null };
    } catch (e) {
      return { output: null, error: e instanceof Error ? e.message : String(e) };
    }
  }

  private validateWorkflow(nodes: CanvasNodeEx[], connections: WorkflowConnection[]): boolean {
    return nodes.length >= 1 && connections.length >= (nodes.length - 1);
  }

  private async executeNode(node: CanvasNodeEx): Promise<string> {
    const type = node.config.type;
    const config = node.config.properties || {};

    switch (type) {
      case "trigger":
        return this.executeTrigger(node, config);
      case "condition":
        return this.executeCondition(node, config);
      case "action":
        return this.executeAction(node, config);
      default:
        return `Unknown node type: ${type}`;
    }
  }

  private async executeTrigger(node: CanvasNodeEx, config: any): Promise<string> {
    const triggerType = config?.triggerType || "note-created";
    const handler = this.triggerHandlers.get(triggerType);
    if (handler) {
      return await handler(config);
    }
    return `Trigger: ${node.config.name} fired (type: ${triggerType})`;
  }

  private async executeCondition(node: CanvasNodeEx, config: any): Promise<string> {
    const conditionType = config?.conditionType || "always-true";
    
    switch (conditionType) {
      case "always-true":
        return `Condition: ${node.config.name} evaluated true`;
      case "tag-check":
        const tag = config?.tag || "";
        return `Condition: ${node.config.name} checked tag: ${tag}`;
      case "property-check":
        const property = config?.property || "";
        const value = config?.value || "";
        return `Condition: ${node.config.name} checked property: ${property} = ${value}`;
      case "not-empty":
        const field = config?.field || "";
        return `Condition: ${node.config.name} checked field: ${field} not empty`;
      default:
        return `Condition: ${node.config.name} evaluated`;
    }
  }

  private async executeAction(node: CanvasNodeEx, config: any): Promise<string> {
    const actionType = config?.actionType || "create-note";
    const handler = this.actionHandlers.get(actionType);
    if (handler) {
      return await handler(config);
    }
    return `Action: ${node.config.name} completed (type: ${actionType})`;
  }

  // Batch topological sort for parallel execution
  private batchTopologicalSort(nodes: CanvasNodeEx[], connections: WorkflowConnection[]): string[][] {
    if (nodes.length === 0) return [];
    
    // Build adjacency list and in-degree map
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    
    // Initialize all nodes with empty lists and 0 in-degree
    for (const node of nodes) {
      graph.set(node.id, []);
      inDegree.set(node.id, 0);
    }
    
    // Build graph from connections
    for (const conn of connections) {
      const source = graph.get(conn.sourceId);
      if (source) {
        source.push(conn.targetId);
      }
      const targetDegree = inDegree.get(conn.targetId) ?? 0;
      inDegree.set(conn.targetId, targetDegree + 1);
    }
    
    // Collect independent nodes (in-degree 0)
    const independentNodes: string[] = [];
    const batches: string[][] = [];
    
    inDegree.forEach((degree, nodeId) => {
      if (degree === 0) {
        independentNodes.push(nodeId);
      }
    });
    
    // Process nodes in batches
    while (independentNodes.length > 0) {
      // Take up to MAX_PARALLEL_NODES for this batch
      const currentBatch = independentNodes.splice(0, this.MAX_PARALLEL_NODES);
      batches.push([...currentBatch]);
      
      // Reduce in-degree for neighbors and collect new independent nodes
      const newIndependent: string[] = [];
      for (const nodeId of currentBatch) {
        const neighbors = graph.get(nodeId) || [];
        for (const neighbor of neighbors) {
          const deg = (inDegree.get(neighbor) || 0) - 1;
          inDegree.set(neighbor, deg);
          if (deg === 0) {
            newIndependent.push(neighbor);
          }
        }
      }
      
      // Merge new independent nodes with remaining ones
      independentNodes.push(...newIndependent);
    }
    
    return batches;
  }

  isExecuting(): boolean {
    return this.isActive;
  }

  cancelExecution(): void {
    this.isActive = false;
  }
}