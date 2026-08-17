import { Plugin, Notice } from "obsidian";

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

  async onload() {
    await this.loadSettings();

    this.addCommand({
      id: "create-automation",
      name: "Create New Automation",
      callback: () => {
        new Notice("Automation editor opened");
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