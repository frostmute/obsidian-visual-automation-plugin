import { TFile, TFolder, Notice, App } from "obsidian";
import { CanvasNodeEx, NodeConfig, WorkflowConnection } from "../canvas/CanvasNode";

export interface WorkflowData {
  id: string;
  name: string;
  nodes: NodeConfig[];
  connections: WorkflowConnection[];
  createdAt: string;
}

export class WorkflowStorage {
  private app: App;
  private workflowsFolder: string;

  constructor(app: App, workflowsFolder = "workflows") {
    this.app = app;
    this.workflowsFolder = workflowsFolder;
  }

  async ensureFolderExists() {
    const folder = this.app.vault.getFolderMetadata(this.workflowsFolder);
    if (!folder) {
      await this.app.vault.createFolder(this.workflowsFolder);
    }
  }

  async saveWorkflow(workflow: WorkflowData): Promise<TFile> {
    await this.ensureFolderExists();
    const path = `${this.workflowsFolder}/${workflow.id}.json`;
    await this.app.vault.write(path, JSON.stringify(workflow, null, 2));
    return this.app.vault.getAbstractFileByPath(path) as TFile;
  }

  async loadWorkflow(id: string): Promise<WorkflowData | null> {
    const path = `${this.workflowsFolder}/${id}.json`;
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) return null;
    const content = await this.app.vault.read(file);
    return JSON.parse(content) as WorkflowData;
  }

  async listWorkflows(): Promise<WorkflowData[]> {
    const folder = this.app.vault.getFolderMetadata(this.workflowsFolder);
    if (!folder) return [];
    const files = this.app.vault.getFiles()
      .filter(f => f.path.startsWith(this.workflowsFolder + "/") && f.extension === "json");
    const workflows: WorkflowData[] = [];
    for (const file of files) {
      const content = await this.app.vault.read(file);
      workflows.push(JSON.parse(content) as WorkflowData);
    }
    return workflows;
  }

  async deleteWorkflow(id: string): Promise<void> {
    const path = `${this.workflowsFolder}/${id}.json`;
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) {
      await this.app.vault.delete(file);
    }
  }

  async exportWorkflow(workflow: WorkflowData): Promise<void> {
    await this.saveWorkflow(workflow);
    new Notice(`Workflow exported: ${workflow.name}`);
  }

  async importWorkflow(id: string): Promise<WorkflowData | null> {
    const workflow = await this.loadWorkflow(id);
    if (workflow) {
      new Notice(`Workflow imported: ${workflow.name}`);
    }
    return workflow;
  }
}