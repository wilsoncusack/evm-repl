// components/FunctionCallItem.tsx
"use client";

import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useAppContext } from "../hooks/useAppContext";
import { useTracing } from "../hooks/useTracing";
import type { FunctionCall, FunctionCallResult } from "../types";
import { Hex, encodeFunctionData, isHex } from "viem";
import ResultDisplay from "./ResultDisplay";
import TraceDebugger from "./TraceDebugger";
import TraceDisplay from "./TraceDispaly";
import { replacer } from "../utils";

// Add extended type definition for source mapping
interface SourceContext {
  functionRanges: Record<string, Array<{
    name: string;
    line: number;
  }>>;
}

interface SourceMapping {
  sourceContext: SourceContext;
}

// Extend the FunctionCallResult type to include the missing properties
interface ExtendedFunctionCallResult extends FunctionCallResult {
  sourceMapping?: SourceMapping;
  error?: string;
}

interface FunctionCallItemProps {
  call: FunctionCall;
  index: number;
  result?: ExtendedFunctionCallResult;
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
  
  const { 
    setActiveTraceResult, 
    setIsTraceDebuggerOpen,
    activeTraceResult
  } = useTracing();
  
  const [error, setError] = useState<string | undefined>(undefined);
  const [isHovered, setIsHovered] = useState(false);
  const [showSimpleTrace, setShowSimpleTrace] = useState(false);
  const [showEventDetails, setShowEventDetails] = useState(true);
  
  // Check if this call is the active trace
  const isActive = activeTraceResult && 
    result && 
    activeTraceResult.call === result.call;

  // biome-ignore lint/correctness/useExhaustiveDependencies: only want this to run when compilation changes
  useEffect(() => {
    handleFunctionCallsChange(call.rawInput, index);
  }, [currentFileCompilationResult]);

  // Show debugger trace when hovering
  useEffect(() => {
    if (isHovered && result) {
      setActiveTraceResult(result);
      setIsTraceDebuggerOpen(true);
      scrollToFunction(result);
    }
  }, [isHovered, result, setActiveTraceResult, setIsTraceDebuggerOpen]);

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
            name: isRawCalldata ? undefined : parseFunctionCall(newCall).name,
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
  
  // Toggle the simple trace view
  const handleToggleSimpleTrace = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent parent click handler
    setShowSimpleTrace(!showSimpleTrace);
  };
  
  // Helper function to scroll to the function in the editor
  const scrollToFunction = (result: ExtendedFunctionCallResult) => {
    if (result.sourceMapping && result.sourceMapping.sourceContext) {
      const { sourceContext } = result.sourceMapping;
      const functionName = result.call.split('(')[0];
      
      // Find the function range to scroll to
      for (const [file, ranges] of Object.entries(sourceContext.functionRanges)) {
        if (file === currentFile?.name) {
          const functionRange = ranges.find(r => 
            r.name === functionName || 
            r.name.toLowerCase() === functionName.toLowerCase()
          );
          
          if (functionRange) {
            // This will be handled by the editor to scroll to this line
            setTimeout(() => {
              const editorElement = document.querySelector('.monaco-editor');
              if (editorElement) {
                const editor = (window as any).monaco?.editor?.getEditors?.()?.[0];
                if (editor) {
                  editor.revealLineInCenter(functionRange.line + 1);
                  editor.setPosition({ lineNumber: functionRange.line + 1, column: 1 });
                  editor.focus();
                }
              }
            }, 100);
            break;
          }
        }
      }
    }
  };

  // Format the response value for display
  const formatResponseValue = (response: any) => {
    if (response === undefined || response === null || response === '') {
      return null; // Return null to not display anything
    }
    
    if (typeof response === 'object') {
      // Use the replacer function to handle BigInt values
      try {
        return JSON.stringify(response, replacer, 2);
      } catch (e) {
        // Fallback if serialization still fails
        return String(response);
      }
    }
    
    return String(response);
  };

  return (
    <div 
      className={`bg-card shadow-sm rounded-lg overflow-hidden border transition-all duration-200 ${
        isActive 
          ? 'border-blue-400 dark:border-blue-500 ring-2 ring-blue-300 dark:ring-blue-700' 
          : isHovered 
            ? 'border-gray-300 dark:border-gray-600' 
            : 'border-color-card'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
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
            onClick={(e) => e.stopPropagation()} // Prevent parent click handler
          />
        </div>
        <button
          type="button"
          className="ml-2 p-1 text-error hover:bg-error-hover rounded transition-colors"
          onClick={(e) => {
            e.stopPropagation(); // Prevent parent click handler
            handleDelete();
          }}
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
      
      {result && (
        <div className="p-3 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <div className={`w-2 h-2 rounded-full mr-2 ${
                result.error ? 'bg-red-500' : 'bg-green-500'
              }`}></div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {result.error ? 'Failed' : 'Success'}
              </span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Gas: {result.gasUsed.toLocaleString()}
            </div>
          </div>
          
          {/* Result display */}
          <div className="mt-2 text-sm">
            {result.error ? (
              <div className="text-red-600 dark:text-red-400 font-mono text-xs p-2 bg-red-50 dark:bg-red-900/20 rounded">
                {result.error}
              </div>
            ) : (
              <>
                {/* Return value section */}
                {formatResponseValue(result.response) && (
                  <div className="mb-2">
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Return Value:
                    </div>
                    <div className="font-mono text-xs p-2 bg-gray-50 dark:bg-gray-800/50 rounded overflow-x-auto">
                      {formatResponseValue(result.response)}
                    </div>
                  </div>
                )}
                
                {/* Events section */}
                {result.logs && result.logs.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                      Events Emitted ({result.logs.length}):
                    </div>
                    
                    <div className="mt-2 space-y-2">
                      {result.logs.map((log, i) => (
                        <div key={i} className="border border-gray-200 dark:border-gray-700 rounded overflow-hidden">
                          <div className="bg-gray-50 dark:bg-gray-800 px-2 py-1 text-xs font-medium border-b border-gray-200 dark:border-gray-700">
                            {log.eventName || `Event #${i+1}`}
                          </div>
                          <div className="p-2 font-mono text-xs overflow-x-auto">
                            {JSON.stringify(log.args || log, replacer, 2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Action buttons */}
          <div className="mt-3 flex flex-wrap gap-2">
            {/* Show trace button */}
            {result.traces && (
              <button
                onClick={handleToggleSimpleTrace}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors 
                  ${showSimpleTrace 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'}`}
              >
                {showSimpleTrace ? 'Hide Call Trace' : 'Show Call Trace'}
              </button>
            )}
          </div>
          
          {/* Simple trace view */}
          {showSimpleTrace && result && (
            <div className="mt-3 border-t border-gray-200 dark:border-gray-700 pt-3">
              <TraceDisplay traces={result.traces} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FunctionCallItem;
