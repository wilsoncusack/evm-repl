// components/LoadContractsModal.tsx

import { useState } from "react";
import { useAppContext } from "../hooks/useAppContext";
import axios from "axios";
import { SolidityFile } from "../types";
import { fetchBytecodeFromChain } from "../utils";
import {
  base,
  baseSepolia,
  sepolia,
  polygon,
  arbitrum,
  optimism,
  zora,
  mainnet,
} from "viem/chains";
import { Address, Chain, Hex } from "viem";

interface LoadContractsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const chains: Chain[] = [
  mainnet,
  sepolia,
  polygon,
  arbitrum,
  optimism,
  zora,
  base,
  baseSepolia,
];

const LoadContractsModal: React.FC<LoadContractsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [address, setAddress] = useState<Address | undefined>(undefined);
  const [chainId, setChainId] = useState<number>(base.id); // Default to Base
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noCodeFound, setNoCodeFound] = useState(false);
  const { addNewContract } = useAppContext();

  const loadContractsFromSourceify = async (
    chainId: number,
    address: Address,
  ): Promise<SolidityFile[]> => {
    try {
      const response = await axios.get(
        `https://sourcify.dev/server/files/tree/any/${chainId}/${address}`,
      );
      const { files } = response.data;

      const newFiles: SolidityFile[] = await Promise.all(
        files
          .filter((file: string) => file.endsWith(".sol"))
          .map(async (file: string) => {
            const content = await fetchFileContent(file);
            const name = file.split("/").pop() || "";
            return {
              id: crypto.randomUUID(),
              name,
              content: processFileContent(content, name),
              address,
            };
          }),
      );

      return newFiles;
    } catch (error) {
      console.error("Error loading contracts from Sourcify:", error);
      return [];
    }
  };

  const fetchFileContent = async (url: string): Promise<string> => {
    const response = await axios.get(url);
    return response.data;
  };

  const processFileContent = (content: string, fileName: string): string => {
    // Fix import statements
    let processedContent = content.replace(
      /import\s+(?:{[^}]+}\s+from\s+)?["']([^"']+)["'];/g,
      (match, path) => {
        const parts = path.split("/");
        const newPath = `./${parts[parts.length - 1]}`;

        if (match.includes("{")) {
          // Named imports
          return match.replace(path, newPath);
        }
        // Default imports
        return `import "${newPath}";`;
      },
    );

    // Remove duplicate imports
    const imports = new Set();
    processedContent = processedContent
      .split("\n")
      .filter((line) => {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith("import ")) {
          if (imports.has(trimmedLine)) {
            return false;
          }
          imports.add(trimmedLine);
        }
        return true;
      })
      .join("\n");

    return processedContent;
  };

  const loadContract = async (chainId: number, address: Address) => {
    setIsLoading(true);
    setError(null);
    setNoCodeFound(false);
    try {
      // First, try to load from Sourcify
      const sourcifyFiles = await loadContractsFromSourceify(chainId, address);
      if (sourcifyFiles.length > 0) {
        sourcifyFiles.forEach((file) => addNewContract(file));
        onClose();
        return;
      }

      // If Sourcify fails, fall back to loading bytecode
      const selectedChain = chains.find((chain) => chain.id === chainId);
      if (!selectedChain) {
        throw new Error("Selected chain not found");
      }

      const bytecode = await fetchBytecodeFromChain(selectedChain, address);
      if (!bytecode) {
        setNoCodeFound(true);
        return;
      }

      const newFile: SolidityFile = {
        id: crypto.randomUUID(),
        name: `Contract_${address.slice(0, 6)}`,
        content: "",
        address,
        bytecode: bytecode as Hex,
      };

      addNewContract(newFile);
      onClose();
    } catch (error) {
      console.error("Error loading contract:", error);
      setError("Error loading contract:");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;
    await loadContract(Number(chainId), address);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-md w-full">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Load Contract</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="chainId"
              className="block text-sm font-medium text-gray-700"
            >
              Chain
            </label>
            <select
              id="chainId"
              value={chainId}
              onChange={(e) => setChainId(Number(e.target.value))}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-gray-800"
            >
              {chains.map((chain) => (
                <option key={chain.id} value={chain.id}>
                  {chain.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label
              htmlFor="address"
              className="block text-sm font-medium text-gray-700"
            >
              Contract Address
            </label>
            <input
              type="text"
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value as Address)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-gray-800"
              placeholder="0x..."
            />
          </div>
          {error && <div className="text-red-500 mb-4">{error}</div>}
          {noCodeFound && (
            <div className="text-yellow-500 mb-4">
              No code found at the given address. This might be an EOA
              (Externally Owned Account) or an undeployed contract address.
            </div>
          )}
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Load Contract"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoadContractsModal;
