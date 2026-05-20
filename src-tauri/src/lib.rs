use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::command;
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;

#[derive(Serialize, Deserialize)]
pub struct FileContent {
    pub path: String,
    pub content: String,
}

#[command]
async fn read_project_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Nie mozna odczytac pliku: {}", e))
}

#[command]
async fn open_project_file_with_dialog(app: tauri::AppHandle) -> Result<Option<FileContent>, String> {
    let documents_dir = app
        .path()
        .document_dir()
        .map_err(|e| format!("Nie mozna odczytac katalogu Dokumenty: {}", e))?;
    let default_dir: PathBuf = documents_dir.join("dinboard").join("projekty");
    fs::create_dir_all(&default_dir)
        .map_err(|e| format!("Nie mozna utworzyc katalogu docelowego: {}", e))?;

    let file_path = app
        .dialog()
        .file()
        .set_title("Otworz projekt DINBoard")
        .set_directory(&default_dir)
        .add_filter("DINBoard Project", &["dinboard"])
        .blocking_pick_file();

    let Some(selected_file) = file_path else {
        return Ok(None);
    };

    let path_buf = selected_file
        .into_path()
        .map_err(|e| format!("Nieprawidlowa sciezka pliku: {}", e))?;
    let content = fs::read_to_string(&path_buf)
        .map_err(|e| format!("Nie mozna odczytac pliku: {}", e))?;

    Ok(Some(FileContent {
        path: path_buf.to_string_lossy().to_string(),
        content,
    }))
}

#[command]
async fn write_project_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| format!("Nie mozna zapisac pliku: {}", e))
}

#[command]
async fn save_project_file_with_dialog(
    app: tauri::AppHandle,
    content: String,
    suggested_file_name: String,
) -> Result<Option<String>, String> {
    let documents_dir = app
        .path()
        .document_dir()
        .map_err(|e| format!("Nie mozna odczytac katalogu Dokumenty: {}", e))?;
    let default_dir: PathBuf = documents_dir.join("dinboard").join("projekty");
    fs::create_dir_all(&default_dir)
        .map_err(|e| format!("Nie mozna utworzyc katalogu docelowego: {}", e))?;

    let file_path = app
        .dialog()
        .file()
        .set_title("Zapisz projekt DINBoard")
        .set_directory(&default_dir)
        .set_file_name(suggested_file_name)
        .add_filter("DINBoard Project", &["dinboard"])
        .blocking_save_file();

    let Some(selected_file) = file_path else {
        return Ok(None);
    };

    let mut path_buf = selected_file
        .into_path()
        .map_err(|e| format!("Nieprawidlowa sciezka zapisu: {}", e))?;
    let has_dinboard_extension = path_buf
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.eq_ignore_ascii_case("dinboard"))
        .unwrap_or(false);
    if !has_dinboard_extension {
        path_buf.set_extension("dinboard");
    }
    fs::write(&path_buf, content).map_err(|e| format!("Nie mozna zapisac pliku: {}", e))?;

    Ok(Some(path_buf.to_string_lossy().to_string()))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            read_project_file,
            write_project_file,
            open_project_file_with_dialog,
            save_project_file_with_dialog,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
