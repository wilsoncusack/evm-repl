import { useState } from "react";
import TraceDisplay from "./TraceDispaly";
import { FunctionCallResult } from "../types";
import { useAppContext } from "../hooks/useAppContext";
import { decodeRevertData } from "../utils/decodeRevertData";

interface ResultDisplayProps {
  result: FunctionCallResult;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ result }) => {
  const { currentFileCompilationResult } = useAppContext();
  const [showTraces, setShowTraces] = useState(false);

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
    <div className="p-4 bg-gray-50 border-t border-gray-200 space-y-3">
      <div className="flex items-baseline">
        <span className="text-sm font-semibold text-gray-600 w-20">
          {isReverted ? "Reverted:" : "Returned:"}
        </span>
        {!isReverted ? (
          <span className="font-mono text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
            {result.response}
          </span>
        ) : (
          <span className="font-mono text-sm text-red-600 bg-red-50 px-2 py-1 rounded">
            {getRevertReason()}
          </span>
        )}
      </div>

      <div className="flex items-baseline">
        <span className="text-sm font-semibold text-gray-600 w-20">
          Gas used:
        </span>
        <span className="font-mono text-sm text-green-600">
          {result.gasUsed}
        </span>
      </div>

      <div className="space-y-1">
        <span className="text-sm font-semibold text-gray-600">Logs:</span>
        {result.logs?.map((log, i) => (
          <div key={i} className="ml-5 p-2 bg-yellow-50 rounded-md">
            <span className="font-mono text-sm text-yellow-700">
              {log.eventName}
            </span>
            <span className="font-mono text-xs text-yellow-600">
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
            <div key={i} className="ml-5 p-2 bg-yellow-50 rounded-md">
              <span className="font-mono text-sm text-yellow-700">
                <p>address: {log.address}</p>
                <p>topics: {log.topics}</p>
                <p>data: {log.data}</p>
              </span>
            </div>
          ))}
      </div>
      {result.traces && (
        <div>
          <button
            type="button"
            onClick={() => setShowTraces(!showTraces)}
            className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            {showTraces ? "Hide Traces" : "Show Traces"}
          </button>

          {showTraces && <TraceDisplay traces={result.traces} />}
        </div>
      )}
    </div>
  );
};

export default ResultDisplay;
