import { Compartment, EditorState, type Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { markdown } from "@codemirror/lang-markdown";
import { basicSetup } from "codemirror";

interface MarkdownEditorOptions {
  parent: HTMLElement;
  doc: string;
  extensions?: Extension[];
  onChange: (value: string) => void;
}

export class MarkdownEditor {
  private readonly pluginCompartment = new Compartment();
  private readonly view: EditorView;

  constructor(options: MarkdownEditorOptions) {
    this.view = new EditorView({
      parent: options.parent,
      state: EditorState.create({
        doc: options.doc,
        extensions: [
          basicSetup,
          markdown(),
          EditorView.lineWrapping,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              options.onChange(update.state.doc.toString());
            }
          }),
          this.pluginCompartment.of(options.extensions ?? []),
          EditorView.theme({
            "&": {
              height: "100%",
              color: "#14212b",
              backgroundColor: "transparent",
              fontFamily:
                '"SF Mono", "JetBrains Mono", "Cascadia Code", "Noto Sans Mono", monospace',
              fontSize: "14px"
            },
            ".cm-scroller": {
              padding: "1.25rem 1.5rem 6rem"
            },
            ".cm-content": {
              minHeight: "100%"
            },
            ".cm-focused": {
              outline: "none"
            },
            ".cm-activeLine": {
              backgroundColor: "rgba(141, 90, 43, 0.08)"
            },
            ".cm-selectionBackground, ::selection": {
              backgroundColor: "rgba(141, 90, 43, 0.22) !important"
            },
            ".cm-gutters": {
              backgroundColor: "transparent",
              color: "rgba(20, 33, 43, 0.38)",
              border: "none"
            }
          })
        ]
      })
    });
  }

  focus(): void {
    this.view.focus();
  }

  getValue(): string {
    return this.view.state.doc.toString();
  }

  setValue(nextValue: string): void {
    const currentValue = this.getValue();

    if (currentValue === nextValue) {
      return;
    }

    this.view.dispatch({
      changes: {
        from: 0,
        to: currentValue.length,
        insert: nextValue
      }
    });
  }

  reconfigureExtensions(extensions: Extension[]): void {
    this.view.dispatch({
      effects: this.pluginCompartment.reconfigure(extensions)
    });
  }

  destroy(): void {
    this.view.destroy();
  }
}

