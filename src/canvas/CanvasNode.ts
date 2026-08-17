import { CanvasNode, CanvasLink } from "obsidian";

export interface NodeConfig {
  type: "trigger" | "condition" | "action";
  name: string;
  properties: Record<string, unknown>;
}

export interface CanvasNodeEx extends CanvasNode {
  nodeType: string;
  config: NodeConfig;
}

export interface WorkflowConnection {
  sourceId: string;
  targetId: string;
  type: string;
  conditions?: Record<string, unknown>;
}