// components/SolidityEditor.tsx
"use client";

import React, { useRef, useMemo, useEffect, useState } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import CompileErrorDisplay from "./CompileErrorDisplay";
import { useAppContext } from "../hooks/useAppContext";
import { useTracing } from "../hooks/useTracing";
import CopyToClipboard from "react-copy-to-clipboard";

// Create a separate component for the styles to avoid hydration issues
const EditorStyles = () => {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
      .executed-line-low {
        background-color: rgba(59, 130, 246, 0.1);
      }
      .executed-line-medium {
        background-color: rgba(59, 130, 246, 0.15);
      }
      .executed-line-high {
        background-color: rgba(59, 130, 246, 0.2);
      }
      .executed-line-gutter-low:before,
      .executed-line-gutter-medium:before,
      .executed-line-gutter-high:before {
        content: "";
        width: 4px;
        margin-left: 5px;
        height: 100%;
        position: absolute;
      }
      .executed-line-gutter-low:before {
        background-color: rgba(59, 130, 246, 0.5);
      }
      .executed-line-gutter-medium:before {
        background-color: rgba(59, 130, 246, 0.7);
      }
      .executed-line-gutter-high:before {
        background-color: rgba(59, 130, 246, 0.9);
      }
      
      /* Fix for bottom margin */
      .monaco-editor {
        margin-bottom: 0 !important;
      }
      
      /* Force editor to fill container */
      .monaco-editor, .monaco-editor-background, .monaco-editor .inputarea.ime-input {
        height: 100% !important;
      }
      
      /* Gas heatmap colors - Updated for better visibility */
      .gas-heatmap-very-low {
        border-left: 4px solid rgba(74, 222, 128, 0.7);
      }
      .gas-heatmap-low {
        border-left: 4px solid rgba(74, 222, 128, 0.8);
      }
      .gas-heatmap-medium {
        border-left: 4px solid rgba(250, 204, 21, 0.8);
      }
      .gas-heatmap-high {
        border-left: 4px solid rgba(248, 113, 113, 0.8);
      }
      .gas-heatmap-very-high {
        border-left: 4px solid rgba(239, 68, 68, 0.9);
      }
      
      /* Dark mode improved gas heatmap colors */
      @media (prefers-color-scheme: dark) {
        .gas-heatmap-very-low {
          border-left: 5px solid rgba(74, 222, 128, 0.7);
        }
        .gas-heatmap-low {
          border-left: 5px solid rgba(74, 222, 128, 0.8);
        }
        .gas-heatmap-medium {
          border-left: 5px solid rgba(250, 204, 21, 0.8);
        }
        .gas-heatmap-high {
          border-left: 5px solid rgba(248, 113, 113, 0.8);
        }
        .gas-heatmap-very-high {
          border-left: 5px solid rgba(239, 68, 68, 0.9);
        }
      }
      
      /* Gas usage annotation styles */
      .gas-annotation {
        font-size: 0.7rem;
        font-family: monospace;
        padding: 0 4px;
        border-radius: 2px;
        margin-right: 4px;
        white-space: nowrap;
        position: absolute;
        left: 0;
        transform: translateX(-100%);
      }
      .gas-annotation-very-low {
        background-color: rgba(74, 222, 128, 0.2);
        color: rgb(22, 101, 52);
      }
      .gas-annotation-low {
        background-color: rgba(74, 222, 128, 0.3);
        color: rgb(22, 101, 52);
      }
      .gas-annotation-medium {
        background-color: rgba(250, 204, 21, 0.3);
        color: rgb(161, 98, 7);
      }
      .gas-annotation-high {
        background-color: rgba(248, 113, 113, 0.3);
        color: rgb(153, 27, 27);
      }
      .gas-annotation-very-high {
        background-color: rgba(239, 68, 68, 0.4);
        color: rgb(153, 27, 27);
      }
      
      /* Dark mode gas annotation colors */
      @media (prefers-color-scheme: dark) {
        .gas-annotation-very-low {
          background-color: rgba(74, 222, 128, 0.2);
          color: rgb(134, 239, 172);
        }
        .gas-annotation-low {
          background-color: rgba(74, 222, 128, 0.3);
          color: rgb(134, 239, 172);
        }
        .gas-annotation-medium {
          background-color: rgba(250, 204, 21, 0.3);
          color: rgb(253, 224, 71);
        }
        .gas-annotation-high {
          background-color: rgba(248, 113, 113, 0.3);
          color: rgb(252, 165, 165);
        }
        .gas-annotation-very-high {
          background-color: rgba(239, 68, 68, 0.4);
          color: rgb(252, 165, 165);
        }
      }
      
      /* Gas usage margin annotations */
      .gas-margin-annotation {
        margin-left: 4px;
        font-size: 0.75rem;
        font-family: monospace;
        opacity: 0.9;
        background-color: rgba(100, 100, 100, 0.1);
        padding: 0 4px;
        border-radius: 2px;
      }
      
      .execution-count {
        font-size: 0.75rem;
        opacity: 0.8;
        margin-left: 0.5rem;
      }
      .execution-count-detail {
        font-size: 0.75rem;
        opacity: 0.75;
        margin-left: 0.5rem;
        font-style: italic;
        color: #888;
      }
      .step-detail {
        font-size: 0.7rem;
        color: #6366f1;
        font-family: monospace;
        margin-left: 1rem;
        font-style: normal;
      }
      .step-detail-more {
        font-size: 0.7rem;
        color: #9ca3af;
        font-style: italic;
        margin-left: 1rem;
      }
      .highlighted-execution-line {
        background-color: rgba(234, 179, 8, 0.2);
        border-left: 2px solid rgb(234, 179, 8);
      }
      .active-function-range {
        background-color: rgba(100, 100, 100, 0.05);
        border-left: 2px solid rgba(100, 100, 100, 0.2);
      }
      
      /* Gas widget styles */
      .gas-widget {
        background-color: rgba(100, 100, 100, 0.1);
        color: inherit;
        padding: 0 4px;
        border-radius: 2px;
        font-size: 0.75rem;
        font-family: monospace;
        margin-left: 8px;
        white-space: nowrap;
      }
      .gas-widget-very-low {
        background-color: rgba(74, 222, 128, 0.2);
        color: rgb(22, 101, 52);
      }
      .gas-widget-low {
        background-color: rgba(74, 222, 128, 0.3);
        color: rgb(22, 101, 52);
      }
      .gas-widget-medium {
        background-color: rgba(250, 204, 21, 0.3);
        color: rgb(161, 98, 7);
      }
      .gas-widget-high {
        background-color: rgba(248, 113, 113, 0.3);
        color: rgb(153, 27, 27);
      }
      .gas-widget-very-high {
        background-color: rgba(239, 68, 68, 0.4);
        color: rgb(153, 27, 27);
      }
      
      /* Dark mode gas widget colors */
      @media (prefers-color-scheme: dark) {
        .gas-widget-very-low {
          background-color: rgba(74, 222, 128, 0.2);
          color: rgb(134, 239, 172);
        }
        .gas-widget-low {
          background-color: rgba(74, 222, 128, 0.3);
          color: rgb(134, 239, 172);
        }
        .gas-widget-medium {
          background-color: rgba(250, 204, 21, 0.3);
          color: rgb(253, 224, 71);
        }
        .gas-widget-high {
          background-color: rgba(248, 113, 113, 0.3);
          color: rgb(252, 165, 165);
        }
        .gas-widget-very-high {
          background-color: rgba(239, 68, 68, 0.4);
          color: rgb(252, 165, 165);
        }
      }
    `,
      }}
    />
  );
};

// Add some additional hook registrations to connect with the tracing API
function useTraceEventHandlers() {
  const {
    activeTraceResult,
    setActiveTraceResult,
    isTraceDebuggerOpen,
    setIsTraceDebuggerOpen,
  } = useTracing();
  const { currentFileFunctionCallResults } = useAppContext();

  // Log active trace info for debugging
  useEffect(() => {
    if (activeTraceResult && isTraceDebuggerOpen) {
      console.log(
        "Active trace in useTraceEventHandlers:",
        activeTraceResult.call,
      );
      console.log(
        "Source mapping available:",
        !!activeTraceResult.sourceMapping,
      );

      if (activeTraceResult.sourceMapping) {
        const { sourceContext } = activeTraceResult.sourceMapping;
        console.log("Source files:", Object.keys(sourceContext.sourceFiles));
        console.log(
          "Function mappings:",
          Object.keys(sourceContext.functionToSteps),
        );
      }
    }
  }, [activeTraceResult, isTraceDebuggerOpen]);

  // Make sure we have the latest trace results
  useEffect(() => {
    // If we already have an active trace but it's not in the current results,
    // clear it to prevent stale references
    if (
      activeTraceResult &&
      currentFileFunctionCallResults &&
      !currentFileFunctionCallResults.includes(activeTraceResult)
    ) {
      console.log("Clearing stale active trace reference");
      setActiveTraceResult(null);
    }
  }, [activeTraceResult, currentFileFunctionCallResults, setActiveTraceResult]);

  return { activeTraceResult, isTraceDebuggerOpen };
}

// Detailed trace step component to be displayed in the panel
const DetailedTraceStep: React.FC<{
  step: any;
  index: number;
  isHighlighted?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}> = ({ step, index, isHighlighted, onMouseEnter, onMouseLeave }) => {
  const [showStack, setShowStack] = useState(false);
  const opName = step.opName || "UNKNOWN";
  const gasCost = step.gas_cost !== undefined ? step.gas_cost : "n/a";

  // Enhanced operation classification
  const isStorageOp = opName === "SSTORE" || opName === "SLOAD";
  const isCallOp =
    opName === "CALL" || opName === "STATICCALL" || opName === "DELEGATECALL";

  // Get background color based on operation type
  const getBackgroundClass = () => {
    if (isHighlighted) return "bg-yellow-100 dark:bg-yellow-900/40";
    if (isStorageOp) return "bg-purple-50 dark:bg-purple-900/20";
    if (isCallOp) return "bg-amber-50 dark:bg-amber-900/20";
    return "";
  };

  return (
    <div
      className={`p-1.5 text-xs border-b ${getBackgroundClass()} transition-colors`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex items-center justify-between">
        <div className="font-medium flex items-center space-x-1">
          <span className="opacity-70">{index + 1}:</span>
          <span className="font-mono">{opName}</span>
        </div>
        <span className="text-[10px] font-mono bg-gray-100 dark:bg-gray-800/80 px-1 rounded">
          {gasCost} gas
        </span>
      </div>

      {/* Only show storage changes if available */}
      {step.storage_change && Object.keys(step.storage_change).length > 0 && (
        <div className="mt-1 py-0.5 px-1 bg-purple-50 dark:bg-purple-900/20 rounded text-[10px]">
          {Object.entries(step.storage_change).map(
            ([slot, value]: [string, any], i) => (
              <div
                key={i}
                className="font-mono flex items-center gap-1 overflow-hidden"
              >
                <span className="opacity-60">Slot:</span>
                <span className="text-purple-700 dark:text-purple-300">
                  {slot.substring(0, 10)}...
                </span>
                <span className="opacity-60">→</span>
                <span className="text-purple-800 dark:text-purple-200">
                  {typeof value === "string"
                    ? value.length > 10
                      ? value.substring(0, 10) + "..."
                      : value
                    : JSON.stringify(value)}
                </span>
              </div>
            ),
          )}
        </div>
      )}

      {/* Stack section with expand/collapse functionality */}
      {step.stack && step.stack.length > 0 && (
        <div className="mt-1">
          <div
            className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded px-1 py-0.5"
            onClick={() => setShowStack(!showStack)}
          >
            <span className="text-[10px] text-blue-600 dark:text-blue-400">
              {showStack ? "▼" : "▶"}
            </span>
            <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300">
              Stack ({step.stack.length})
            </span>
          </div>

          {/* Show full stack only when expanded */}
          {showStack && (
            <div className="ml-4 mt-1 flex flex-col gap-0.5 border-l border-gray-200 dark:border-gray-700 pl-2">
              {/* Map through stack in normal order (0 at top) */}
              {step.stack.slice(0, 15).map((item: string, i: number) => (
                <div key={i} className="flex items-center">
                  <span className="text-[9px] text-gray-500 dark:text-gray-400 w-6 text-right mr-1">
                    {i}:
                  </span>
                  <span className="text-[10px] font-mono bg-gray-50 dark:bg-gray-800/60 px-1 rounded overflow-hidden text-ellipsis max-w-[150px]">
                    {item}
                  </span>
                </div>
              ))}
              {step.stack.length > 15 && (
                <div className="text-[9px] text-gray-500 italic ml-2 mt-1">
                  + {step.stack.length - 15} more items
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const SolidityEditor: React.FC = () => {
  const { files, currentFile, setFiles, compilationResult } = useAppContext();
  const {
    activeTraceResult,
    isTraceDebuggerOpen,
    lineExecutionCounts,
    lineOpcodeCategories,
    highlightedLine,
    setHighlightedLine,
    currentFunction,
    setCurrentFunction,
    showOnlyCurrentFunction,
    setShowOnlyCurrentFunction,
    showGasHeatmap,
    setShowGasHeatmap,
  } = useTracing();
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const [copied, setCopied] = useState(false);
  const [decorations, setDecorations] = useState<string[]>([]);
  const [showDetailedPanel, setShowDetailedPanel] = useState(true);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [hoveredStepIndex, setHoveredStepIndex] = useState<number | null>(null);
  const [lineGasUsage, setLineGasUsage] = useState<Record<number, number>>({});
  const [gasWidgetIds, setGasWidgetIds] = useState<string[]>([]);
  const [showDeploymentGas, setShowDeploymentGas] = useState(false);
  const [showOnlyFunctionGas, setShowOnlyFunctionGas] = useState(true);

  const errors = compilationResult?.errors || [];

  const relevantErrors = useMemo(() => {
    return errors.filter((e) => e.severity !== "warning");
  }, [errors]);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    if (!currentFile) return;
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Create models for each file
    for (const file of files) {
      if (!monaco.editor.getModel(monaco.Uri.parse(`file:///${file.name}`))) {
        monaco.editor.createModel(
          file.content,
          "sol",
          monaco.Uri.parse(`file:///${file.name}`),
        );
      }
    }

    // Set the current model
    const currentModel = monaco.editor.getModel(
      monaco.Uri.parse(`file:///${currentFile.name}`),
    );
    if (currentModel) {
      editor.setModel(currentModel);
    }

    // Configure editor theme based on system preference
    const darkTheme = window.matchMedia("(prefers-color-scheme: dark)").matches;
    monaco.editor.defineTheme("systemTheme", {
      base: darkTheme ? "vs-dark" : "vs",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": darkTheme ? "#1f2937" : "#ffffff",
        "editor.foreground": darkTheme ? "#f9fafb" : "#111827",
        "editorLineNumber.foreground": darkTheme ? "#9ca3af" : "#6b7280",
        "editor.lineHighlightBackground": darkTheme ? "#374151" : "#f3f4f6",
      },
    });
    monaco.editor.setTheme("systemTheme");

    // Listen for system theme changes
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (event) => {
        const newDarkTheme = event.matches;
        monaco.editor.defineTheme("systemTheme", {
          base: newDarkTheme ? "vs-dark" : "vs",
          inherit: true,
          rules: [],
          colors: {
            "editor.background": newDarkTheme ? "#1f2937" : "#ffffff",
            "editor.foreground": newDarkTheme ? "#f9fafb" : "#111827",
            "editorLineNumber.foreground": newDarkTheme ? "#9ca3af" : "#6b7280",
            "editor.lineHighlightBackground": newDarkTheme
              ? "#374151"
              : "#f3f4f6",
          },
        });
        monaco.editor.setTheme("systemTheme");
      });
  };

  useEffect(() => {
    if (!currentFile) return;
    if (editorRef.current && monacoRef.current) {
      const currentModel = monacoRef.current.editor.getModel(
        monacoRef.current.Uri.parse(`file:///${currentFile.name}`),
      );
      if (currentModel) {
        editorRef.current.setModel(currentModel);
      }
    }
  }, [currentFile]);

  // Update editor decorations when trace information changes
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !currentFile) {
      return;
    }

    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor.getModel();

    if (!model) return;

    // Clear existing decorations
    const oldDecorations = decorations;

    // If there's no active trace or tracing is not visible, clear decorations and return
    if (!activeTraceResult || !isTraceDebuggerOpen) {
      setDecorations(model.deltaDecorations(oldDecorations, []));
      setLineGasUsage({}); // Clear line gas usage
      return;
    }

    // Create decorations for executed lines
    const newDecorations: any[] = [];

    // Get the steps for the active trace
    const { sourceMapping } = activeTraceResult;
    if (!sourceMapping) return;

    const { sourceContext } = sourceMapping;
    const { functionToSteps, lineToSteps } = sourceContext;

    // Find the function name from the result call with better error handling
    let functionName = "unknown";
    let fullyQualifiedFunctionName = "";

    try {
      // Extract function name, handling potential formatting issues
      const callName = activeTraceResult.call;
      if (callName) {
        const parenIndex = callName.indexOf("(");
        if (parenIndex > 0) {
          // Extract just the function name part before the parenthesis
          const fnNamePart = callName.substring(0, parenIndex);
          // If there's a dot (like in contract.function), take the part after the last dot
          const dotIndex = fnNamePart.lastIndexOf(".");
          functionName =
            dotIndex > 0 ? fnNamePart.substring(dotIndex + 1) : fnNamePart;
        } else {
          // No parenthesis, use the whole string
          const dotIndex = callName.lastIndexOf(".");
          functionName =
            dotIndex > 0 ? callName.substring(dotIndex + 1) : callName;
        }
      }
      console.log("Extracted function name:", functionName);

      // Look for the fully qualified function name in functionToSteps keys
      const functionKeys = Object.keys(functionToSteps);

      // First try exact match with function name
      for (const key of functionKeys) {
        if (key.endsWith(`:${functionName}`)) {
          fullyQualifiedFunctionName = key;
          console.log(
            "Found fully qualified function name:",
            fullyQualifiedFunctionName,
          );
          break;
        }
      }

      // If no match found, try case-insensitive match
      if (!fullyQualifiedFunctionName && functionName !== "unknown") {
        for (const key of functionKeys) {
          if (key.toLowerCase().endsWith(`:${functionName.toLowerCase()}`)) {
            fullyQualifiedFunctionName = key;
            console.log(
              "Found case-insensitive function match:",
              fullyQualifiedFunctionName,
            );
            break;
          }
        }
      }

      // If still no match but we only have one function call, just use that
      if (!fullyQualifiedFunctionName && functionKeys.length === 1) {
        fullyQualifiedFunctionName = functionKeys[0];
        functionName =
          fullyQualifiedFunctionName.split(":").pop() || functionName;
        console.log(
          "Using only available function:",
          fullyQualifiedFunctionName,
        );
      }
    } catch (error) {
      console.error("Error extracting function name:", error);
    }

    // Add extra logging to debug function ranges
    console.log(
      "All function ranges:",
      Object.entries(sourceContext.functionRanges).flatMap(([file, ranges]) =>
        ranges.map(
          (range) =>
            `${file}:${range.name} (lines ${range.line + 1}-${range.endLine + 1})`,
        ),
      ),
    );

    // Find only the steps for this function using the fully qualified name if available
    let functionSteps: any[] = [];

    if (
      fullyQualifiedFunctionName &&
      functionToSteps[fullyQualifiedFunctionName]
    ) {
      functionSteps = functionToSteps[fullyQualifiedFunctionName];
      console.log(
        `Found ${functionSteps.length} steps for function ${fullyQualifiedFunctionName}`,
      );
    } else {
      // Fallback to the old method if fully qualified name not found
      Object.entries(functionToSteps).forEach(([key, steps]) => {
        if (key.includes(`:${functionName}`)) {
          functionSteps = steps as any[];
          console.log(
            `Fallback: Found ${functionSteps.length} steps for function ${key}`,
          );
        }
      });
    }

    if (functionSteps.length === 0) {
      console.warn(`No steps found for function ${functionName}`);

      // Last resort: If we have source mapping but couldn't find steps, just try the first function
      if (Object.keys(functionToSteps).length > 0) {
        const firstKey = Object.keys(functionToSteps)[0];
        functionSteps = functionToSteps[firstKey];
        functionName = firstKey.split(":").pop() || functionName;
        console.log(
          `Last resort: Using first available function ${firstKey} with ${functionSteps.length} steps`,
        );
      }
    }

    // Look for the function in all source files if not found in the current file
    let functionRange = null;
    let functionFile = null;

    // First check if there's a function range for the exact name in the current file
    if (sourceContext.functionRanges[currentFile.name]) {
      functionRange = sourceContext.functionRanges[currentFile.name].find(
        (range) => range.name === functionName,
      );
      if (functionRange) {
        functionFile = currentFile.name;
        console.log(`Found function range in current file for ${functionName}`);
      }
    }

    // If not found, try a case-insensitive search in the current file
    if (!functionRange && sourceContext.functionRanges[currentFile.name]) {
      functionRange = sourceContext.functionRanges[currentFile.name].find(
        (range) => range.name.toLowerCase() === functionName.toLowerCase(),
      );
      if (functionRange) {
        functionFile = currentFile.name;
        console.log(
          `Found function range in current file using case-insensitive match for ${functionName}`,
        );
      }
    }

    // If still not found in current file, search in all files
    if (!functionRange) {
      for (const [file, ranges] of Object.entries(
        sourceContext.functionRanges,
      )) {
        // Exact match first
        let range = ranges.find((r) => r.name === functionName);

        // Try case-insensitive if exact match fails
        if (!range) {
          range = ranges.find(
            (r) => r.name.toLowerCase() === functionName.toLowerCase(),
          );
        }

        if (range) {
          functionRange = range;
          functionFile = file;
          console.log(`Found function range in ${file} for ${functionName}`);
          break;
        }
      }
    }

    // Use the found range if any
    let functionStartLine = Infinity;
    let functionEndLine = -1;

    if (functionRange && functionFile === currentFile.name) {
      functionStartLine = functionRange.line;
      functionEndLine = functionRange.endLine;

      console.log(
        `Found function ${functionName} in current file, lines ${functionStartLine + 1}-${functionEndLine + 1}`,
      );

      // Highlight the function range with a subtle background
      newDecorations.push({
        range: new monaco.Range(
          functionStartLine + 1,
          1,
          functionEndLine + 1,
          1,
        ),
        options: {
          isWholeLine: true,
          className: "active-function-range",
          inlineClassName: "active-function-range",
        },
      });
    } else {
      console.warn(
        `Function ${functionName} not found in current file ${currentFile.name}`,
      );
      if (functionRange && functionFile) {
        console.log(`Function found in ${functionFile} instead`);
      }

      // If we have steps but no range, try to extract the line range from the steps themselves
      if (functionSteps.length > 0 && currentFile.name) {
        const currentFileSteps = functionSteps.filter((step) => {
          return (
            step.sourceInfo &&
            !("unmapped" in step.sourceInfo) &&
            step.sourceInfo.filePath === currentFile.name
          );
        });

        console.log(
          `Found ${currentFileSteps.length} steps in current file from trace`,
        );

        if (currentFileSteps.length > 0) {
          // Get min and max line numbers from steps
          const lines = currentFileSteps
            .map((step) => step.sourceInfo.line)
            .filter((line) => typeof line === "number");

          if (lines.length > 0) {
            functionStartLine = Math.min(...lines);
            functionEndLine = Math.max(...lines);

            console.log(
              `Derived function range from steps: lines ${functionStartLine + 1}-${functionEndLine + 1}`,
            );

            // Highlight the derived function range
            newDecorations.push({
              range: new monaco.Range(
                functionStartLine + 1,
                1,
                functionEndLine + 1,
                1,
              ),
              options: {
                isWholeLine: true,
                className: "active-function-range",
                inlineClassName: "active-function-range",
              },
            });
          }
        }
      }
    }

    // Track line -> steps mapping for this function only
    const functionLineToSteps: Record<number, any[]> = {};

    // First try to use existing mappings from lineToSteps if available
    // Only if we're in the right file
    if (lineToSteps[currentFile.name]) {
      console.log(`Current file found in lineToSteps mapping`);
      const fileLineSteps = lineToSteps[currentFile.name];

      for (const [lineStr, steps] of Object.entries(fileLineSteps)) {
        const line = parseInt(lineStr, 10);

        // Get intersection of these steps with our function steps
        const relevantSteps = steps.filter((step) =>
          functionSteps.some((funcStep) => funcStep.pc === step.pc),
        );

        if (relevantSteps.length > 0) {
          functionLineToSteps[line] = relevantSteps;
        }
      }

      console.log(
        `Found ${Object.keys(functionLineToSteps).length} lines with steps from lineToSteps mapping`,
      );
    }

    // If we couldn't find any lines with steps, build the mapping directly from function steps
    if (Object.keys(functionLineToSteps).length === 0) {
      console.log(
        "Building line to steps mapping directly from function steps",
      );

      functionSteps.forEach((step: any) => {
        if (
          step.sourceInfo &&
          !("unmapped" in step.sourceInfo) &&
          step.sourceInfo.filePath === currentFile.name &&
          typeof step.sourceInfo.line === "number"
        ) {
          const { line } = step.sourceInfo;
          if (!functionLineToSteps[line]) {
            functionLineToSteps[line] = [];
          }
          functionLineToSteps[line].push(step);
        }
      });

      console.log(
        `Built mapping with ${Object.keys(functionLineToSteps).length} lines from function steps`,
      );
    }

    // Create background highlights for executed lines in this function
    for (const [lineStr, steps] of Object.entries(functionLineToSteps)) {
      const line = parseInt(lineStr, 10);

      // Skip lines outside of the function range
      if (line < functionStartLine || line > functionEndLine) {
        continue;
      }

      const count = steps.length;
      const categories = new Set<string>();
      steps.forEach((step: any) => {
        if (step.category) {
          categories.add(step.category);
        }
      });

      // Background for executed lines with different color intensities based on execution count
      let bgColor = "rgba(59, 130, 246, 0.1)"; // Default light blue

      // Different background colors based on operation categories
      const categoriesArray = Array.from(categories);
      if (categoriesArray.includes("STORAGE")) {
        bgColor = "rgba(99, 102, 241, 0.15)"; // Purple for storage operations
      } else if (categoriesArray.includes("JUMP")) {
        bgColor = "rgba(236, 72, 153, 0.1)"; // Pink for jumps
      } else if (categoriesArray.includes("CALL")) {
        bgColor = "rgba(234, 179, 8, 0.1)"; // Yellow for calls
      }

      // Add background highlight with hover tooltip for execution details
      newDecorations.push({
        range: new monaco.Range(line + 1, 1, line + 1, 1),
        options: {
          isWholeLine: true,
          className: `executed-line-${count > 10 ? "high" : count > 5 ? "medium" : "low"}`,
          inlineClassName: `executed-line-${count > 10 ? "high" : count > 5 ? "medium" : "low"}`,
          linesDecorationsClassName: `executed-line-gutter-${count > 10 ? "high" : count > 5 ? "medium" : "low"}`,
          overviewRuler: {
            color: bgColor,
            position: monaco.editor.OverviewRulerLane.Right,
          },
          minimap: {
            color: bgColor,
            position: monaco.editor.MinimapPosition.Inline,
          },
          stickiness:
            monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          // Add hover tooltip with execution details
          hoverMessage: [
            { value: `**Execution Details (${count} steps)**` },
            {
              value: `Opcodes: ${Array.from(new Set(steps.map((step) => step.opName).filter(Boolean))).join(", ")}`,
            },
            ...steps.slice(0, 3).map((step, idx) => {
              const opName = step.opName || "UNKNOWN";
              const gasCost =
                step.gas_cost !== undefined ? step.gas_cost : "n/a";
              const pc = step.pc !== undefined ? step.pc : "n/a";
              let message = `**Step ${idx + 1}**: ${opName} (PC:${pc}, Gas:${gasCost})`;

              // Add storage access info if available
              if (step.storage_change) {
                const storageAddr = Object.keys(step.storage_change)[0] || "";
                const storageVal = step.storage_change[storageAddr] || "";
                if (storageAddr && storageVal) {
                  message += ` Storage[${storageAddr.substring(0, 6)}...] = ${storageVal.substring(0, 6)}...`;
                }
              }

              // Add stack info if available (top few items)
              if (step.stack && step.stack.length > 0) {
                const topStack = step.stack.slice(-2); // Show top 2 stack items
                message += ` Stack[${topStack.map((s: string) => s.substring(0, 6) + "...").join(", ")}]`;
              }

              return { value: message };
            }),
            ...(steps.length > 3
              ? [{ value: `...and ${steps.length - 3} more steps` }]
              : []),
          ],
        },
      });

      // Add marginal execution info with summary
      newDecorations.push({
        range: new monaco.Range(line + 1, 1, line + 1, 1),
        options: {
          isWholeLine: true,
          after: {
            content: ` // ${count} steps (hover for details)`,
            inlineClassName: "execution-count-detail",
          },
          stickiness:
            monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
      });
    }

    // Add decoration for highlighted line (if any)
    if (highlightedLine !== null) {
      // Check if the highlighted line is in this function's range
      if (
        highlightedLine >= functionStartLine &&
        highlightedLine <= functionEndLine
      ) {
        newDecorations.push({
          range: new monaco.Range(
            highlightedLine + 1,
            1,
            highlightedLine + 1,
            1,
          ),
          options: {
            isWholeLine: true,
            className: "highlighted-execution-line",
            inlineClassName: "highlighted-execution-line",
            stickiness:
              monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          },
        });
      }
    }

    // Calculate total gas usage per line
    const newLineGasUsage: Record<number, number> = {};
    let maxGasUsageLine = 0;

    if (lineToSteps[currentFile.name] && showGasHeatmap) {
      // Now calculate gas usage, but only for the current function if specified
      Object.entries(lineToSteps[currentFile.name]).forEach(
        ([lineStr, steps]) => {
          const lineNum = parseInt(lineStr);

          // Filter steps to only include those from the current function
          const relevantSteps = steps.filter((step) => {
            if (showOnlyCurrentFunction && currentFunction) {
              return (
                step.sourceInfo &&
                "functionName" in step.sourceInfo &&
                step.sourceInfo.functionName === currentFunction
              );
            }
            return true; // If not filtering by function, include all steps
          });

          // Skip if no relevant steps after filtering
          if (relevantSteps.length === 0) {
            return;
          }

          // Sum the gas costs for this line
          const totalGasForLine = relevantSteps.reduce((sum, step) => {
            const gasCost = step.gas_cost || 0;
            return sum + gasCost;
          }, 0);

          // Only record lines with actual gas usage
          if (totalGasForLine > 0) {
            newLineGasUsage[lineNum] = totalGasForLine;

            // Track the highest gas usage
            if (totalGasForLine > maxGasUsageLine) {
              maxGasUsageLine = totalGasForLine;
            }
          }
        },
      );

      // Update the state with the new line gas usage
      setLineGasUsage(newLineGasUsage);
    } else {
      setLineGasUsage({}); // Clear line gas usage if gas heatmap is disabled
    }

    // Apply decorations
    setDecorations(model.deltaDecorations(oldDecorations, newDecorations));

    // Add debug logging for the editor decorations
    console.log(
      "Active trace result:",
      activeTraceResult ? `${activeTraceResult.call}` : "none",
    );
    console.log("Is trace debugger open:", isTraceDebuggerOpen);
    console.log("Function name extracted:", functionName);
    console.log("Function steps count:", functionSteps.length);
    console.log(
      "Function range found:",
      functionStartLine !== Infinity
        ? `Lines ${functionStartLine + 1}-${functionEndLine + 1}`
        : "No",
    );
    console.log(
      "Function line to steps:",
      Object.keys(functionLineToSteps).length
        ? Object.keys(functionLineToSteps).map(
            (line) =>
              `Line ${parseInt(line) + 1}: ${functionLineToSteps[parseInt(line)].length} steps`,
          )
        : "None",
    );
    console.log("Decorations created:", newDecorations.length);
  }, [
    activeTraceResult,
    isTraceDebuggerOpen,
    lineExecutionCounts,
    lineOpcodeCategories,
    highlightedLine,
    currentFile,
    showGasHeatmap,
    showOnlyCurrentFunction,
    currentFunction,
    showOnlyFunctionGas,
  ]);

  // Call this in the useEffect for content widgets
  useEffect(() => {
    if (
      !editorRef.current ||
      !monacoRef.current ||
      !currentFile ||
      !showGasHeatmap
    ) {
      return;
    }

    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor.getModel();

    if (!model) return;

    // Clear previous widgets
    gasWidgetIds.forEach((id) => {
      editor.removeContentWidget({ getId: () => id });
    });

    const newWidgetIds: string[] = [];

    // Add gas widgets if we have gas data
    if (Object.keys(lineGasUsage).length > 0) {
      const maxGas = Math.max(...Object.values(lineGasUsage));

      // Get the steps for each line
      const { sourceMapping } = activeTraceResult || {};
      const lineToSteps =
        sourceMapping?.sourceContext?.lineToSteps?.[currentFile.name] || {};

      // Create a direct mapping of lines to functions for more reliable filtering
      const lineToFunction: Record<number, string> = {};

      // First, map each line to its function
      Object.entries(lineToSteps).forEach(([lineStr, steps]) => {
        const lineNum = parseInt(lineStr);

        for (const step of steps) {
          if (
            step.sourceInfo &&
            "functionName" in step.sourceInfo &&
            step.sourceInfo.functionName
          ) {
            lineToFunction[lineNum] = step.sourceInfo.functionName;
            break;
          }
        }
      });

      console.log("Current function:", currentFunction);
      console.log("Line to function mapping:", lineToFunction);

      // Now strictly filter widgets by function
      Object.entries(lineGasUsage).forEach(([lineStr, gasUsage]) => {
        const lineNum = parseInt(lineStr);

        // Skip this line if it's not in the current function
        if (showOnlyCurrentFunction && currentFunction) {
          const lineFunction = lineToFunction[lineNum];

          if (!lineFunction || lineFunction !== currentFunction) {
            return; // Skip this line - it's not in the current function
          }
        }

        // Format and display the gas widget
        const formattedGas =
          gasUsage >= 1000
            ? `${(gasUsage / 1000).toFixed(1)}k`
            : gasUsage.toString();

        // Determine color class
        const gasRatio = gasUsage / maxGas;
        let gasClass = "";

        if (gasRatio < 0.1) {
          gasClass = "gas-widget-very-low";
        } else if (gasRatio < 0.25) {
          gasClass = "gas-widget-low";
        } else if (gasRatio < 0.5) {
          gasClass = "gas-widget-medium";
        } else if (gasRatio < 0.75) {
          gasClass = "gas-widget-high";
        } else {
          gasClass = "gas-widget-very-high";
        }

        const widgetId = `gas-widget-${lineNum}`;
        newWidgetIds.push(widgetId);

        const domNode = document.createElement("div");
        domNode.className = `gas-widget ${gasClass}`;
        domNode.innerHTML = `${formattedGas} gas`;

        editor.addContentWidget({
          getId: () => widgetId,
          getDomNode: () => domNode,
          getPosition: () => {
            return {
              position: {
                lineNumber: lineNum + 1,
                column: model.getLineMaxColumn(lineNum + 1),
              },
              preference: [monaco.editor.ContentWidgetPositionPreference.EXACT],
            };
          },
        });
      });
    }

    setGasWidgetIds(newWidgetIds);

    return () => {
      if (editor) {
        newWidgetIds.forEach((id) => {
          editor.removeContentWidget({ getId: () => id });
        });
      }
    };
  }, [
    lineGasUsage,
    showGasHeatmap,
    currentFile,
    activeTraceResult,
    showOnlyCurrentFunction,
    currentFunction,
  ]);

  // Add a handler to track editor selections and update the selected line
  useEffect(() => {
    if (!editorRef.current || !activeTraceResult || !isTraceDebuggerOpen) {
      return;
    }

    const editor = editorRef.current;

    // Add selection change listener
    const disposable = editor.onDidChangeCursorPosition((e: any) => {
      const lineNumber = e.position.lineNumber - 1; // Convert to 0-based
      setSelectedLine(lineNumber);

      // Also update the highlighted line in the context
      setHighlightedLine(lineNumber);
    });

    return () => {
      disposable.dispose();
    };
  }, [
    editorRef.current,
    activeTraceResult,
    isTraceDebuggerOpen,
    setHighlightedLine,
  ]);

  // Get steps for the currently selected line
  const getStepsForSelectedLine = useMemo(() => {
    if (
      !activeTraceResult ||
      !activeTraceResult.sourceMapping ||
      selectedLine === null ||
      !currentFile
    ) {
      return [];
    }

    const { sourceContext } = activeTraceResult.sourceMapping;
    const { lineToSteps } = sourceContext;

    if (
      !lineToSteps[currentFile.name] ||
      !lineToSteps[currentFile.name][selectedLine]
    ) {
      return [];
    }

    const allSteps = lineToSteps[currentFile.name][selectedLine];

    // Filter steps by current function if the filter is active
    let filteredSteps = allSteps;
    if (showOnlyCurrentFunction && currentFunction) {
      filteredSteps = allSteps.filter((step) => {
        // Use a type guard to check if sourceInfo has functionName
        if (step.sourceInfo && "functionName" in step.sourceInfo) {
          return step.sourceInfo.functionName === currentFunction;
        }
        return false;
      });

      console.log(
        `Filtered steps for function ${currentFunction}: ${filteredSteps.length} of ${allSteps.length}`,
      );
    }

    // Debug: Log detailed step information to see if SSTORE operations exist
    console.log(
      `Debug - All steps for line ${selectedLine + 1}:`,
      filteredSteps,
    );

    // Look specifically for SSTORE operations
    const sstoreSteps = filteredSteps.filter(
      (step) => step.opName === "SSTORE",
    );
    if (sstoreSteps.length > 0) {
      console.log("Found SSTORE operations:", sstoreSteps);
    } else {
      console.log("No SSTORE operations found in these steps");
    }

    return filteredSteps;
  }, [
    activeTraceResult,
    currentFile,
    selectedLine,
    currentFunction,
    showOnlyCurrentFunction,
  ]);

  const handleEditorChange = (value: string | undefined) => {
    if (!currentFile) return;
    setFiles(
      files.map((file) =>
        file.id === currentFile.id ? { ...file, content: value || "" } : file,
      ),
    );
  };

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Use the additional trace event handlers
  const {
    activeTraceResult: updatedActiveTraceResult,
    isTraceDebuggerOpen: updatedIsTraceDebuggerOpen,
  } = useTraceEventHandlers();

  // Trace integration effects
  useEffect(() => {
    if (!activeTraceResult || !activeTraceResult.sourceMapping) {
      return;
    }

    console.log("Active trace loaded:", activeTraceResult.call);

    // Ensure details panel is shown by default when a trace is loaded
    setShowDetailedPanel(true);

    // Update current function when trace changes
    if (activeTraceResult.call) {
      // Extract just the function name part
      const callName = activeTraceResult.call;
      const parenIndex = callName.indexOf("(");
      const dotIndex = callName.lastIndexOf(".");

      let functionName = callName;
      if (parenIndex > 0) {
        functionName = callName.substring(0, parenIndex);
      }
      if (dotIndex > 0) {
        functionName = functionName.substring(dotIndex + 1);
      }

      setCurrentFunction(functionName);
      console.log("Updated current function to:", functionName);
    }

    // Debug: Analyze all steps for SSTORE operations
    const { sourceContext } = activeTraceResult.sourceMapping;
    const allSteps = Object.values(
      sourceContext.functionToSteps,
    ).flat() as any[];

    // Find all SSTORE operations
    const sstoreOps = allSteps.filter((step) => step.opName === "SSTORE");
    console.log(
      `Found ${sstoreOps.length} SSTORE operations in the entire trace:`,
    );

    if (sstoreOps.length > 0) {
      sstoreOps.forEach((step, idx) => {
        console.log(`SSTORE #${idx + 1}:`, {
          pc: step.pc,
          line:
            step.sourceInfo?.line !== undefined
              ? step.sourceInfo.line + 1
              : "N/A",
          sourceInfo: step.sourceInfo,
          stack: step.stack,
          storage_change: step.storage_change || "No storage change recorded",
        });

        // If we have 2+ stack items, interpret what they mean for SSTORE
        if (step.stack && step.stack.length >= 2) {
          const storageSlot = step.stack[step.stack.length - 2];
          const valueToStore = step.stack[step.stack.length - 1];
          console.log(
            `  -> Storing value ${valueToStore} to slot ${storageSlot}`,
          );
        }
      });
    } else {
      console.log(
        "No SSTORE operations found. Available step types:",
        Array.from(new Set(allSteps.map((step) => step.opName))).sort(),
      );
    }

    // Check the sequence of steps around storage operations
    if (sstoreOps.length > 0) {
      // For the first SSTORE, show 3 steps before and after
      const firstSstore = sstoreOps[0];
      const sstoreIndex = allSteps.findIndex(
        (step) => step.pc === firstSstore.pc,
      );

      if (sstoreIndex >= 0) {
        const startIdx = Math.max(0, sstoreIndex - 3);
        const endIdx = Math.min(allSteps.length - 1, sstoreIndex + 3);

        console.log(
          `Execution sequence around first SSTORE (steps ${startIdx}-${endIdx}):`,
        );
        for (let i = startIdx; i <= endIdx; i++) {
          const step = allSteps[i];
          console.log(
            `  ${i === sstoreIndex ? "→" : " "} Step ${i}: ${step.opName} (PC: ${step.pc}, Line: ${step.sourceInfo?.line !== undefined ? step.sourceInfo.line + 1 : "N/A"})`,
          );
        }
      }
    }
  }, [activeTraceResult, setCurrentFunction]);

  // In the gas calculation logic, check if the step is from deployment or runtime
  const isDeploymentStep = (step: any) => {
    // Check if this step is from deployment bytecode
    // This could be based on PC range, function context, or other metadata
    return !step.sourceInfo || !step.sourceInfo.functionName;
  };

  // Add a helper function to check if a step is within a function context
  const isInFunctionContext = (step: any): boolean => {
    return (
      step.sourceInfo &&
      "functionName" in step.sourceInfo &&
      step.sourceInfo.functionName !== undefined &&
      step.sourceInfo.functionName !== ""
    );
  };

  // Make sure we preserve the step inspector state
  useEffect(() => {
    if (activeTraceResult && isTraceDebuggerOpen) {
      // Don't reset the panel state when a new trace is loaded
      setShowDetailedPanel(true);

      // Keep the current function selected if it exists in the new trace
      if (currentFunction) {
        const { sourceMapping } = activeTraceResult;
        if (sourceMapping?.sourceContext?.functionToSteps) {
          const functionNames = Object.keys(
            sourceMapping.sourceContext.functionToSteps,
          );
          const normalizedCurrentFn = currentFunction.includes("(")
            ? currentFunction.substring(0, currentFunction.indexOf("("))
            : currentFunction;

          // Check if the current function exists in the new trace
          const functionExists = functionNames.some((fn) => {
            const normalizedFn = fn.includes("(")
              ? fn.substring(0, fn.indexOf("("))
              : fn;
            return normalizedFn === normalizedCurrentFn;
          });

          // If the function doesn't exist in the new trace, find the main function
          if (!functionExists) {
            // Try to find the main function from the trace
            const mainFunction = functionNames.find(
              (fn) =>
                fn.endsWith(":main") ||
                fn.includes(".main") ||
                fn.endsWith(":constructor"),
            );

            if (mainFunction) {
              setCurrentFunction(mainFunction);
            }
          }
        }
      }
    }
  }, [activeTraceResult, isTraceDebuggerOpen]);

  // Ensure we're setting showOnlyCurrentFunction to true by default
  useEffect(() => {
    // Set default values when component mounts
    setShowOnlyCurrentFunction(true);
  }, []);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <EditorStyles />
      <div className="flex-grow bg-editor shadow-md overflow-hidden border border-color-editor">
        {currentFile?.address && (
          <div className="p-2 bg-editor-header flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center flex-grow">
              <span className="text-xs font-mono mr-2 text-secondary whitespace-nowrap">
                Contract:
              </span>
              <div className="flex items-center bg-editor-address border border-color-editor-address rounded-md overflow-hidden max-w-[220px]">
                <span className="text-xs font-mono px-2 py-1 text-primary truncate">
                  {currentFile.address}
                </span>
                <CopyToClipboard text={currentFile.address} onCopy={handleCopy}>
                  <button className="px-1.5 py-1 bg-editor-button hover:bg-editor-button-hover transition-colors text-xs border-l border-color-editor-address focus:outline-none focus:ring-2 focus:ring-accent flex-shrink-0">
                    {copied ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3.5 w-3.5 text-blue-500"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3.5 w-3.5 text-secondary"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                        <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                      </svg>
                    )}
                  </button>
                </CopyToClipboard>
              </div>

              <button
                onClick={() => setShowGasHeatmap(!showGasHeatmap)}
                className={`ml-3 text-xs px-2.5 py-1 rounded-md transition-colors border ${
                  showGasHeatmap
                    ? "bg-green-50 text-green-800 border-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800 dark:hover:bg-green-900/30"
                    : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3.5 w-3.5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    {showGasHeatmap ? (
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z"
                        clipRule="evenodd"
                      />
                    ) : (
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 9a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1zm3 0a1 1 0 00-1-1h-.01a1 1 0 100 2H11a1 1 0 001-1z"
                        clipRule="evenodd"
                      />
                    )}
                  </svg>
                  <span>
                    {showGasHeatmap ? "Hide Gas Usage" : "Show Gas Usage"}
                  </span>
                </div>
              </button>
            </div>

            {updatedActiveTraceResult && updatedIsTraceDebuggerOpen && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowDetailedPanel(!showDetailedPanel)}
                  className="text-xs px-3 py-1.5 flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded border border-blue-200 dark:border-blue-800 transition-colors"
                >
                  <span className="font-medium">
                    {updatedActiveTraceResult.call}
                  </span>
                  <span className="text-xs opacity-70">
                    {showDetailedPanel ? "◀" : "▶"}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        <div
          className={`${showDetailedPanel && isTraceDebuggerOpen ? "flex" : ""} h-full`}
        >
          <div
            className={`${showDetailedPanel && isTraceDebuggerOpen ? "w-3/4" : "w-full"} h-full`}
          >
            {currentFile &&
              (currentFile.content ? (
                <Editor
                  height="100%"
                  defaultLanguage="sol"
                  path={currentFile.name}
                  value={currentFile.content}
                  onChange={handleEditorChange}
                  onMount={handleEditorDidMount}
                  options={{
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 14,
                    lineNumbers: "on",
                    glyphMargin: false,
                    folding: true,
                    lineNumbersMinChars: 0,
                    overviewRulerBorder: false,
                    language: "sol",
                    fontFamily:
                      "'SF Mono', Menlo, Monaco, 'Courier New', monospace",
                    fontLigatures: true,
                    renderLineHighlight: "all",
                    cursorBlinking: "smooth",
                    smoothScrolling: true,
                    cursorSmoothCaretAnimation: "on",
                    padding: { bottom: 0, top: 5 },
                  }}
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-secondary">
                    This contract was loaded from bytecode. Source code is not
                    available.
                  </p>
                </div>
              ))}
          </div>

          {/* Streamlined detail panel - only show when both conditions are true */}
          {showDetailedPanel &&
            isTraceDebuggerOpen &&
            activeTraceResult &&
            activeTraceResult.sourceMapping && (
              <div className="w-1/4 h-full overflow-y-auto border-l border-gray-200 dark:border-gray-700 flex flex-col">
                <div className="bg-gray-100 dark:bg-gray-800 p-2 sticky top-0 z-20 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    <div className="flex items-center">
                      <span>
                        {updatedActiveTraceResult?.call || "Execution Steps"}
                      </span>
                      {selectedLine !== null && (
                        <span className="ml-1.5 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 px-1.5 py-0.5 rounded-sm">
                          Line {selectedLine + 1}
                        </span>
                      )}
                    </div>
                  </h3>

                  {selectedLine === null && (
                    <div className="text-xs text-gray-500 mt-1">
                      Click a highlighted line to view execution details
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto pb-8">
                  {selectedLine !== null &&
                    getStepsForSelectedLine.length > 0 && (
                      <>
                        {/* Compact gas usage summary */}
                        <div className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 text-xs sticky top-0 z-10">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              Gas:
                            </span>
                            <span className="font-mono bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded text-blue-700 dark:text-blue-300">
                              {getStepsForSelectedLine
                                .reduce(
                                  (sum, step) => sum + (step.gas_cost || 0),
                                  0,
                                )
                                .toLocaleString()}
                            </span>
                          </div>
                          <div className="text-gray-500 dark:text-gray-400">
                            {getStepsForSelectedLine.length} step
                            {getStepsForSelectedLine.length !== 1 ? "s" : ""}
                          </div>
                        </div>

                        {/* Execution steps with bottom padding */}
                        <div className="pb-16">
                          {getStepsForSelectedLine.map((step, index) => (
                            <DetailedTraceStep
                              key={index}
                              step={step}
                              index={index}
                              isHighlighted={hoveredStepIndex === index}
                              onMouseEnter={() => setHoveredStepIndex(index)}
                              onMouseLeave={() => setHoveredStepIndex(null)}
                            />
                          ))}
                          {/* Add invisible element at the bottom to ensure scrollability */}
                          <div className="h-8" aria-hidden="true"></div>
                        </div>
                      </>
                    )}
                  {selectedLine !== null &&
                    getStepsForSelectedLine.length === 0 && (
                      <div className="p-3 text-xs text-gray-500 italic">
                        No execution steps were found for line{" "}
                        {selectedLine + 1}. This line may not be executed
                        directly or might be a declaration.
                      </div>
                    )}
                </div>
              </div>
            )}
        </div>
      </div>
      {relevantErrors.length > 0 && (
        <div className="flex-shrink-0">
          <CompileErrorDisplay errors={relevantErrors} />
        </div>
      )}
    </div>
  );
};

export default SolidityEditor;
