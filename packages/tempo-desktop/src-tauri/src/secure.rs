const SERVICE: &str = "tempo.app";
const TOKEN_KEY: &str = "token";

pub fn store_token(token: &str) -> Result<(), keyring::Error> {
    let entry = keyring::Entry::new(SERVICE, TOKEN_KEY)?;
    entry.set_password(token)
}

#[tauri::command]
pub fn get_token() -> Result<String, String> {
    let entry = keyring::Entry::new(SERVICE, TOKEN_KEY).map_err(|e| e.to_string())?;
    entry.get_password().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn clear_credentials() -> Result<(), String> {
    let entry = keyring::Entry::new(SERVICE, TOKEN_KEY).map_err(|e| e.to_string())?;
    entry.delete_password().map_err(|e| e.to_string())
}
