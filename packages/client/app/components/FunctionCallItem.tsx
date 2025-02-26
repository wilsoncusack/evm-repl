// components/FunctionCallItem.tsx
"use client";

import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useAppContext } from "../hooks/useAppContext";
import ResultDisplay from "./ResultDisplay";
import type { FunctionCall, FunctionCallResult } from "../types";
import { Hex, encodeFunctionData, isHex } from "viem";

interface FunctionCallItemProps {
  call: FunctionCall;
  index: number;
  result?: FunctionCallResult;
  isRawCalldata: boolean;
}

const FunctionCallItem: React.FC<FunctionCallItemProps> = ({
  call,
  index,
  result,
  isRawCalldata,
}) => {
  const {
    setFilesFunctionCalls,
    currentFile,
    currentFileCompilationResult,
    clearCurrentFileFunctionCallResults,
  } = useAppContext();
  const [error, setError] = useState<string | undefined>(undefined);

  // biome-ignore lint/correctness/useExhaustiveDependencies: only want this to run when compilation changes
  useEffect(() => {
    handleFunctionCallsChange(call.rawInput, index);
  }, [currentFileCompilationResult]);

  const handleFunctionCallsChange = useCallback(
    (newCall: string, index: number) => {
      if (
        !currentFile ||
        (!currentFileCompilationResult && !currentFile.bytecode)
      )
        return;
      setError(undefined);
      if (!newCall || newCall === "") return;
      try {
        let encodedCalldata: Hex;
        if (isRawCalldata || isHex(newCall)) {
          encodedCalldata = newCall as Hex;
        } else {
          if (!currentFileCompilationResult) return;
          const { name, args } = parseFunctionCall(newCall);
          encodedCalldata = encodeFunctionData({
            abi: currentFileCompilationResult.abi,
            functionName: name,
            args: args,
          });
        }

        setFilesFunctionCalls((prev) => {
          const newCalls = [...(prev[currentFile.id] || [])];
          newCalls[index] = {
            ...newCalls[index],
            rawInput: newCall,
            encodedCalldata,
          };
          return { ...prev, [currentFile.id]: newCalls };
        });
      } catch (e) {
        setError(String(e));
        setFilesFunctionCalls((prev) => {
          const newCalls: FunctionCall[] = [...(prev[currentFile.id] || [])];
          newCalls[index] = { ...newCalls[index], rawInput: newCall };
          return { ...prev, [currentFile.id]: newCalls };
        });
      }
    },
    [
      currentFile,
      currentFileCompilationResult,
      setFilesFunctionCalls,
      isRawCalldata,
    ],
  );

  const parseFunctionCall = (call: string): Partial<FunctionCall> => {
    // Regular expression to match function name and arguments
    const match = call.match(/^(\w+)\((.*)\)$/);

    if (!match) {
      throw Error("Invalid function call format");
    }

    const [, name, argsString] = match;

    // Parse arguments
    let args: any[] = [];
    if (argsString.trim() !== "") {
      args = argsString.split(",").map((arg) => {
        return arg.trim();
      });
    }

    return { name, args };
  };

  const handleDelete = () => {
    if (!currentFile) return;

    setFilesFunctionCalls((prev) => {
      const newCalls = [...(prev[currentFile.id] || [])];
      newCalls.splice(index, 1);
      return { ...prev, [currentFile.id]: newCalls };
    });
    clearCurrentFileFunctionCallResults();
  };

  return (
    <div className="bg-card shadow-sm rounded-lg overflow-hidden border border-color-card">
      <div className="flex items-center p-2 bg-card-header">
        <div className="flex-grow relative">
          <textarea
            className="w-full p-2 bg-input text-primary resize-none focus:outline-none font-mono border border-color-input rounded-md focus:ring-2 focus:ring-accent focus:border-accent transition-colors duration-200"
            value={call.rawInput}
            onChange={(e) => handleFunctionCallsChange(e.target.value, index)}
            rows={1}
            placeholder={
              isRawCalldata
                ? "Enter calldata (e.g., 0x...)"
                : "Enter function call (e.g., set(1))"
            }
          />
        </div>
        <button
          type="button"
          className="ml-2 p-1 text-error hover:bg-error-hover rounded transition-colors"
          onClick={handleDelete}
          aria-label="Delete function call"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
      {error && <div className="p-2 text-error text-sm">{error}</div>}
      {result && <ResultDisplay result={result} />}
    </div>
  );
};

export default FunctionCallItem;
