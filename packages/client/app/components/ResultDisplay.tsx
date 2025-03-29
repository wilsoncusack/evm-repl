import { useState } from "react";
import TraceDisplay from "./TraceDispaly";
import { FunctionCallResult } from "../types";
import { useAppContext } from "../hooks/useAppContext";
import { decodeRevertData } from "../utils/decodeRevertData";
import TraceDebugger from "./TraceDebugger";
import { EnhancedFunctionCallResult } from "../types/sourceMapping";
import { useTracing } from "../hooks/useTracing";

interface ResultDisplayProps {
  result: EnhancedFunctionCallResult;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ result }) => {
  const { currentFileCompilationResult } = useAppContext();
  const { 
    setActiveTraceResult, 
    activeTraceResult,
    setIsTraceDebuggerOpen,
    isTraceDebuggerOpen
  } = useTracing();
  const [showTraces, setShowTraces] = useState(false);
  const [showTraceDebugger, setShowTraceDebugger] = useState(false);

  // Check if this trace is currently active in the editor
  const isActiveInEditor = activeTraceResult === result;

  // Toggle this trace in the editor with logging
  const toggleTraceInEditor = () => {
    if (isActiveInEditor) {
      console.log('Deactivating trace in editor');
      setActiveTraceResult(null);
      setIsTraceDebuggerOpen(false);
    } else {
      console.log('Activating trace in editor:', result.call);
      console.log('Source mapping available:', !!result.sourceMapping);
      
      // Log some details about the source mapping if available
      if (result.sourceMapping) {
        const { sourceContext } = result.sourceMapping;
        console.log('Source files:', Object.keys(sourceContext.sourceFiles));
        console.log('Function mappings:', Object.keys(sourceContext.functionToSteps).join(', '));
        
        // Examine full trace for SSTORE operations
        const allSteps = Object.values(sourceContext.functionToSteps)
          .flat() as any[];
        
        console.log(`Total execution steps: ${allSteps.length}`);
        
        // Find all SSTORE operations in the trace
        const sstoreOps = allSteps.filter(step => step.opName === 'SSTORE');
        console.log(`Found ${sstoreOps.length} SSTORE operations in total:`, sstoreOps);
        
        // Check the line mapping for all steps
        const lineToStepsEntries = Object.entries(sourceContext.lineToSteps);
        console.log('Line to steps mapping structure:', 
          lineToStepsEntries.map(([file, lineMap]) => 
            `${file}: ${Object.keys(lineMap).length} lines mapped`
          )
        );
      }
      
      setActiveTraceResult(result);
      setIsTraceDebuggerOpen(true);
    }
  };

  // Check if the transaction reverted
  const hasReverted = () => {
    if (!result.traces || !result.traces.arena) return false;

    // Check if any trace has reverted
    return result.traces.arena.some(
      (item) => item.trace.status === "Revert" || item.trace.success === false,
    );
  };

  // Find the revert data in the trace if the transaction reverted
  const getRevertReason = () => {
    if (!result.traces || !result.traces.arena) {
      return "Transaction reverted";
    }

    // Look for the revert in the trace
    const revertTrace = result.traces.arena.find(
      (item) => item.trace.status === "Revert" || item.trace.success === false,
    );

    if (revertTrace) {
      // Only try to decode if we have compilation results
      if (currentFileCompilationResult?.abi) {
        try {
          return decodeRevertData(
            revertTrace.trace.data,
            revertTrace.trace.output,
            currentFileCompilationResult.abi,
          );
        } catch (error) {
          console.error("Failed to decode revert data:", error);
          return `Transaction reverted with output: ${revertTrace.trace.output}`;
        }
      } else {
        // If we don't have an ABI, just show the raw output
        return `Transaction reverted with output: ${revertTrace.trace.output}`;
      }
    }

    return "Transaction reverted";
  };

  const isReverted = hasReverted();

  return (
    <div
      className={`p-4 rounded-md ${
        isReverted ? "bg-error-bg" : "bg-success-bg"
      }`}
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-bold">
            <span
              className={`${isReverted ? "text-error" : "text-success"}`}
            >
              {isReverted ? "Reverted" : "Success"}
            </span>
            <span className="ml-2 text-base font-normal text-primary">
              {result.call}
            </span>
          </h3>

          <div className="mt-2 font-mono text-sm">
            <div>
              <span className="text-secondary">Gas Used:</span>{" "}
              <span className="text-primary">{result.gasUsed}</span>
            </div>
            <div>
              <span className="text-secondary">Result:</span>{" "}
              <span className="text-primary overflow-hidden overflow-ellipsis">
                {isReverted ? getRevertReason() : result.response}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <span className="text-sm font-semibold text-secondary">Logs:</span>
        {result.logs?.map((log, i) => (
          <div key={i} className="ml-5 p-2 bg-warning-bg rounded-md">
            <span className="font-mono text-sm text-warning">
              {log.eventName}
            </span>
            <span className="font-mono text-xs text-warning-secondary">
              (
              {Array.isArray(log.args)
                ? log.args.join(", ")
                : log.args
                  ? Object.entries(log.args)
                      .map(([key, value]) => `${key}: ${value}`)
                      .join(", ")
                  : ""}
              )
            </span>
          </div>
        ))}

        {!result.logs &&
          result.rawLogs.map((log, i) => (
            <div key={i} className="ml-5 p-2 bg-warning-bg rounded-md">
              <span className="font-mono text-sm text-warning">
                <p>address: {log.address}</p>
                <p>topics: {log.topics}</p>
                <p>data: {log.data}</p>
              </span>
            </div>
          ))}
      </div>
      
      <div className="mt-4 space-x-2 flex flex-wrap">
        {result.traces && (
          <button
            type="button"
            onClick={() => setShowTraces(!showTraces)}
            className="px-2 py-1 bg-accent text-white rounded hover:bg-accent-hover transition-colors mb-2"
          >
            {showTraces ? "Hide Basic Traces" : "Show Basic Traces"}
          </button>
        )}
        
        {result.sourceMapping && (
          <button
            type="button"
            onClick={() => setShowTraceDebugger(!showTraceDebugger)}
            className="px-2 py-1 bg-accent text-white rounded hover:bg-accent-hover transition-colors mb-2"
          >
            {showTraceDebugger ? "Hide Source Trace Debugger" : "Show Source Trace Debugger"}
          </button>
        )}
        
        {result.sourceMapping && (
          <button
            type="button"
            onClick={toggleTraceInEditor}
            className={`px-2 py-1 ${isActiveInEditor ? 'bg-success' : 'bg-accent'} text-white rounded hover:bg-accent-hover transition-colors mb-2`}
          >
            {isActiveInEditor ? "Hide Trace in Editor" : "Show Trace in Editor"}
          </button>
        )}

        {showTraces && <TraceDisplay traces={result.traces} />}
        
        {showTraceDebugger && result.sourceMapping && (
          <TraceDebugger result={result} />
        )}
      </div>
    </div>
  );
};

export default ResultDisplay;
