use serde::{Serialize, Serializer};
use std::{
  fs,
  path::{Path, PathBuf},
};
use tauri::Manager;
use thiserror::Error;

#[derive(Debug, Error)]
enum AppError {
  #[error("Document path is empty.")]
  EmptyPath,
  #[error(transparent)]
  Io(#[from] std::io::Error),
}

impl Serialize for AppError {
  fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
  where
    S: Serializer,
  {
    serializer.serialize_str(&self.to_string())
  }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct OpenDocumentPayload {
  path: String,
  name: String,
  content: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SaveDocumentPayload {
  path: String,
  name: String,
}

fn file_name_from_path(path: &Path) -> String {
  path
    .file_name()
    .and_then(|value| value.to_str())
    .unwrap_or("untitled.md")
    .to_string()
}

fn parse_document_path(path: String) -> Result<PathBuf, AppError> {
  let trimmed = path.trim();

  if trimmed.is_empty() {
    return Err(AppError::EmptyPath);
  }

  Ok(PathBuf::from(trimmed))
}

#[tauri::command]
fn open_document() -> Result<Option<OpenDocumentPayload>, AppError> {
  let Some(path) = rfd::FileDialog::new()
    .add_filter("Markdown", &["md", "markdown", "mdx", "txt"])
    .pick_file()
  else {
    return Ok(None);
  };

  let content = fs::read_to_string(&path)?;

  Ok(Some(OpenDocumentPayload {
    path: path.to_string_lossy().into_owned(),
    name: file_name_from_path(&path),
    content,
  }))
}

#[tauri::command]
fn save_document(path: String, content: String) -> Result<SaveDocumentPayload, AppError> {
  let path = parse_document_path(path)?;
  fs::write(&path, content)?;

  Ok(SaveDocumentPayload {
    path: path.to_string_lossy().into_owned(),
    name: file_name_from_path(&path),
  })
}

#[tauri::command]
fn save_document_as(
  content: String,
  suggested_name: Option<String>,
) -> Result<Option<SaveDocumentPayload>, AppError> {
  let default_name = suggested_name
    .as_deref()
    .map(str::trim)
    .filter(|value| !value.is_empty())
    .unwrap_or("untitled.md");

  let Some(path) = rfd::FileDialog::new()
    .add_filter("Markdown", &["md", "markdown"])
    .set_file_name(default_name)
    .save_file()
  else {
    return Ok(None);
  };

  fs::write(&path, content)?;

  Ok(Some(SaveDocumentPayload {
    path: path.to_string_lossy().into_owned(),
    name: file_name_from_path(&path),
  }))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_title("Typorax");
      }

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      open_document,
      save_document,
      save_document_as
    ])
    .run(tauri::generate_context!())
    .expect("error while running Typorax");
}

