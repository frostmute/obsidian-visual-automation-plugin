import { TFile, TFolder, Notice, App } from "obsidian";
import { CanvasNodeEx, NodeConfig, WorkflowConnection } from "../canvas/CanvasNode";

export interface WorkflowData {
  id: string;
  name: string;
  nodes: NodeConfig[];
  connections: WorkflowConnection[];
  createdAt: string;
  version: string;
  // New execution history field
  executionHistory: ExecutionRecord[];
}

export interface ExecutionRecord {
  id: string;
  timestamp: string;
  nodesExecuted: string[];
  output: string[];
  errors: string[];
  durationMs: number;
}

export class WorkflowStorage {
  // ... existing code ...
  
  // New method to record execution history
  async recordExecutionHistory(workflowId: string, executionRecord: ExecutionRecord): Promise<void> {
    const path = `${this.workflowsFolder}/${workflowId}.json`;
    const file = this.app.vault.getAbstractFileByPath(path);
    
    if (!(file instanceof TFile)) {
      new Notice("Workflow file not found");
      return;
    }
    
    const content = await this.app.vault.read(file);
    const workflowData = JSON.parse(content) as WorkflowData;
    
    // Add new execution record
    workflowData.executionHistory.push(executionRecord);
    
    // Save updated workflow
    await this.app.vault.write(path, JSON.stringify(workflowData, null, 2));
  }
  
  // New method to get execution history
  async getExecutionHistory(workflowId: string): Promise<ExecutionRecord[]> {
    const path = `${this.workflowsFolder}/${workflowId}.json`;
    const file = this.app.vault.getAbstractFileByPath(path);
    
    if (!(file instanceof TFile)) {
      return [];
    }
    
    const content = await this.app.vault.read(file);
    const workflowData = JSON.parse(content) as WorkflowData;
    
    return workflowData.executionHistory || [];
  }
}