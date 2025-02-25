import type React from "react";
import type { FunctionCallResult } from "../types";

interface TraceDisplayProps {
  traces: FunctionCallResult["traces"];
}

interface TraceNode {
  trace: FunctionCallResult["traces"]["arena"][0];
  children: TraceNode[];
}

const TraceDisplay: React.FC<TraceDisplayProps> = ({ traces }) => {
  if (!traces || !traces.arena || traces.arena.length === 0) return null;

  const buildTraceTree = (arena: typeof traces.arena): TraceNode[] => {
    const nodeMap = new Map<number, TraceNode>();
    const rootNodes: TraceNode[] = [];

    // Create nodes for all traces
    arena.forEach((trace) => {
      nodeMap.set(trace.idx, { trace, children: [] });
    });

    // Build the tree structure
    arena.forEach((trace) => {
      const node = nodeMap.get(trace.idx)!;
      if (trace.parent === null) {
        rootNodes.push(node);
      } else {
        const parentNode = nodeMap.get(trace.parent);
        if (parentNode) {
          parentNode.children.push(node);
        }
      }
    });

    return rootNodes;
  };

  const renderTraceNode = (node: TraceNode, depth = 0) => {
    const { trace } = node;

    return (
      <div
        key={trace.idx}
        className="font-mono text-sm"
        style={{ marginLeft: `${depth * 20}px` }}
      >
        <div>
          [{trace.idx}] {trace.trace.kind} {trace.trace.address}
        </div>
        <div className="ml-4">├─ Gas used: {trace.trace.gas_used}</div>
        <div className="ml-4">├─ Status: {trace.trace.status}</div>
        {trace.trace.data && (
          <div className="ml-4">├─ Data: {trace.trace.data}</div>
        )}
        {node.children.map((child) => renderTraceNode(child, depth + 1))}
        {trace.trace.output && (
          <div className="ml-4 mt-2">
            <span className="text-yellow-400">└─ Output: </span>
            <span className="text-green-400">{trace.trace.output}</span>
          </div>
        )}
      </div>
    );
  };

  const traceTree = buildTraceTree(traces.arena);

  return (
    <div className="mt-4 p-4 bg-gray-800 text-green-400 rounded overflow-x-auto whitespace-pre">
      {traceTree.map((node) => renderTraceNode(node))}
    </div>
  );
};

export default TraceDisplay;
