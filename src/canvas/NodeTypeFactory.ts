import { CanvasNode, ComponentPosition } from "obsidian";
import { CanvasNodeEx, NodeConfig } from "./CanvasNode";

interface NodeFactory {
  (pos: ComponentPosition, name: string): CanvasNodeEx;
}

export const TriggerNode: NodeFactory = (pos, name) => ({
  id: `trigger_${Date.now()}`,
  pos,
  width: 160,
  height: 70,
  nodeType: "trigger",
  config: { type: "trigger", name, properties: {} }
} as CanvasNodeEx);

export const ConditionNode: NodeFactory = (pos, name) => ({
  id: `condition_${Date.now()}`,
  pos,
  width: 160,
  height: 70,
  nodeType: "condition",
  config: { type: "condition", name, properties: {} }
} as CanvasNodeEx);

export const ActionNode: NodeFactory = (pos, name) => ({
  id: `action_${Date.now()}`,
  pos,
  width: 160,
  height: 70,
  nodeType: "action",
  config: { type: "action", name, properties: {} }
} as CanvasNodeEx);