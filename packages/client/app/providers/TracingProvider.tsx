import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
} from "react";
import { useAppContext } from "../hooks/useAppContext";

// Define the context type
interface TracingContextType {
  activeTraceResult: any | null;
  setActiveTraceResult: (result: any | null) => void;
  currentFunction: string | null;
  setCurrentFunction: (fn: string | null) => void;
  highlightedLine: number | null;
  setHighlightedLine: (line: number | null) => void;
  showOnlyCurrentFunction: boolean;
  setShowOnlyCurrentFunction: (show: boolean) => void;
  showGasHeatmap: boolean;
  setShowGasHeatmap: (show: boolean) => void;
  lineExecutionCounts: Record<number, number>;
  lineOpcodeCategories: Record<number, string[]>;
}

// Create the context
const TracingContext = createContext<TracingContextType | undefined>(undefined);

// Create the provider
export const TracingProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const {
    currentFileFunctionCallResults,
    activeTraceId,
    currentFile,
    filesFunctionCalls,
  } = useAppContext();

  // Local state
  const [activeTraceResult, setActiveTraceResult] = useState<any | null>(null);
  const [currentFunction, setCurrentFunction] = useState<string | null>(null);
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null);
  const [showOnlyCurrentFunction, setShowOnlyCurrentFunction] = useState(true);
  const [showGasHeatmap, setShowGasHeatmap] = useState(true);
  const [lineExecutionCounts, setLineExecutionCounts] = useState<
    Record<number, number>
  >({});
  const [lineOpcodeCategories, setLineOpcodeCategories] = useState<
    Record<number, string[]>
  >({});

  // Update active trace result when activeTraceId changes
  useEffect(() => {
    if (!activeTraceId || !currentFileFunctionCallResults || !currentFile)
      return;

    const result = currentFileFunctionCallResults.find((r, idx) => {
      const call = filesFunctionCalls[currentFile.id]?.[idx];
      return call && (call as any).id === activeTraceId;
    });

    if (result) {
      setActiveTraceResult(result);

      // Also update the current function if available
      if (result.call) {
        const functionName = result.call.split("(")[0];
        setCurrentFunction(functionName);
      }
    }
  }, [
    activeTraceId,
    currentFileFunctionCallResults,
    currentFile,
    filesFunctionCalls,
  ]);

  // Context value
  const value = {
    activeTraceResult,
    setActiveTraceResult,
    currentFunction,
    setCurrentFunction,
    highlightedLine,
    setHighlightedLine,
    showOnlyCurrentFunction,
    setShowOnlyCurrentFunction,
    showGasHeatmap,
    setShowGasHeatmap,
    lineExecutionCounts,
    lineOpcodeCategories,
  };

  return (
    <TracingContext.Provider value={value}>{children}</TracingContext.Provider>
  );
};

// Create the hook
export const useTracing = () => {
  const context = useContext(TracingContext);
  if (context === undefined) {
    throw new Error("useTracing must be used within a TracingProvider");
  }
  return context;
};
