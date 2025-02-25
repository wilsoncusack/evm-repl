"use client";

import React, { useState, useEffect } from "react";
import { useAppContext } from "../hooks/useAppContext";

const ForkConfigPanel: React.FC = () => {
  const { forkConfig, setForkConfig, availableChains } = useAppContext();
  const [customRpc, setCustomRpc] = useState("");
  const [blockNumber, setBlockNumber] = useState("");

  // Set default chain ID to Base (8453) on component mount
  useEffect(() => {
    if (!forkConfig.chainId) {
      setForkConfig((prev) => ({
        ...prev,
        chainId: 8453,
      }));
    }
  }, []);

  const handleChainSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const chainId = parseInt(e.target.value);
    if (chainId === 0) {
      // Custom RPC option
      setForkConfig({
        ...forkConfig,
        chainId: 0,
        rpcUrl: customRpc || undefined,
      });
    } else {
      // Predefined chain
      setForkConfig({
        ...forkConfig,
        chainId,
        rpcUrl: undefined, // Let the server use its configured RPC for this chain
      });
    }
  };

  const handleCustomRpcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomRpc(e.target.value);
    if (forkConfig.chainId === 0) {
      setForkConfig({
        ...forkConfig,
        rpcUrl: e.target.value || undefined,
      });
    }
  };

  const handleBlockNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setBlockNumber(value);
    setForkConfig({
      ...forkConfig,
      blockNumber: value ? parseInt(value) : undefined,
    });
  };

  return (
    <div className="p-4 bg-white border-b border-gray-200">
      <h3 className="text-lg font-semibold mb-2">Fork Configuration</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Chain
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={
              forkConfig.chainId === 0 ? "0" : forkConfig.chainId || "8453"
            }
            onChange={handleChainSelect}
          >
            {availableChains.map((chain) => (
              <option key={chain.id} value={chain.id}>
                {chain.name}
              </option>
            ))}
            <option value="0">Custom RPC</option>
          </select>
        </div>

        {forkConfig.chainId === 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Custom RPC URL
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://..."
              value={customRpc}
              onChange={handleCustomRpcChange}
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Block Number (optional)
          </label>
          <input
            type="number"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Latest"
            value={blockNumber}
            onChange={handleBlockNumberChange}
          />
        </div>
      </div>
    </div>
  );
};

export default ForkConfigPanel;
