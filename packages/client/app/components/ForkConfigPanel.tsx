"use client";

import React, { useState } from "react";
import { useAppContext } from "../hooks/useAppContext";
import { ChainOption } from "../types";

const ForkConfigPanel: React.FC = () => {
  const {
    forkConfig,
    setForkConfig,
    availableChains,
    clearCurrentFileFunctionCallResults,
  } = useAppContext();
  const [isExpanded, setIsExpanded] = useState(false);
  const [blockNumber, setBlockNumber] = useState<string>(
    forkConfig?.blockNumber?.toString() || "",
  );
  const [customRpcUrl, setCustomRpcUrl] = useState<string>(
    forkConfig?.rpcUrl || "",
  );

  const handleChainChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === "custom") {
      setForkConfig({
        chainId: undefined,
        rpcUrl: customRpcUrl || "",
        blockNumber: blockNumber ? parseInt(blockNumber) : undefined,
      });
    } else {
      setForkConfig({
        chainId: parseInt(value),
        rpcUrl: undefined,
        blockNumber: blockNumber ? parseInt(blockNumber) : undefined,
      });
    }
    clearCurrentFileFunctionCallResults();
  };

  const handleBlockNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBlockNumber(e.target.value);
  };

  const handleCustomRpcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomRpcUrl(e.target.value);
  };

  const handleApplyConfig = () => {
    setForkConfig({
      chainId: forkConfig?.chainId,
      rpcUrl: forkConfig?.rpcUrl,
      blockNumber: blockNumber ? parseInt(blockNumber) : undefined,
    });
    clearCurrentFileFunctionCallResults();
  };

  const handleApplyCustomRpc = () => {
    setForkConfig({
      chainId: undefined,
      rpcUrl: customRpcUrl,
      blockNumber: blockNumber ? parseInt(blockNumber) : undefined,
    });
    clearCurrentFileFunctionCallResults();
  };

  return (
    <div className="border-b border-color-panel">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full p-3 bg-panel-header text-primary hover:bg-panel-body transition-colors"
      >
        <span className="font-medium">Fork Configuration</span>
        <svg
          className={`w-5 h-5 transition-transform ${
            isExpanded ? "transform rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isExpanded && (
        <div className="p-4 bg-panel-body space-y-4">
          <div>
            <label
              htmlFor="chain-select"
              className="block text-sm font-medium text-secondary mb-1"
            >
              Chain
            </label>
            <select
              id="chain-select"
              value={
                forkConfig?.rpcUrl !== undefined
                  ? "custom"
                  : forkConfig?.chainId?.toString() || "1"
              }
              onChange={handleChainChange}
              className="w-full p-2 bg-input text-primary border border-color-input rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
            >
              {availableChains.map((chain: ChainOption) => (
                <option key={chain.id} value={chain.id}>
                  {chain.name}
                </option>
              ))}
              <option value="custom">Custom RPC URL</option>
            </select>
          </div>

          {forkConfig?.rpcUrl !== undefined && (
            <div>
              <label
                htmlFor="custom-rpc"
                className="block text-sm font-medium text-secondary mb-1"
              >
                Custom RPC URL
              </label>
              <div className="flex space-x-2">
                <input
                  id="custom-rpc"
                  type="text"
                  value={customRpcUrl}
                  onChange={handleCustomRpcChange}
                  placeholder="https://..."
                  className="flex-grow p-2 bg-input text-primary border border-color-input rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                />
                <button
                  onClick={handleApplyCustomRpc}
                  className="px-3 py-2 bg-accent text-white rounded-md hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-50 transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="block-number"
              className="block text-sm font-medium text-secondary mb-1"
            >
              Block Number (optional)
            </label>
            <div className="flex space-x-2">
              <input
                id="block-number"
                type="text"
                value={blockNumber}
                onChange={handleBlockNumberChange}
                placeholder="latest"
                className="flex-grow p-2 bg-input text-primary border border-color-input rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
              />
              <button
                onClick={handleApplyConfig}
                className="px-3 py-2 bg-accent text-white rounded-md hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-50 transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForkConfigPanel;
