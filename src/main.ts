import { Plugin, Notice } from "obsidian";
import { CanvasManager } from "./canvas";

interface PluginSettings {
  enableMCP: boolean;
  autoSaveWorkflows: boolean;
}

const DEFAULT_SETTINGS: PluginSettings = {
  enableMCP: true,
  autoSaveWorkflows: true
};

export default class VisualAutomationPlugin extends Plugin {
  settings: PluginSettings;
  canvasManager: CanvasManager;

  async onload() {
    await this.loadSettings();
    this.canvasManager = new CanvasManager(this.app);

    this.addCommand({
      id: "create-automation",
      name: "Create New Automation",
      callback: () => {
        new Notice("Automation editor opened");
      }
    });

    this.addCommand({
      id: "add-trigger-node",
      name: "Add Trigger Node",
      callback: () => {
        const pos = this.app.workspace.getActiveViewComponent()?.canvas?.getCenter() ?? { x: 0, y: 0 };
        const node = this.canvasManager.createNode("trigger", "New Trigger", pos);
        if (node) new Notice("Trigger node created");
      }
    });

    console.log("Visual Automation plugin loaded");
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}