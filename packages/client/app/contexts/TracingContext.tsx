"use client";

import { createContext, useState, ReactNode, useEffect } from "react";
import { EnhancedFunctionCallResult } from "../types/sourceMapping";

interface TracingContextValue {
  activeTraceResult: EnhancedFunctionCallResult | null;
  setActiveTraceResult: (result: EnhancedFunctionCallResult | null) => void;
  isTraceDebuggerOpen: boolean;
  setIsTraceDebuggerOpen: (isOpen: boolean) => void;
  highlightedLine: number | null;
  setHighlightedLine: (line: number | null) => void;
  highlightedStepIndex: number | null;
  setHighlightedStepIndex: (index: number | null) => void;
  // Map from line number to execution count for current file
  lineExecutionCounts: Record<number, number>;
  // Map from line number to a list of opcode categories that were executed on that line
  lineOpcodeCategories: Record<number, Set<string>>;
}

export const TracingContext = createContext<TracingContextValue>({
  activeTraceResult: null,
  setActiveTraceResult: () => {},
  isTraceDebuggerOpen: false,
  setIsTraceDebuggerOpen: () => {},
  highlightedLine: null,
  setHighlightedLine: () => {},
  highlightedStepIndex: null,
  setHighlightedStepIndex: () => {},
  lineExecutionCounts: {},
  lineOpcodeCategories: {},
});

interface TracingProviderProps {
  children: ReactNode;
}

export const TracingProvider: React.FC<TracingProviderProps> = ({ children }) => {
  const [activeTraceResultInternal, setActiveTraceResultInternal] = useState<EnhancedFunctionCallResult | null>(null);
  const [isTraceDebuggerOpenInternal, setIsTraceDebuggerOpenInternal] = useState(false);
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null);
  const [highlightedStepIndex, setHighlightedStepIndex] = useState<number | null>(null);
  const [lineExecutionCounts, setLineExecutionCounts] = useState<Record<number, number>>({});
  const [lineOpcodeCategories, setLineOpcodeCategories] = useState<Record<number, Set<string>>>({});

  // Update line execution counts when active trace result changes
  useEffect(() => {
    if (!activeTraceResultInternal || !activeTraceResultInternal.sourceMapping) {
      setLineExecutionCounts({});
      setLineOpcodeCategories({});
      return;
    }

    const { sourceContext } = activeTraceResultInternal.sourceMapping;
    const counts: Record<number, number> = {};
    const categories: Record<number, Set<string>> = {};

    // Process all steps to build execution counts and opcode categories by line
    Object.entries(sourceContext.lineToSteps).forEach(([filePath, lineSteps]) => {
      Object.entries(lineSteps).forEach(([lineStr, steps]) => {
        const lineNum = parseInt(lineStr, 10);
        counts[lineNum] = steps.length;
        
        // Collect all categories of opcodes executed on this line
        categories[lineNum] = new Set<string>();
        steps.forEach(step => {
          if (step.category) {
            categories[lineNum].add(step.category);
          }
        });
      });
    });

    setLineExecutionCounts(counts);
    setLineOpcodeCategories(categories);
  }, [activeTraceResultInternal]);

  // Wrapper function for setting active trace with logging
  const setActiveTraceResult = (result: EnhancedFunctionCallResult | null) => {
    console.log('TracingContext: Setting active trace result:', result ? result.call : 'null');
    setActiveTraceResultInternal(result);
    
    // Automatically open debugger when setting a trace
    if (result && !isTraceDebuggerOpenInternal) {
      console.log('TracingContext: Automatically opening trace debugger');
      setIsTraceDebuggerOpenInternal(true);
    }
  };

  // Wrapper function for setting debugger visibility with logging
  const setIsTraceDebuggerOpen = (isOpen: boolean) => {
    console.log('TracingContext: Setting isTraceDebuggerOpen:', isOpen);
    setIsTraceDebuggerOpenInternal(isOpen);
    
    // Automatically clear trace when closing debugger
    if (!isOpen && activeTraceResultInternal) {
      console.log('TracingContext: Automatically clearing active trace on debugger close');
      setActiveTraceResultInternal(null);
    }
  };

  // Provide the context value
  const contextValue: TracingContextValue = {
    activeTraceResult: activeTraceResultInternal,
    setActiveTraceResult,
    isTraceDebuggerOpen: isTraceDebuggerOpenInternal,
    setIsTraceDebuggerOpen,
    highlightedLine,
    setHighlightedLine,
    highlightedStepIndex,
    setHighlightedStepIndex,
    lineExecutionCounts,
    lineOpcodeCategories,
  };

  return (
    <TracingContext.Provider value={contextValue}>
      {children}
    </TracingContext.Provider>
  );
}; 