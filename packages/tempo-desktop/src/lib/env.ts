import { invoke } from "@tauri-apps/api/core";

export async function getToken(): Promise<string> {
  try {
    return await invoke<string>("get_token");
  } catch {
    return "";
  }
}

export async function clearCredentials(): Promise<void> {
  await invoke("clear_credentials");
}

export async function restartSync(): Promise<void> {
  await invoke("restart_sync");
}
