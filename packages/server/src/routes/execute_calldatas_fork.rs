use crate::gas::{execute_calldatas_fork, ExecutionResult, ForkCall, ForkConfig};
use alloy_primitives::Address;
use alloy_primitives::Bytes;
use rocket::{post, response::status, serde::json::Json};
use serde::Deserialize;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecuteCalldatasRequest {
    pub bytecode: Bytes,
    pub address: Address,
    pub calls: Vec<ForkCall>,
    pub fork_config: Option<ForkConfig>,
    pub trace_mode: Option<String>, // Options: "call", "jump", "jumpSimple", "debug", "none"
}

#[post("/execute_calldatas_fork", format = "json", data = "<req>")]
pub async fn execute_calldatas_fork_route(
    req: Json<ExecuteCalldatasRequest>,
) -> Result<Json<Vec<ExecutionResult>>, status::BadRequest<Option<String>>> {
    println!("Received request with fork_config: {:?}", req.fork_config);
    println!("Trace mode: {:?}", req.trace_mode);

    // Create execution options with the specified trace mode
    let options = req
        .trace_mode
        .as_ref()
        .map(|trace_mode| crate::gas::ExecutionOptions {
            trace_mode: Some(trace_mode.clone()),
        });

    let result = execute_calldatas_fork(
        req.bytecode.clone(),
        req.address,
        req.calls.clone(),
        req.fork_config.clone(),
        options,
    )
    .await
    .map_err(|err| status::BadRequest(Some(err.to_string())))?;

    Ok(Json(result))
}
