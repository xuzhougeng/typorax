import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { visit } from "unist-util-visit";

import type { MarkdownPlugin, RenderedDocument } from "../types";

const previewBaseStyles = `
.markdown-preview {
  color: #14212b;
  font-family: "Iowan Old Style", "Palatino Linotype", "Source Han Serif SC", serif;
  font-size: 18px;
  line-height: 1.8;
}

.markdown-preview > :first-child {
  margin-top: 0;
}

.markdown-preview h1,
.markdown-preview h2,
.markdown-preview h3,
.markdown-preview h4 {
  margin: 1.8em 0 0.65em;
  color: #12202a;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.markdown-preview h1 {
  font-size: 2.3rem;
}

.markdown-preview h2 {
  padding-bottom: 0.25rem;
  border-bottom: 1px solid rgba(18, 32, 42, 0.08);
  font-size: 1.7rem;
}

.markdown-preview p,
.markdown-preview ul,
.markdown-preview ol,
.markdown-preview blockquote,
.markdown-preview table,
.markdown-preview pre {
  margin: 0 0 1rem;
}

.markdown-preview a {
  color: #8d5a2b;
  text-decoration-thickness: 1.5px;
  text-underline-offset: 0.2em;
}

.markdown-preview code {
  padding: 0.15rem 0.35rem;
  border-radius: 0.4rem;
  background: rgba(20, 33, 43, 0.08);
  font-family:
    "SF Mono", "JetBrains Mono", "Cascadia Code", "Noto Sans Mono", monospace;
  font-size: 0.9em;
}

.markdown-preview pre {
  overflow: auto;
  padding: 1rem 1.1rem;
  border-radius: 1rem;
  background: #17242d;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.markdown-preview pre code {
  padding: 0;
  color: #edf2f7;
  background: transparent;
}

.markdown-preview blockquote {
  padding: 0.1rem 0 0.1rem 1rem;
  border-left: 4px solid rgba(141, 90, 43, 0.35);
  color: #475467;
}

.markdown-preview table {
  width: 100%;
  border-collapse: collapse;
  overflow: hidden;
  border-radius: 0.9rem;
  border: 1px solid rgba(18, 32, 42, 0.08);
}

.markdown-preview th,
.markdown-preview td {
  padding: 0.7rem 0.8rem;
  border-bottom: 1px solid rgba(18, 32, 42, 0.08);
  text-align: left;
}

.markdown-preview th {
  background: rgba(18, 32, 42, 0.05);
  font-family:
    "SF Pro Display", "Avenir Next", "Segoe UI Variable", "Noto Sans", sans-serif;
  font-size: 0.82rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.markdown-preview img {
  display: block;
  max-width: 100%;
  border-radius: 1rem;
  box-shadow: 0 18px 40px rgba(20, 33, 43, 0.12);
}

.markdown-preview hr {
  margin: 2rem 0;
  border: 0;
  border-top: 1px solid rgba(18, 32, 42, 0.1);
}

.markdown-preview .empty-state {
  color: #667085;
  font-style: italic;
}
`;

const calloutStyles = `
.markdown-preview .callout {
  position: relative;
  margin: 1.4rem 0;
  padding: 1rem 1rem 1rem 1.2rem;
  border: 1px solid rgba(20, 33, 43, 0.08);
  border-left-width: 6px;
  border-radius: 1rem;
  background: rgba(251, 246, 239, 0.88);
}

.markdown-preview .callout::before {
  display: block;
  margin-bottom: 0.5rem;
  color: #12202a;
  font-family:
    "SF Pro Display", "Avenir Next", "Segoe UI Variable", "Noto Sans", sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  content: attr(data-title);
}

.markdown-preview .callout > :last-child {
  margin-bottom: 0;
}

.markdown-preview .callout-note,
.markdown-preview .callout-info {
  border-left-color: rgba(39, 108, 167, 0.7);
}

.markdown-preview .callout-tip {
  border-left-color: rgba(59, 121, 74, 0.72);
}

.markdown-preview .callout-warning {
  border-left-color: rgba(176, 84, 27, 0.75);
}

.markdown-preview .callout-danger {
  border-left-color: rgba(170, 43, 43, 0.75);
}
`;

const previewSchema: any = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    div: [
      ...(defaultSchema.attributes?.div ?? []),
      ["className", /^callout(?:-[a-z]+)?$/u],
      ["data-callout", /^(note|info|tip|warning|danger)$/u],
      ["data-title", /^.*$/u]
    ],
    span: [
      ...(defaultSchema.attributes?.span ?? []),
      ["className", /^callout(?:-[a-z]+)?$/u],
      ["data-callout", /^(note|info|tip|warning|danger)$/u],
      ["data-title", /^.*$/u]
    ]
  }
};

function labelForDirective(name: string): string {
  return {
    note: "Note",
    info: "Info",
    tip: "Tip",
    warning: "Warning",
    danger: "Danger"
  }[name] ?? "Callout";
}

function calloutDirectiveRemarkPlugin() {
  return (tree: unknown) => {
    visit(tree, (node: any) => {
      const directiveTypes = new Set(["containerDirective", "leafDirective", "textDirective"]);

      if (!directiveTypes.has(node.type)) {
        return;
      }

      const name = typeof node.name === "string" ? node.name.toLowerCase() : "";
      const supported = new Set(["note", "info", "tip", "warning", "danger"]);

      if (!supported.has(name)) {
        return;
      }

      const attributes = node.attributes ?? {};
      const tagName = node.type === "textDirective" ? "span" : "div";

      node.data ||= {};
      node.data.hName = tagName;
      node.data.hProperties = {
        ...(node.data.hProperties ?? {}),
        className: ["callout", `callout-${name}`],
        "data-callout": name,
        "data-title": String(attributes.title ?? labelForDirective(name))
      };
    });
  };
}

const calloutPlugin: MarkdownPlugin = {
  name: "callout-directives",
  styles: calloutStyles,
  extendProcessor: (processor) => {
    processor.use(calloutDirectiveRemarkPlugin as any);
  }
};

export class MarkdownEngine {
  private readonly plugins: MarkdownPlugin[];

  constructor(plugins: MarkdownPlugin[] = []) {
    this.plugins = plugins;
  }

  getPluginNames(): string[] {
    return this.plugins.map((plugin) => plugin.name);
  }

  getEditorExtensions() {
    return this.plugins.flatMap((plugin) => plugin.editorExtensions?.() ?? []);
  }

  render(source: string): RenderedDocument {
    const processor = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkDirective);

    for (const plugin of this.plugins) {
      plugin.extendProcessor?.(processor);
    }

    const html = String(
      processor
        .use(remarkRehype, {
          allowDangerousHtml: true
        })
        .use(rehypeRaw)
        .use(rehypeSanitize, previewSchema)
        .use(rehypeStringify, {
          allowDangerousHtml: false
        })
        .processSync(source)
    );

    return {
      html,
      styles: [previewBaseStyles, ...this.plugins.flatMap((plugin) => plugin.styles ?? [])]
    };
  }
}

export function createDefaultMarkdownEngine(): MarkdownEngine {
  return new MarkdownEngine([calloutPlugin]);
}
