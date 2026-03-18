import type { EditorSettings } from "../types";

const STORAGE_KEY = "typorax.settings.v3";

const defaultSettings: EditorSettings = {
  viewMode: "edit",
  labOpen: true,
  customCss: [
    "/* Write selectors against .markdown-preview */",
    ".markdown-preview .callout-warning {",
    "  border-color: rgba(176, 84, 27, 0.35);",
    "}"
  ].join("\n")
};

export function loadSettings(): EditorSettings {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return defaultSettings;
  }

  try {
    return {
      ...defaultSettings,
      ...JSON.parse(raw)
    };
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: EditorSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

