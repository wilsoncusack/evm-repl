use foundry_compilers::{
    artifacts::sourcemap::SourceElement, contracts::VersionedContracts, multi::MultiCompilerError,
    Artifact, Project, ProjectPathsConfig,
};
use serde::{Deserialize, Serialize};
use serde_json;
use std::{collections::BTreeMap, fs, path::Path};
use tempfile::{self, TempDir};

#[derive(Deserialize)]
pub struct SolidityFile {
    pub name: String,
    pub content: String,
}

// Define a new struct to represent a source element in a more serializable way
#[derive(Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "camelCase")]
pub struct SerializableSourceElement {
    pub offset: u32,
    pub length: u32,
    pub index: i32,
    pub jump_type: String,
    pub modifier_depth: u32,
}

#[derive(Debug, Serialize)]
pub struct CompileResult {
    pub errors: Vec<MultiCompilerError>,
    pub contracts: VersionedContracts,
    pub source_maps: BTreeMap<String, String>,
}

// Helper function to process source map data and convert to JSON string
fn process_source_map_data(
    source_map_data: &Vec<SourceElement>,
    file_path: &Path,
    contract_name: &str,
    is_deployed: bool,
) -> (String, String) {
    // Convert to our serializable format
    let serializable_data: Vec<SerializableSourceElement> = source_map_data
        .iter()
        .map(|elem| {
            // Get jump type directly
            let jump_str = format!("{:?}", elem.jump());

            SerializableSourceElement {
                offset: elem.offset(),
                length: elem.length(),
                index: elem.index_i32(),
                jump_type: jump_str,
                modifier_depth: elem.modifier_depth(),
            }
        })
        .collect();

    // Serialize to JSON
    let source_map_string = serde_json::to_string(&serializable_data)
        .unwrap_or_else(|_| format!("{:?}", serializable_data));

    // Create the appropriate key based on whether it's deployed bytecode
    let key = if is_deployed {
        format!("{}:deployed:{}", file_path.display(), contract_name)
    } else {
        format!("{}:{}", file_path.display(), contract_name)
    };

    (key, source_map_string)
}

pub fn compile(files: &[SolidityFile]) -> Result<CompileResult, eyre::Error> {
    // Create a temporary directory
    let temp_dir = TempDir::new()?;

    // Create a subdirectory for sources
    let sources_dir = temp_dir.path().join("src");
    fs::create_dir(&sources_dir)?;

    // Write each Solidity file to the sources directory
    for file in files {
        let file_path = sources_dir.join(&file.name);
        fs::write(&file_path, &file.content)?;
    }

    let paths = ProjectPathsConfig::builder()
        .root(sources_dir.clone())
        .sources(sources_dir)
        .build()?;

    let project = Project::builder()
        .paths(paths)
        .ephemeral()
        .no_artifacts()
        .build(Default::default())?;

    let output = project.compile()?;

    println!("Output: {:?}", output);

    let mut source_maps = BTreeMap::new();
    // let mut generated_sources = BTreeMap::new();

    // Using the contracts_with_files_and_version iterator method
    for (file_path, contract_name, contract, _) in
        output.output().contracts.contracts_with_files_and_version()
    {
        // Simplified approach: use get_source_map functions directly
        // Get creation bytecode source map
        if let Some(source_map_result) = contract.get_source_map() {
            if let Ok(source_map_data) = source_map_result {
                let (key, value) =
                    process_source_map_data(&source_map_data, &file_path, contract_name, false);
                source_maps.insert(key, value);
            }
        }

        // Get deployed bytecode source map
        if let Some(source_map_result) = contract.get_source_map_deployed() {
            if let Ok(source_map_data) = source_map_result {
                let (key, value) =
                    process_source_map_data(&source_map_data, &file_path, contract_name, true);
                source_maps.insert(key, value);
            }
        }
    }

    Ok(CompileResult {
        errors: output.output().errors.clone(),
        contracts: output.output().contracts.clone(),
        source_maps,
        // generated_sources,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compile_valid_contracts() {
        let files = vec![
            SolidityFile {
                name: "SimpleStorage.sol".to_string(),
                content: r#"
            pragma solidity 0.8.2;

            import "./AnotherContract.sol";

            contract SimpleStorage {
                uint256 public storedData;

                function set(uint256 x) public {
                    storedData = x;
                }

                function get() public view returns (uint256) {
                    return storedData;
                }
            }
            "#
                .to_string(),
            },
            SolidityFile {
                name: "AnotherContract.sol".to_string(),
                content: r#"
            pragma solidity ^0.8.1;

            contract AnotherContract {
                string public message;

                function setMessage(string memory _message) public {
                    message = _message;
                }
            }
            "#
                .to_string(),
            },
        ];

        let result = compile(&files);

        // assert!(result.is_ok(), "Compilation failed: {:?}", result.err());

        let compile_result = result.unwrap();

        // Check if there are no errors
        // assert!(compile_result.errors.is_empty(), "Compilation had errors: {:?}", compile_result.errors);

        // Check if both contracts are present in the output
        // assert!(compile_result.contracts.contains_key("SimpleStorage.sol"));
        // assert!(compile_result.contracts.contains_key("AnotherContract.sol"));

        // let simple_storage = &compile_result.contracts["SimpleStorage.sol"];
        // let another_contract = &compile_result.contracts["AnotherContract.sol"];

        // assert!(simple_storage.contains_key("SimpleStorage"));
        // assert!(another_contract.contains_key("AnotherContract"));

        println!("Compilation successful: {:?}", compile_result);
    }

    // #[test]
    // fn test_compile_invalid_contract() {
    //     let invalid_solidity_code = r#"
    //     pragma solidity ^0.8.0;
    //     contract InvalidContract {
    //         uint256 public storedData
    //         function set(uint256 x) public {
    //             storedData = x;
    //         }
    //         function get() public view returns (uint256) {
    //             return storedData;
    //         }
    //     }
    //     "#;

    //     let result = compile(invalid_solidity_code);
    //     assert!(result.is_err());
    //     println!("{:?}", result.err().unwrap());
    // }
}
