import type { Extension } from "@codemirror/state";
import type { Processor } from "unified";

export type EditorLayout = "split" | "editor" | "preview";

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
  layout: EditorLayout;
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
