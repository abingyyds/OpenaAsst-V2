use std::process::Stdio;
use tauri::{AppHandle, Manager};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::net::TcpStream;
use tokio::process::Command;
use tokio::time::{sleep, Duration};

pub async fn start_api_server(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let resource_dir = app
        .path()
        .resource_dir()
        .unwrap_or_else(|_| std::path::PathBuf::from("."));

    let api_entry = resource_dir.join("api-server").join("index.js");

    // In development, the API server is started separately
    if cfg!(debug_assertions) {
        println!("Development mode: API server should be started separately with `pnpm dev:api`");
        return Ok(());
    }

    println!("Starting API server from: {:?}", api_entry);

    let mut child = Command::new("node")
        .arg(&api_entry)
        .env("NODE_ENV", "production")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()?;

    if let Some(stdout) = child.stdout.take() {
        tauri::async_runtime::spawn(async move {
            let reader = BufReader::new(stdout);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                println!("[API] {}", line);
            }
        });
    }

    if let Some(stderr) = child.stderr.take() {
        tauri::async_runtime::spawn(async move {
            let reader = BufReader::new(stderr);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                eprintln!("[API ERR] {}", line);
            }
        });
    }

    // Wait for server to be ready via TCP connect
    for _ in 0..30 {
        sleep(Duration::from_millis(500)).await;
        if TcpStream::connect("127.0.0.1:2620").await.is_ok() {
            println!("API server is ready on port 2620");
            return Ok(());
        }
    }

    println!("API server started (health check timed out, continuing anyway)");
    Ok(())
}
