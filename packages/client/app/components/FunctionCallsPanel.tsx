// components/FunctionCallsPanel.tsx
"use client";

import React, { useMemo } from "react";
import { useAppContext } from "../hooks/useAppContext";
import FunctionCallItem from "./FunctionCallItem";
import ForkConfigPanel from "./ForkConfigPanel";

const FunctionCallsPanel: React.FC = () => {
  const {
    currentFile,
    filesFunctionCalls,
    setFilesFunctionCalls,
    currentFileFunctionCallResults,
    forkConfig,
    availableChains,
  } = useAppContext();

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
    if (forkConfig.rpcUrl) return "Custom RPC";
    const chain = availableChains.find((c) => c.id === forkConfig.chainId);
    return chain?.name || "Base";
  }, [forkConfig, availableChains]);

  return (
    <div className="flex flex-col h-full border-l border-gray-200">
      <div className="p-4 bg-white border-b border-gray-200">
        <h2 className="text-xl font-bold">Function Calls</h2>
        <p className="text-gray-800 italic">
          State forked from <span className="font-semibold">{chainName}</span>
          {forkConfig.blockNumber
            ? ` at block ${forkConfig.blockNumber}`
            : " (latest)"}
        </p>
      </div>

      <ForkConfigPanel />

      <div className="flex-grow overflow-y-auto p-4">
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
      <div className="p-4 bg-white border-t border-gray-200">
        <button
          className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 ease-in-out"
          onClick={addFunctionCall}
        >
          Add Function Call
        </button>
      </div>
    </div>
  );
};

export default FunctionCallsPanel;
