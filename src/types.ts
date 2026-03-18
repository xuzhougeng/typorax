import type { Extension } from "@codemirror/state";
import type { Processor } from "unified";

/** 所见即所得：主区仅显示渲染结果；源代码：主区仅显示 Markdown 原文，可编辑 */
export type ViewMode = "edit" | "source";

export interface DocumentSession {
  path: string | null;
  title: string;
  content: string;
  dirty: boolean;
  updatedAt: number;
}

export interface OpenDocumentResult {
  path: string;
  name: string;
  content: string;
}

export interface SaveDocumentResult {
  path: string;
  name: string;
}

export interface EditorSettings {
  viewMode: ViewMode;
  labOpen: boolean;
  customCss: string;
}

export interface MarkdownPlugin {
  name: string;
  styles?: string;
  editorExtensions?: () => Extension[];
  extendProcessor?: (processor: Processor<any, any, any, any, any>) => void;
}

export interface RenderedDocument {
  html: string;
  styles: string[];
}
