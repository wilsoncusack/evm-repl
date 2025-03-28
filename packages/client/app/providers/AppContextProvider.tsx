"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppContext } from "../contexts/AppContext";
import type {
  CompilationResult,
  ExecutionResponse,
  FileFunctionCalls,
  FileId,
  ForkConfig,
  FunctionCall,
  FunctionCallResult,
  SolidityFile,
  ChainOption,
} from "../types";
import {
  type Address,
  type DecodeEventLogReturnType,
  type Hex,
  decodeEventLog,
  decodeFunctionResult,
  encodeFunctionData,
  zeroAddress,
} from "viem";
import axios from "axios";
import { useDebounce } from "../hooks/useDebounce";
import { extractFileName, replacer } from "../utils";
import { enhanceFunctionCallResult } from "../utils/traceEnhancer";
import { EnhancedFunctionCallResult } from "../types/sourceMapping";

// Add a shared networks configuration that can be used throughout the app
export const SUPPORTED_NETWORKS: ChainOption[] = [
  { id: 8453, name: "Base" },
  { id: 1, name: "Ethereum" },
  { id: 42161, name: "Arbitrum" },
  { id: 10, name: "Optimism" },
  { id: 137, name: "Polygon" },
  { id: 56, name: "BNB Chain" },
  { id: 43114, name: "Avalanche" },
];

export const AppProvider: React.FC<{
  initialFiles: SolidityFile[];
  initialFunctionCalls: FileFunctionCalls;
  children: React.ReactNode;
}> = ({ initialFiles, initialFunctionCalls, children }) => {
  const [files, setFiles] = useState<SolidityFile[]>(initialFiles);
  const [currentFileId, setCurrentFileId] = useState<FileId>(
    initialFiles[0].id,
  );
  const [filesFunctionCalls, setFilesFunctionCalls] =
    useState<FileFunctionCalls>(initialFunctionCalls);
  const [compilationResult, setCompilationResult] = useState<
    CompilationResult | undefined
  >(undefined);
  const [isCompiling, setIsCompiling] = useState(false);
  const [currentFileFunctionCallResults, setCurrentFileFunctionCallResults] =
    useState<EnhancedFunctionCallResult[] | undefined>(undefined);
  const [forkConfig, setForkConfig] = useState<ForkConfig>({
    chainId: 8453, // Default to Base
  });
  const [availableChains, setAvailableChains] =
    useState<ChainOption[]>(SUPPORTED_NETWORKS);

  const currentFile = useMemo(() => {
    return files.find((f) => f.id === currentFileId);
  }, [currentFileId, files]);

  const clearCurrentFileFunctionCallResults = useCallback(() => {
    setCurrentFileFunctionCallResults(undefined);
  }, []);

  const currentFileCompilationResult = useMemo(() => {
    if (!compilationResult || !currentFile) return;

    const compiledFiles = Object.keys(compilationResult.contracts);
    const k = compiledFiles.find(
      (file) => extractFileName(file) === currentFile.name,
    );
    if (!k) {
      console.error("Could not find compiled result for current file");
      return;
    }

    return Object.values(compilationResult.contracts[k])[0][0].contract;
  }, [currentFile, compilationResult]);

  const debouncedCompileCode = useDebounce(async () => {
    if (files.length === 0) return;

    setIsCompiling(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER}/compile_solidity`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ files }),
        },
      );

      if (!response.ok) {
        throw new Error("Compilation failed");
      }

      const result = await response.json();
      setCompilationResult(result);
    } catch (error) {
      console.error("Compilation error:", error);
      setCompilationResult(undefined);
    } finally {
      setIsCompiling(false);
    }
  }, 1000);

  useEffect(() => {
    debouncedCompileCode();
  }, [files]);

  const refreshFunctionCallResult = useCallback(async () => {
    if (!currentFile) return;

    const currentFileFunctionCalls = filesFunctionCalls[currentFile.id];
    if (!currentFileFunctionCalls) {
      console.error("No function calls found for current file");
      return;
    }

    if (currentFileFunctionCalls.length === 0) {
      return;
    }

    const calls = currentFileFunctionCalls;
    const abi = currentFileCompilationResult?.abi;
    const bytecode =
      currentFileCompilationResult?.evm.deployedBytecode.object ||
      currentFile.bytecode;
    if (!bytecode) {
      console.error("no bytecode to use for function calls");
      return;
    }

    // Add bytecode to each function call for tracing purposes
    const enrichedCalls = calls.map(call => ({
      ...call,
      contractBytecode: bytecode as Hex
    }));

    const filteredCalls = enrichedCalls.filter((call) => call.encodedCalldata);

    const encodedCalls: { calldata: Hex; value: string; caller: Address }[] =
      [];
    for (const call of filteredCalls) {
      encodedCalls.push({
        // biome-ignore lint/style/noNonNullAssertion:
        calldata: call.encodedCalldata!,
        value: "0",
        caller: call.caller || zeroAddress,
      });
    }

    try {
      const response = await axios.post<ExecutionResponse[]>(
        `${process.env.NEXT_PUBLIC_SERVER}/execute_calldatas_fork`,
        {
          bytecode,
          calls: encodedCalls,
          address: currentFile.address,
          forkConfig: {
            rpcUrl: forkConfig.rpcUrl,
            chainId: forkConfig.chainId,
            blockNumber: forkConfig.blockNumber,
          },
          traceMode: 'jump'
        },
      );

      const results = response.data;

      // Prepare source files map
      const sourceFiles: Record<string, string> = {
        [currentFile.name]: currentFile.content,
      };
      
      // Add any imported files from other files in the project
      files.forEach(file => {
        if (file.id !== currentFile.id) {
          sourceFiles[file.name] = file.content;
        }
      });
      
      console.log('Source files for mapping:', Object.keys(sourceFiles));

      // Enhanced results with source mapping
      const enhancedResults: EnhancedFunctionCallResult[] = [];

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const functionCall = filteredCalls[i];
        
        let returned: string;
        try {
          if (abi) {
            returned = String(
              decodeFunctionResult({
                abi,
                functionName: calls[i].name,
                data: result.result,
              }),
            );
          } else {
            returned = result.result;
          }
        } catch (e) {
          returned = result.result;
        }
        
        const logs: DecodeEventLogReturnType[] = abi
          ? result.logs.map((log) =>
              decodeEventLog({
                abi,
                data: log.data,
                topics: log.topics,
              }),
            )
          : [];

        // Create basic function call result
        const basicResult: FunctionCallResult = {
          call: functionCall.name || "",
          gasUsed: result.gasUsed,
          response: returned,
          logs,
          rawLogs: result.logs,
          traces: result.traces,
        };
        
        // Enhance with source mapping if compilation result exists
        if (compilationResult) {
          enhancedResults.push(
            enhanceFunctionCallResult(
              basicResult,
              functionCall,
              compilationResult,
              sourceFiles
            )
          );
        } else {
          // If no compilation result, just use the basic result
          enhancedResults.push(basicResult as EnhancedFunctionCallResult);
        }
      }

      setCurrentFileFunctionCallResults(enhancedResults);
    } catch (error) {
      console.error("Execution error:", error);
    }
  }, [
    currentFile,
    filesFunctionCalls,
    currentFileCompilationResult,
    forkConfig,
    files,
    compilationResult,
  ]);

  const addNewContract = useCallback((newFile: SolidityFile) => {
    setFiles((prevFiles) => [...prevFiles, newFile]);
    clearCurrentFileFunctionCallResults();
    setCurrentFileId(newFile.id);
    setFilesFunctionCalls((prev) => ({
      ...prev,
      [newFile.id]: [{ rawInput: "" }],
    }));
  }, []);

  const debouncedRefreshFunctionCallResult = useDebounce(
    refreshFunctionCallResult,
    300,
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: want to update when any of these change
  useEffect(() => {
    debouncedRefreshFunctionCallResult();
  }, [
    compilationResult,
    currentFile,
    filesFunctionCalls,
    debouncedRefreshFunctionCallResult,
    forkConfig,
  ]);

  const value = {
    files,
    setFiles,
    filesFunctionCalls,
    setFilesFunctionCalls,
    currentFile,
    setCurrentFileId,
    compilationResult,
    isCompiling,
    setIsCompiling,
    currentFileCompilationResult,
    currentFileFunctionCallResults,
    clearCurrentFileFunctionCallResults,
    addNewContract,
    forkConfig,
    setForkConfig,
    availableChains,
    setAvailableChains,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
