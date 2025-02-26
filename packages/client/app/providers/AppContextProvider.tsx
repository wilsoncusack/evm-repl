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
    useState<FunctionCallResult[] | undefined>(undefined);
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

    const filteredCalls = calls.filter((call) => call.encodedCalldata);

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
        },
      );

      const results = response.data;

      const output: FunctionCallResult[] = results.map((result, i) => {
        if (!abi) {
          return {
            call: filteredCalls[i].name || "",
            gasUsed: result.gasUsed,
            response: result.result,
            // TODO: try to dump raw logs
            rawLogs: result.logs,
            traces: result.traces,
          };
        }

        let returned: string;
        try {
          returned = String(
            decodeFunctionResult({
              abi,
              functionName: calls[i].name,
              data: result.result,
            }),
          );
        } catch (e) {
          returned = result.result;
        }
        const logs: DecodeEventLogReturnType[] = result.logs.map((log) =>
          decodeEventLog({
            abi,
            data: log.data,
            topics: log.topics,
          }),
        );

        return {
          // biome-ignore lint/style/noNonNullAssertion: all filtered calls have a name
          call: filteredCalls[i].name!,
          gasUsed: result.gasUsed,
          response: returned,
          logs,
          traces: result.traces,
          rawLogs: result.logs,
        };
      });

      setCurrentFileFunctionCallResults(output);
    } catch (error) {
      console.error("Execution error:", error);
    }
  }, [
    currentFile,
    filesFunctionCalls,
    currentFileCompilationResult,
    forkConfig,
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
