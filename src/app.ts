import { invoke } from "@tauri-apps/api/core";

import { MarkdownEditor } from "./editor/markdown-editor";
import { createDefaultMarkdownEngine } from "./markdown/engine";
import { loadSettings, saveSettings } from "./services/settings";
import type {
  DocumentSession,
  EditorLayout,
  EditorSettings,
  OpenDocumentResult,
  SaveDocumentResult
} from "./types";

const starterDocument = `# Typorax

一个偏向 Typora 工作流的 Markdown 编辑器骨架。

## 已接通的能力

- 本地文件打开 / 保存
- Markdown 实时渲染
- GFM 表格、任务列表、删除线
- 自定义指令语法示例
- 自定义 CSS 主题注入

## 自定义语法示例

:::note{title="自定义块"}
这一段来自 remark 指令扩展，可以继续演化成你的业务语法。
:::

## 接下来可扩展的方向

1. 图片拖拽与粘贴
2. 数学公式与 Mermaid
3. 导出 HTML / PDF
4. 命令面板与插件系统
`;

const saveHintDurationMs = 2400;

export class TyporaxApp {
  private readonly root: HTMLElement;
  private readonly shell: HTMLElement;
  private readonly titleEl: HTMLElement;
  private readonly pathEl: HTMLElement;
  private readonly statusEl: HTMLElement;
  private readonly syntaxEl: HTMLElement;
  private readonly toastEl: HTMLElement;
  private readonly previewRoot: HTMLElement;
  private readonly previewStylesEl: HTMLStyleElement;
  private readonly cssInputEl: HTMLTextAreaElement;
  private readonly editor: MarkdownEditor;
  private readonly markdownEngine = createDefaultMarkdownEngine();

  private settings: EditorSettings;
  private session: DocumentSession;
  private isApplyingExternalDocument = false;
  private renderFrameId: number | null = null;
  private toastTimerId: number | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    this.settings = loadSettings();
    this.session = this.createEmptySession();

    this.root.innerHTML = this.renderShell();

    this.shell = this.queryRequired("[data-slot='shell']");
    this.titleEl = this.queryRequired("[data-slot='title']");
    this.pathEl = this.queryRequired("[data-slot='path']");
    this.statusEl = this.queryRequired("[data-slot='status']");
    this.syntaxEl = this.queryRequired("[data-slot='syntax']");
    this.toastEl = this.queryRequired("[data-slot='toast']");
    this.previewRoot = this.queryRequired("[data-slot='preview']");
    this.previewStylesEl = this.queryRequired("[data-slot='preview-styles']");
    this.cssInputEl = this.queryRequired("[data-slot='custom-css']");

    const editorHost = this.queryRequired("[data-slot='editor']");

    this.editor = new MarkdownEditor({
      parent: editorHost,
      doc: this.session.content,
      extensions: this.markdownEngine.getEditorExtensions(),
      onChange: (content) => {
        if (this.isApplyingExternalDocument) {
          return;
        }

        this.session.content = content;
        this.session.updatedAt = Date.now();
        this.session.dirty = true;
        this.refreshHeader();
        this.refreshStatus();
        this.schedulePreviewRender();
      }
    });

    this.cssInputEl.value = this.settings.customCss;

    this.bindEvents();
    this.applyLayout(this.settings.layout);
    this.refreshHeader();
    this.refreshStatus();
    this.refreshSyntaxSummary();
    this.renderPreview();
    this.editor.focus();
  }

  private bindEvents(): void {
    this.root.querySelectorAll<HTMLElement>("[data-action]").forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.action;

        if (action === "new") {
          void this.newDocument();
        }

        if (action === "open") {
          void this.openDocument();
        }

        if (action === "save") {
          void this.saveDocument(false);
        }

        if (action === "save-as") {
          void this.saveDocument(true);
        }
      });
    });

    this.root.querySelectorAll<HTMLElement>("[data-layout-value]").forEach((button) => {
      button.addEventListener("click", () => {
        const layout = button.dataset.layoutValue as EditorLayout;
        this.applyLayout(layout);
      });
    });

    this.cssInputEl.addEventListener("input", () => {
      this.settings.customCss = this.cssInputEl.value;
      saveSettings(this.settings);
      this.schedulePreviewRender();
    });

    window.addEventListener("keydown", (event) => {
      const mod = this.isMacLike() ? event.metaKey : event.ctrlKey;

      if (!mod) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === "o") {
        event.preventDefault();
        void this.openDocument();
      }

      if (key === "n") {
        event.preventDefault();
        void this.newDocument();
      }

      if (key === "s") {
        event.preventDefault();
        void this.saveDocument(event.shiftKey);
      }
    });

    window.addEventListener("beforeunload", (event) => {
      if (!this.session.dirty) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    });
  }

  private renderShell(): string {
    return `
      <div class="shell" data-slot="shell" data-layout="split">
        <header class="toolbar">
          <div class="brand">
            <div class="brand-mark">T</div>
            <div>
              <div class="brand-name">Typorax</div>
              <div class="brand-caption">Markdown Workbench</div>
            </div>
          </div>

          <div class="document-meta">
            <div class="document-title" data-slot="title"></div>
            <div class="document-path" data-slot="path"></div>
          </div>

          <div class="toolbar-actions">
            <button class="toolbar-button" data-action="new">New</button>
            <button class="toolbar-button" data-action="open">Open</button>
            <button class="toolbar-button toolbar-button-accent" data-action="save">Save</button>
            <button class="toolbar-button" data-action="save-as">Save As</button>
          </div>
        </header>

        <main class="workspace">
          <section class="pane editor-pane">
            <div class="pane-header">
              <span>Source</span>
              <span class="pane-kicker">CodeMirror 6</span>
            </div>
            <div class="editor-host" data-slot="editor"></div>
          </section>

          <section class="pane preview-pane">
            <div class="pane-header">
              <span>Preview</span>
              <span class="pane-kicker">remark / rehype</span>
            </div>
            <style data-slot="preview-styles"></style>
            <article class="markdown-preview" data-slot="preview"></article>
          </section>

          <aside class="pane lab-pane">
            <div class="pane-header">
              <span>Render Lab</span>
              <span class="pane-kicker">CSS + Syntax</span>
            </div>

            <div class="lab-body">
              <label class="field-label" for="custom-css">Custom CSS</label>
              <textarea
                id="custom-css"
                class="css-editor"
                data-slot="custom-css"
                spellcheck="false"
              ></textarea>

              <div class="syntax-card">
                <div class="syntax-card-title">Custom directive sample</div>
                <pre><code>:::warning{title="Attention"}
Custom syntax block.
:::</code></pre>
                <p class="syntax-card-copy" data-slot="syntax"></p>
              </div>

              <div class="layout-card">
                <div class="field-label">Layout</div>
                <div class="layout-toggle">
                  <button class="layout-button" data-layout-value="editor">Editor</button>
                  <button class="layout-button" data-layout-value="split">Split</button>
                  <button class="layout-button" data-layout-value="preview">Preview</button>
                </div>
              </div>
            </div>
          </aside>
        </main>

        <footer class="statusbar">
          <div class="status-copy" data-slot="status"></div>
          <div class="toast" data-slot="toast"></div>
        </footer>
      </div>
    `;
  }

  private createEmptySession(): DocumentSession {
    return {
      path: null,
      title: "untitled.md",
      content: starterDocument,
      dirty: false,
      updatedAt: Date.now()
    };
  }

  private refreshHeader(): void {
    const dirtyPrefix = this.session.dirty ? "• " : "";
    this.titleEl.textContent = `${dirtyPrefix}${this.session.title}`;
    this.pathEl.textContent = this.session.path ?? "Tauri desktop runtime will enable native file dialogs.";
    document.title = `${this.session.dirty ? "• " : ""}${this.session.title} · Typorax`;
  }

  private refreshStatus(): void {
    const content = this.session.content;
    const lines = content.length === 0 ? 0 : content.split(/\r?\n/u).length;
    const words = content.trim().length === 0 ? 0 : content.trim().split(/\s+/u).length;
    const chars = [...content].length;

    this.statusEl.textContent = `${lines} lines · ${words} words · ${chars} chars`;
  }

  private refreshSyntaxSummary(): void {
    const names = this.markdownEngine.getPluginNames();
    this.syntaxEl.textContent = `Extensions: ${names.join(", ")}`;
  }

  private schedulePreviewRender(): void {
    if (this.renderFrameId !== null) {
      window.cancelAnimationFrame(this.renderFrameId);
    }

    this.renderFrameId = window.requestAnimationFrame(() => {
      this.renderFrameId = null;
      this.renderPreview();
    });
  }

  private renderPreview(): void {
    const rendered = this.markdownEngine.render(this.session.content);
    const html = rendered.html.trim();

    this.previewStylesEl.textContent = [...rendered.styles, this.settings.customCss].join("\n\n");
    this.previewRoot.innerHTML =
      html.length > 0 ? html : '<p class="empty-state">Nothing to preview yet.</p>';
  }

  private applyLayout(layout: EditorLayout): void {
    this.settings.layout = layout;
    saveSettings(this.settings);

    this.shell.dataset.layout = layout;
    this.root.querySelectorAll<HTMLElement>("[data-layout-value]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.layoutValue === layout);
    });
  }

  private async newDocument(): Promise<void> {
    if (!this.confirmDiscard()) {
      return;
    }

    this.session = this.createEmptySession();
    this.applyDocumentToEditor(this.session.content);
    this.refreshHeader();
    this.refreshStatus();
    this.renderPreview();
    this.editor.focus();
    this.notify("Started a fresh document.");
  }

  private async openDocument(): Promise<void> {
    if (!this.isTauriRuntime()) {
      this.notify("Open is available inside the Tauri desktop runtime.", true);
      return;
    }

    if (!this.confirmDiscard()) {
      return;
    }

    try {
      const result = await invoke<OpenDocumentResult | null>("open_document");

      if (!result) {
        return;
      }

      this.session = {
        path: result.path,
        title: result.name,
        content: result.content,
        dirty: false,
        updatedAt: Date.now()
      };
      this.applyDocumentToEditor(result.content);
      this.refreshHeader();
      this.refreshStatus();
      this.renderPreview();
      this.editor.focus();
      this.notify(`Opened ${result.name}`);
    } catch (error) {
      this.notify(this.stringifyError(error), true);
    }
  }

  private async saveDocument(forceSaveAs: boolean): Promise<void> {
    if (!this.isTauriRuntime()) {
      this.notify("Save is available inside the Tauri desktop runtime.", true);
      return;
    }

    try {
      let result: SaveDocumentResult | null;

      if (forceSaveAs || !this.session.path) {
        result = await invoke<SaveDocumentResult | null>("save_document_as", {
          content: this.session.content,
          suggestedName: this.session.title
        });

        if (!result) {
          return;
        }
      } else {
        result = await invoke<SaveDocumentResult>("save_document", {
          path: this.session.path,
          content: this.session.content
        });
      }

      this.session.path = result.path;
      this.session.title = result.name;
      this.session.dirty = false;
      this.session.updatedAt = Date.now();
      this.refreshHeader();
      this.refreshStatus();
      this.notify(`Saved ${result.name}`);
    } catch (error) {
      this.notify(this.stringifyError(error), true);
    }
  }

  private notify(message: string, isError = false): void {
    if (this.toastTimerId !== null) {
      window.clearTimeout(this.toastTimerId);
    }

    this.toastEl.textContent = message;
    this.toastEl.dataset.tone = isError ? "error" : "info";
    this.toastEl.classList.add("is-visible");

    this.toastTimerId = window.setTimeout(() => {
      this.toastEl.classList.remove("is-visible");
      this.toastTimerId = null;
    }, saveHintDurationMs);
  }

  private confirmDiscard(): boolean {
    if (!this.session.dirty) {
      return true;
    }

    return window.confirm("Current document has unsaved changes. Discard them?");
  }

  private isTauriRuntime(): boolean {
    return typeof window.__TAURI_INTERNALS__ !== "undefined";
  }

  private isMacLike(): boolean {
    return /Mac|iPhone|iPad|iPod/u.test(navigator.platform);
  }

  private stringifyError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === "string") {
      return error;
    }

    return "Unexpected error";
  }

  private applyDocumentToEditor(content: string): void {
    this.isApplyingExternalDocument = true;

    try {
      this.editor.setValue(content);
    } finally {
      this.isApplyingExternalDocument = false;
    }
  }

  private queryRequired<T extends HTMLElement>(selector: string): T {
    const element = this.root.querySelector<T>(selector);

    if (!element) {
      throw new Error(`Missing element: ${selector}`);
    }

    return element;
  }
}
