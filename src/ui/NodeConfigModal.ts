import { Modal, Notice, App, Setting } from "obsidian";
import { CanvasNodeEx } from "../canvas/CanvasNode";
import { WorkflowStorage } from "../storage";

export class NodeConfigModal extends Modal {
  node: CanvasNodeEx;
  storage: WorkflowStorage;
  constructor(app: App, node: CanvasNodeEx, storage: WorkflowStorage) {
    super(app);
    this.node = node;
    this.storage = storage;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "Edit Node" });

    // Name field
    new Setting(contentEl)
      .setName("Name")
      .setDesc("Node display name")
      .addText(text => {
        text.setValue(this.node.config.name);
        text.onChange(v => {
          this.node.config.name = v;
        });
      });

    // Properties editor - key/value pairs
    const props = this.node.config.properties || {};
    Object.keys(props).forEach(key => {
      new Setting(contentEl)
        .setName(key)
        .addText(text => {
          text.setValue(String(props[key]));
          text.onChange(v => {
            props[key] = v;
          });
        });
    });

    new Setting(contentEl)
      .addButton(btn => {
        btn.setButtonText("Save");
        btn.onClick(() => {
          // Save node configuration
          this.node.config.properties = props;
          new Notice("Node configuration saved");
          this.close();
        });
      })
      .addButton(btn => {
        btn.setButtonText("Cancel");
        btn.onClick(() => this.close());
      });
  }
}