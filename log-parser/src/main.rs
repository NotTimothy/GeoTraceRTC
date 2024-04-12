use axum::{
    extract::Json,
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Serialize, Deserialize)]
struct WebRTCData {
    ip: Vec<String>,
    address: Vec<String>,
    port: Vec<String>,
    network_type: Vec<String>,
    protocol: Vec<String>,
    candidate_type: Vec<String>,
}

async fn parse_json(json_data: Json<Value>) -> Result<WebRTCData, String> {
    let peer_connections = json_data["PeerConnections"].as_object().ok_or("Invalid JSON structure")?;
    let stats = peer_connections
        .iter()
        .find_map(|(key, value)| {
            if value["stats"].is_object() {
                Some(value["stats"].as_object().unwrap())
            } else {
                None
            }
        })
        .ok_or("Stats object not found")?;

    let mut ip = Vec::new();
    let mut address = Vec::new();
    let mut port = Vec::new();
    let mut network_type = Vec::new();
    let mut protocol = Vec::new();
    let mut candidate_type = Vec::new();

    for (key, value) in stats {
        if key.ends_with("-ip") || key.ends_with("-address") || key.ends_with("-port") || key.ends_with("-networkType") || key.ends_with("-protocol") || key.ends_with("-candidateType") {
            if let Some(values) = value["values"].as_str() {
                let cleaned_values: Vec<String> = values
                    .replace(r#"\\\"#, "")
                    .replace(r#"\\"#, "")
                    .replace(r#"]"#, "")
                    .replace(r#"\"#, "")
                    .replace(r#"""#, "")
                    .replace(r#"["#, "")
                    .split(',')
                    .map(|v| v.trim().to_string())
                    .collect();

                if key.ends_with("-ip") {
                    ip.extend(cleaned_values);
                } else if key.ends_with("-address") {
                    address.extend(cleaned_values);
                } else if key.ends_with("-port") {
                    port.extend(cleaned_values);
                } else if key.ends_with("-networkType") {
                    network_type.extend(cleaned_values);
                } else if key.ends_with("-protocol") {
                    protocol.extend(cleaned_values);
                } else if key.ends_with("-candidateType") {
                    candidate_type.extend(cleaned_values);
                }
            }
        }
    }

    println!("{:#?}", ip);

    Ok(WebRTCData {
        ip,
        address,
        port,
        network_type,
        protocol,
        candidate_type,
    })
}

async fn process_json(json_data: Json<Value>) -> impl IntoResponse {
    match parse_json(json_data).await {
        Ok(webrtc_data) => (StatusCode::OK, Json(webrtc_data)),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(WebRTCData {
                ip: vec![],
                address: vec![],
                port: vec![],
                network_type: vec![],
                protocol: vec![],
                candidate_type: vec![],
            }),
        ),
    }
}

#[tokio::main]
async fn main() {
    let app = Router::new().route("/api/process-file", post(process_json));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:8080")
        .await
        .unwrap();
    tracing::debug!("listening on {}", listener.local_addr().unwrap());
    axum::serve(listener, app).await.unwrap();
}