use dotenv::dotenv;
use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::env;

use alloy::providers::{Provider, ProviderBuilder};
use alloy_eips::BlockId;
use alloy_primitives::{Address, Bytes, Log, U256};
use alloy_rpc_types_eth::BlockTransactionsKind;
use forge::{
    backend::{self},
    executors::ExecutorBuilder,
    opts::EvmOpts,
    traces::CallTraceArena,
};
use foundry_config::Config;
use revm::{interpreter::InstructionResult, primitives::TxEnv};
use revm_primitives::{AccountInfo, BlockEnv, Bytecode, CfgEnv, Env};
use serde::{Deserialize, Serialize};

#[derive(Deserialize, Clone)]
pub struct Call {
    pub calldata: Bytes,
    pub value: U256,
    pub caller: Address,
}

#[derive(Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ForkConfig {
    pub rpc_url: Option<String>,
    pub chain_id: Option<u64>,
    pub block_number: Option<u64>,
}

#[derive(Deserialize, Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ExecutionResult {
    pub exit_reason: InstructionResult,
    pub reverted: bool,
    pub result: Bytes,
    pub gas_used: u64,
    pub logs: Vec<Log>,
    pub traces: CallTraceArena,
}

// Define a static mapping of chain IDs to RPC URLs loaded from environment variables
static CHAIN_RPC_URLS: Lazy<HashMap<u64, String>> = Lazy::new(|| {
    let mut map = HashMap::new();

    // Add Base (8453)
    if let Ok(rpc) = env::var("BASE_RPC") {
        map.insert(8453, rpc);
    }

    // Add Ethereum (1)
    if let Ok(rpc) = env::var("ETH_RPC") {
        map.insert(1, rpc);
    }

    // Add Arbitrum (42161)
    if let Ok(rpc) = env::var("ARBITRUM_RPC") {
        map.insert(42161, rpc);
    }

    // Add Optimism (10)
    if let Ok(rpc) = env::var("OPTIMISM_RPC") {
        map.insert(10, rpc);
    }

    if let Ok(rpc) = env::var("POLYGON_RPC") {
        map.insert(137, rpc);
    }

    if let Ok(rpc) = env::var("BNB_RPC") {
        map.insert(56, rpc);
    }

    if let Ok(rpc) = env::var("AVALANCHE_RPC") {
        map.insert(43114, rpc);
    }

    map
});

pub async fn execute_calldatas_fork(
    deployed_bytes: Bytes,
    address: Address,
    calls: Vec<Call>,
    fork_config: Option<ForkConfig>,
) -> Result<Vec<ExecutionResult>, eyre::Error> {
    dotenv().ok();

    // Debug log the fork config
    println!("Fork config: {:?}", fork_config);

    // Get RPC URL from fork config or environment variable
    let rpc = match &fork_config {
        // If custom RPC URL is provided, use it
        Some(config) if config.rpc_url.is_some() => {
            let url = config.rpc_url.clone().unwrap();
            println!("Using custom RPC URL: {}", url);
            url
        }
        // If chain ID is provided, look up the RPC URL from our mapping
        Some(config) if config.chain_id.is_some() => {
            let chain_id = config.chain_id.unwrap();
            println!("Looking up RPC URL for chain ID: {}", chain_id);
            let url = CHAIN_RPC_URLS
                .get(&chain_id)
                .cloned()
                .ok_or_else(|| eyre::eyre!("No RPC URL configured for chain ID {}", chain_id))?;
            println!("Found RPC URL: {}", url);
            url
        }
        // Default to BASE_RPC
        _ => {
            let url = env::var("BASE_RPC")
                .map_err(|_| eyre::eyre!("BASE_RPC environment variable not set"))?;
            println!("Using default RPC URL: {}", url);
            url
        }
    };

    let rpc_url = rpc.parse()?;
    let provider = ProviderBuilder::new().on_http(rpc_url);

    // Determine block ID based on fork config
    let block_id = match &fork_config {
        Some(config) if config.block_number.is_some() => {
            BlockId::Number(config.block_number.unwrap().into())
        }
        _ => BlockId::latest(),
    };

    // Debug log the block ID
    println!("Using block ID: {:?}", block_id);

    let (_fork_gas_price, mut rpc_chain_id, block) = tokio::try_join!(
        provider.get_gas_price(),
        provider.get_chain_id(),
        provider.get_block(block_id, BlockTransactionsKind::Hashes)
    )?;

    // Override chain ID if specified in fork config
    if let Some(config) = &fork_config {
        if let Some(chain_id) = config.chain_id {
            rpc_chain_id = chain_id;
        }
    }

    let cfg = CfgEnv::default().with_chain_id(rpc_chain_id);

    let block = if let Some(block) = block {
        block
    } else {
        Err(eyre::eyre!("block not found"))?
    };

    // After getting the block
    println!("Block number: {:?}", block.header.number);

    let block_env = BlockEnv {
        number: U256::from(block.header.number.expect("block number not found")),
        timestamp: U256::from(block.header.timestamp),
        coinbase: block.header.miner,
        difficulty: block.header.difficulty,
        prevrandao: Some(block.header.mix_hash.unwrap_or_default()),
        basefee: U256::from(block.header.base_fee_per_gas.unwrap_or_default()),
        gas_limit: U256::from(block.header.gas_limit),
        ..Default::default()
    };
    let env = Env {
        cfg,
        block: block_env,
        tx: TxEnv {
            chain_id: Some(rpc_chain_id),
            gas_limit: block.header.gas_limit as u64,
            ..Default::default()
        },
        ..Default::default()
    };
    let opts = EvmOpts {
        fork_url: Some(rpc),
        fork_block_number: fork_config.as_ref().and_then(|c| c.block_number),
        ..Default::default()
    };
    println!(
        "EVM options - fork URL: {:?}, fork block number: {:?}",
        opts.fork_url, opts.fork_block_number
    );
    let backend = backend::Backend::spawn(opts.get_fork(&Config::default(), opts.evm_env().await?));
    let mut executor = ExecutorBuilder::new()
        .inspectors(|stack| stack.trace_mode(forge::traces::TraceMode::Call).logs(true))
        .build(env, backend);

    let deployed_bytecode = Bytecode::new_raw(deployed_bytes);
    executor.backend_mut().insert_account_info(
        address,
        AccountInfo {
            code_hash: deployed_bytecode.hash_slow(),
            code: Some(deployed_bytecode),
            ..Default::default()
        },
    );

    // After setting rpc_chain_id
    println!("Using chain ID: {}", rpc_chain_id);

    calls
        .into_iter()
        .map(|call| {
            let r = executor.transact_raw(call.caller, address, call.calldata, call.value)?;
            Ok(ExecutionResult {
                exit_reason: r.exit_reason,
                reverted: r.reverted,
                result: r.result,
                gas_used: r.gas_used,
                logs: r.logs,
                traces: r.traces.unwrap_or(CallTraceArena::default()),
            })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use alloy::hex;
    use alloy_primitives::{Address, Bytes, U256};
    use std::str::FromStr;

    // TODO test for contract that exists
    #[tokio::test(flavor = "multi_thread")]
    async fn test_simple_storage_contract() {
        // Simple storage contract bytecode
        let bytecode = Bytes::from_str("0x608060405234801561000f575f80fd5b506004361061004a575f3560e01c80632a1afcd91461004e57806342cbb15c1461006c57806360fe47b11461008a5780636d4ce63c146100a6575b5f80fd5b6100566100c4565b6040516100639190610130565b60405180910390f35b6100746100c9565b6040516100819190610130565b60405180910390f35b6100a4600480360381019061009f9190610177565b6100d0565b005b6100ae610110565b6040516100bb9190610130565b60405180910390f35b5f5481565b5f43905090565b805f819055507fe0dca1a932506e28dc1cd7f50b0604489287b36ba09c37f13b25ee518d813528816040516101059190610130565b60405180910390a150565b5f8054905090565b5f819050919050565b61012a81610118565b82525050565b5f6020820190506101435f830184610121565b92915050565b5f80fd5b61015681610118565b8114610160575f80fd5b50565b5f813590506101718161014d565b92915050565b5f6020828403121561018c5761018b610149565b5b5f61019984828501610163565b9150509291505056fea2646970667358221220f7399e877793618afbf93c1ab591511f69fa1330a3fd5526ff45418127a04af964736f6c634300081a0033").unwrap();
        let address = Address::from_str("0xb2f9974c62815d3177079e150377915d9bc49c82").unwrap();

        // Call to store a value
        let store_call = Call {
            caller: Address::from_str("0x1000000000000000000000000000000000000000").unwrap(),
            calldata: Bytes::from_str(
                "0x60fe47b10000000000000000000000000000000000000000000000000000000000000001", // set 1
            )
            .unwrap(), // store(66)
            value: U256::from(0),
        };

        // Call to retrieve the value
        let retrieve_call = Call {
            caller: Address::from_str("0x1000000000000000000000000000000000000000").unwrap(),
            calldata: Bytes::from_str("0x6d4ce63c").unwrap(), // get()
            value: U256::from(0),
        };

        // Execute the calls
        let results =
            execute_calldatas_fork(bytecode, address, vec![store_call, retrieve_call], None)
                .await
                .unwrap();

        for (i, result) in results.iter().enumerate() {
            println!("Call {}", i);
            println!("Result data: 0x{}", hex::encode(&result.result));
            println!("Gas used: {}", result.gas_used);
            println!("Exit reason: {:?}", result.exit_reason);
            println!("Reverted: {}", result.reverted);
            println!("---");
        }

        // Check the retrieve call result
        assert_eq!(
            hex::encode(&results[1].result),
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
    }
}
