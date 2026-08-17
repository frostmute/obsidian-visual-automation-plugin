import { CanvasNode, CanvasLinkNode, TAbstractView } from "obsidian";
import { CanvasNodeEx } from "../canvas/CanvasNode";

export class NodeRenderer {
  private nodeTypeStyles: Record<string, CSSStyleDeclaration> = {};

  styleNodeType(nodeType: string, styles: { bg: string; border: string; accent: string }) {
    const key = `node-${nodeType}`;
    const style = document.createElement("style");
    style.textContent = `
      .${key} {
        background: ${styles.bg};
        border: 2px solid ${styles.border};
        border-radius: 8px;
        cursor: pointer;
      }
      .${key} .node-title {
        color: ${styles.accent};
        font-weight: bold;
      }
    `;
    document.head.appendChild(style);
    this.nodeTypeStyles[nodeType] = styles as unknown as CSSStyleDeclaration;
  }

  renderNode(node: CanvasNodeEx, container: HTMLElement) {
    const type = node.config.type;
    const styles = this.getNodeStyles(type);

    container.addClass(`node-${type}`);
    container.style.width = "140px";
    container.style.height = "70px";
    container.style.padding = "6px";

    const title = container.createDiv({ cls: "node-title" });
    title.textContent = node.config.name;

    const icon = container.createDiv();
    icon.style.fontSize = "16px";
    icon.style.marginRight = "4px";
    icon.textContent = this.getNodeIcon(type);

    container.querySelector(".node-title")?.prepend(icon);

    container.style.cursor = "move";
    container.onclick = (e) => {
      e.stopPropagation();
      this.selectNode(node);
    };

    return container;
  }

  private getNodeStyles(type: string): { bg: string; border: string; accent: string } {
    const styles: Record<string, { bg: string; border: string; accent: string }> = {
      trigger: { bg: "#e3f2fd", border: "#1976d2", accent: "#0d47a1" },
      condition: { bg: "#e8f5e9", border: "#388e3c", accent: "#1b5e20" },
      action: { bg: "#fff3e0", border: "#f57c00", accent: "#e65100" }
    };
    return styles[type] ?? styles.trigger;
  }

  private getNodeIcon(type: string): string {
    const icons: Record<string, string> = {
      trigger: "⚡",
      condition: "❓",
      action: "⚙️"
    };
    return icons[type] ?? "📦";
  }

  private selectedNode: CanvasNodeEx | null = null;
  private onSelectCallback?: (node: CanvasNodeEx | null) => void;

  onSelect(callback: (node: CanvasNodeEx | null) => void) {
    this.onSelectCallback = callback;
  }

  private selectNode(node: CanvasNodeEx) {
    this.selectedNode = node;
    this.onSelectCallback?.(node);
  }

  getSelectedNode(): CanvasNodeEx | null {
    return this.selectedNode;
  }

  clearSelection() {
    this.selectedNode = null;
  }
}