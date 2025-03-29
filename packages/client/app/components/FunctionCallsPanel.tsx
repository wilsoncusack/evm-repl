// components/FunctionCallsPanel.tsx
"use client";

import React, { useMemo } from "react";
import { useAppContext } from "../hooks/useAppContext";
import { useTracing } from "../hooks/useTracing";
import FunctionCallItem from "./FunctionCallItem";
import ForkConfigPanel from "./ForkConfigPanel";
import { Chain } from "viem";
import { ChainOption } from "../types";

const FunctionCallsPanel: React.FC = () => {
  const {
    currentFile,
    filesFunctionCalls,
    setFilesFunctionCalls,
    currentFileFunctionCallResults,
    forkConfig,
    availableChains,
  } = useAppContext();
  
  const { activeTraceResult } = useTracing();

  const functionCalls = useMemo(() => {
    if (!currentFile) return [];
    return filesFunctionCalls[currentFile.id] || [];
  }, [currentFile, filesFunctionCalls]);

  const addFunctionCall = () => {
    if (!currentFile) return;
    setFilesFunctionCalls((prev) => ({
      ...prev,
      [currentFile.id]: [...(prev[currentFile.id] || []), { rawInput: "" }],
    }));
  };

  // Determine which chain we're using for display purposes
  const chainName = useMemo(() => {
    if (!forkConfig) return "Base"; // Default fallback
    if (forkConfig.rpcUrl) return "Custom RPC";
    const chain = availableChains.find(
      (c: ChainOption) => c.id === forkConfig.chainId,
    );
    return chain?.name || "Base";
  }, [forkConfig, availableChains]);

  return (
    <div className="flex flex-col h-full border-l border-color-panel">
      <div className="p-4 bg-panel-header border-b border-color-panel">
        <h2 className="text-xl font-bold text-primary">Function Calls</h2>
        <p className="text-secondary italic">
          State forked from <span className="font-semibold">{chainName}</span>
          {forkConfig?.blockNumber
            ? ` at block ${forkConfig.blockNumber}`
            : " (latest)"}
        </p>
      </div>

      <ForkConfigPanel />

      <div className="flex-grow overflow-y-auto p-4 bg-panel-body">
        <div className="space-y-4">
          {functionCalls.map((call, index) => (
            <FunctionCallItem
              key={index}
              call={call}
              index={index}
              result={
                currentFileFunctionCallResults
                  ? currentFileFunctionCallResults[index]
                  : undefined
              }
              isRawCalldata={!currentFile?.content}
            />
          ))}
        </div>
      </div>
      <div className="p-4 bg-panel-footer border-t border-color-panel">
        <button
          className="w-full px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-50 transition duration-150 ease-in-out"
          onClick={addFunctionCall}
        >
          Add Function Call
        </button>
      </div>
    </div>
  );
};

export default FunctionCallsPanel;
