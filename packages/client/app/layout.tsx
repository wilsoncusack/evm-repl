import "./globals.css";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { AppProvider } from "./providers/AppContextProvider";
import { TracingProvider } from "./contexts/TracingContext";
import { randomUUID } from "crypto";
import { FileFunctionCalls } from "./types";
import { getRandomAddress } from "./utils";

const simpleStorageSolidityCode = `pragma solidity 0.8.26;

contract SimpleStorage {
    uint256 public storedData;
    event StoredDataUpdated(uint);

    function set(uint256 x) public {
        storedData = x;
        emit StoredDataUpdated(x);
    }

    function get() public view returns (uint256) {
        return storedData;
    }

    function getBlockNumber() public view returns (uint256) {
      return block.number;
  }
}
`;

export const metadata: Metadata = {
  title: "EVM REPL",
  description: "EVM REPL",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialFiles = [
    {
      id: randomUUID(),
      name: "SimpleStorage.sol",
      content: simpleStorageSolidityCode,
      address: getRandomAddress(),
    },
  ];
  const initialFunctionCalls: FileFunctionCalls = {
    [initialFiles[0].id]: [
      {
        rawInput: "get()",
      },
      {
        rawInput: "set(1)",
      },
      {
        rawInput: "get()",
      },
    ],
  };

  return (
    <html lang="en">
      <AppProvider
        initialFiles={initialFiles}
        initialFunctionCalls={initialFunctionCalls}
      >
        <TracingProvider>
          <body>{children}</body>
        </TracingProvider>
      </AppProvider>
      <Analytics />
    </html>
  );
}
