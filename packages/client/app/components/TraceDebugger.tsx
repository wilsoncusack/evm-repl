"use client";

import React, { useState, useEffect } from "react";
import { EnhancedFunctionCallResult, EnhancedTraceStep } from "../types/sourceMapping";
import { useTracing } from "../hooks/useTracing";

interface TraceDebuggerProps {
  result: EnhancedFunctionCallResult;
}

/**
 * Debug component to visualize and verify the source-to-trace mapping
 */
const TraceDebugger: React.FC<TraceDebuggerProps> = ({ result }) => {
  const { setHighlightedLine, setHighlightedStepIndex } = useTracing();
  const [activeTab, setActiveTab] = useState<'overview' | 'functions' | 'sourceLine' | 'steps'>('overview');
  const [selectedFunction, setSelectedFunction] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  
  // Clear highlight when component unmounts
  useEffect(() => {
    return () => {
      setHighlightedLine(null);
      setHighlightedStepIndex(null);
    };
  }, [setHighlightedLine, setHighlightedStepIndex]);
  
  if (!result.sourceMapping) {
    return (
      <div className="p-4 bg-gray-800 text-red-400 rounded">
        No source mapping available for this execution result.
      </div>
    );
  }
  
  const { sourceContext, enhancedTraces } = result.sourceMapping;
  
  // Type guard to check if sourceInfo has mappings or is unmapped
  const isMappedSourceInfo = (sourceInfo: any): sourceInfo is {
    filePath: string;
    offset: number;
    length: number;
    line: number;
    column: number;
    lineIndex?: number;
    jumpType: string;
    sourceLine: string;
    functionName?: string;
    isOutOfBounds?: boolean;
    isDuplicate?: boolean;
    unmapped?: boolean;
  } => {
    return sourceInfo && 'line' in sourceInfo && !('unmapped' in sourceInfo);
  };
  
  // Type guard for unmapped source info
  const isUnmappedSourceInfo = (sourceInfo: any): sourceInfo is {
    unmapped: true;
    pc: number;
  } => {
    return sourceInfo && 'unmapped' in sourceInfo;
  };
  
  // Handle mouse over for steps - highlight the corresponding source line
  const handleStepMouseEnter = (step: EnhancedTraceStep, index: number) => {
    if (step.sourceInfo && isMappedSourceInfo(step.sourceInfo)) {
      setHighlightedLine(step.sourceInfo.line);
      setHighlightedStepIndex(index);
    }
  };
  
  // Handle mouse leave - clear highlight
  const handleStepMouseLeave = () => {
    setHighlightedLine(null);
    setHighlightedStepIndex(null);
  };
  
  const renderOverview = () => (
    <div>
      <h3 className="text-lg font-semibold mb-2">Overview</h3>
      
      <div className="mb-4">
        <h4 className="text-md font-semibold">Source Files:</h4>
        <ul className="list-disc pl-5">
          {Object.keys(sourceContext.sourceFiles).map(file => (
            <li key={file}>
              {file} ({sourceContext.sourceFiles[file].split('\n').length} lines)
            </li>
          ))}
        </ul>
      </div>
      
      <div className="mb-4">
        <h4 className="text-md font-semibold">Functions Detected:</h4>
        <ul className="list-disc pl-5">
          {Object.entries(sourceContext.functionRanges).flatMap(([file, ranges]) => 
            ranges.map(range => (
              <li key={`${file}:${range.name}`}>
                {range.name} in {file} (lines {range.line+1}-{range.endLine+1})
              </li>
            ))
          )}
        </ul>
      </div>
      
      <div className="mb-4">
        <h4 className="text-md font-semibold">Execution Summary:</h4>
        <ul className="list-disc pl-5">
          <li>Total Trace Steps: {getTotalSteps()}</li>
          <li>Steps Mapped to Source: {getSourceMappedSteps()}</li>
          <li>Unmapped Steps: {getTotalSteps() - getSourceMappedSteps()}</li>
          <li>Steps with Out-of-Bounds Offsets: {getOutOfBoundsSteps()}</li>
          <li>Duplicate Source Mappings: {getDuplicateSteps()}</li>
          <li>Gas Used: {result.gasUsed}</li>
          <li>Response: {result.response}</li>
        </ul>
      </div>
      
      <div className="mb-4">
        <h4 className="text-md font-semibold">Source Map Stats:</h4>
        <ul className="list-disc pl-5">
          <li>PC to Source Map Size: {sourceContext.pcToSource.size} entries</li>
          <li>Source Files: {Object.keys(sourceContext.sourceFiles).length} files</li>
          <li>Functions: {Object.values(sourceContext.functionRanges).flat().length} functions</li>
        </ul>
      </div>
    </div>
  );
  
  const renderFunctionView = () => {
    const functionKeys = Object.keys(sourceContext.functionToSteps);
    
    return (
      <div>
        <h3 className="text-lg font-semibold mb-2">Functions</h3>
        
        <div className="mb-4">
          <select 
            className="bg-gray-700 text-white p-2 rounded w-full"
            value={selectedFunction || ""}
            onChange={(e) => setSelectedFunction(e.target.value || null)}
          >
            <option value="">Select a function</option>
            {functionKeys.map(key => (
              <option key={key} value={key}>
                {key.split(':').pop()} ({sourceContext.functionToSteps[key].length} steps)
              </option>
            ))}
          </select>
        </div>
        
        {selectedFunction && (
          <div>
            <h4 className="text-md font-semibold">Steps in function {selectedFunction.split(':').pop()}:</h4>
            <div className="overflow-x-auto mt-2">
              <table className="min-w-full bg-gray-700 text-sm">
                <thead>
                  <tr className="bg-gray-600">
                    <th className="p-2 text-left">#</th>
                    <th className="p-2 text-left">PC</th>
                    <th className="p-2 text-left">Opcode</th>
                    <th className="p-2 text-left">Gas</th>
                    <th className="p-2 text-left">Line</th>
                    <th className="p-2 text-left">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {sourceContext.functionToSteps[selectedFunction].map((step, idx) => (
                    <tr key={idx} className="border-t border-gray-600">
                      <td className="p-2">{idx}</td>
                      <td className="p-2">{step.pc}</td>
                      <td className="p-2 font-mono">{step.opName}</td>
                      <td className="p-2">{step.gas_used}</td>
                      <td className="p-2">{step.sourceInfo?.line !== undefined ? step.sourceInfo.line + 1 : 'N/A'}</td>
                      <td className="p-2 font-mono truncate max-w-xs">{step.sourceInfo?.sourceLine || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  const renderSourceLineView = () => {
    const fileKeys = Object.keys(sourceContext.lineToSteps);
    
    return (
      <div>
        <h3 className="text-lg font-semibold mb-2">Source Lines</h3>
        
        <div className="mb-4">
          <select 
            className="bg-gray-700 text-white p-2 rounded w-full mb-2"
            value={selectedFile || ""}
            onChange={(e) => {
              setSelectedFile(e.target.value || null);
              setSelectedLine(null);
            }}
          >
            <option value="">Select a file</option>
            {fileKeys.map(file => (
              <option key={file} value={file}>{file}</option>
            ))}
          </select>
          
          {selectedFile && (
            <select 
              className="bg-gray-700 text-white p-2 rounded w-full"
              value={selectedLine !== null ? selectedLine.toString() : ""}
              onChange={(e) => setSelectedLine(e.target.value ? parseInt(e.target.value) : null)}
            >
              <option value="">Select a line</option>
              {Object.keys(sourceContext.lineToSteps[selectedFile]).map(line => (
                <option key={line} value={line}>
                  Line {parseInt(line) + 1} ({sourceContext.lineToSteps[selectedFile][parseInt(line)].length} steps)
                </option>
              ))}
            </select>
          )}
        </div>
        
        {selectedFile && selectedLine !== null && (
          <div>
            <h4 className="text-md font-semibold">
              Source: Line {selectedLine + 1} in {selectedFile.split('/').pop()}
            </h4>
            <pre className="bg-gray-900 p-2 rounded font-mono text-sm overflow-x-auto mt-2">
              {sourceContext.lineToSteps[selectedFile][selectedLine][0]?.sourceInfo?.sourceLine || 'No source line found'}
            </pre>
            
            <h4 className="text-md font-semibold mt-4">Steps executing this line:</h4>
            <div className="overflow-x-auto mt-2">
              <table className="min-w-full bg-gray-700 text-sm">
                <thead>
                  <tr className="bg-gray-600">
                    <th className="p-2 text-left">#</th>
                    <th className="p-2 text-left">PC</th>
                    <th className="p-2 text-left">Opcode</th>
                    <th className="p-2 text-left">Gas</th>
                    <th className="p-2 text-left">Function</th>
                  </tr>
                </thead>
                <tbody>
                  {sourceContext.lineToSteps[selectedFile][selectedLine].map((step, idx) => (
                    <tr key={idx} className="border-t border-gray-600">
                      <td className="p-2">{idx}</td>
                      <td className="p-2">{step.pc}</td>
                      <td className="p-2 font-mono">{step.opName}</td>
                      <td className="p-2">{step.gas_used}</td>
                      <td className="p-2">{step.sourceInfo?.functionName || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // Add a function to format call hierarchies
  const formatCallInfo = (step: EnhancedTraceStep): string => {
    if (!step || !step.sourceInfo) return '';
    
    const functionName = step.sourceInfo.functionName || 'unknown';
    
    // Format different types of calls based on opcode
    if (step.opName) {
      if (step.opName === 'CALL' || step.opName === 'STATICCALL' || step.opName === 'DELEGATECALL') {
        return `[${functionName}] => [External Call]`;
      }
      if (step.opName === 'SLOAD') {
        return `${functionName}[Storage Read]`;
      }
      if (step.opName === 'SSTORE') {
        return `${functionName}[Storage Write]`;
      }
      if (step.opName === 'RETURN') {
        return `${functionName} => [Return]`;
      }
    }
    
    return functionName;
  };
  
  // Add indentation to calls to show hierarchy
  const getCallIndentation = (step: EnhancedTraceStep, depth: number): string => {
    if (!step || depth === 0) return '';
    
    // Use different indicators based on the opcode category
    let indicator = '→';
    if (step.category === 'CALL') indicator = '⤷';
    if (step.category === 'STORAGE') indicator = '⇝';
    if (step.category === 'JUMP') indicator = '↳';
    
    return '  '.repeat(depth - 1) + indicator + ' ';
  };
  
  // Enhance renderStepsView to show call hierarchies
  const renderStepsView = () => {
    if (!result.sourceMapping) {
      return (
        <div>
          <h3 className="text-lg font-semibold mb-2">All Execution Steps</h3>
          <p className="text-gray-500">No source mapping available</p>
        </div>
      );
    }

    const allSteps = result.traces.arena.flatMap(item => 
      item.trace.steps || []
    ).filter(Boolean) as EnhancedTraceStep[];
    
    // Track call depth
    let currentDepth = 0;
    const stepDepths: Record<number, number> = {};
    
    // Analyze steps to determine depth
    allSteps.forEach((step, idx) => {
      if (step.opName === 'CALL' || step.opName === 'STATICCALL' || step.opName === 'DELEGATECALL') {
        stepDepths[idx] = currentDepth;
        currentDepth++;
      } else if (step.opName === 'RETURN' && currentDepth > 0) {
        currentDepth--;
        stepDepths[idx] = currentDepth;
      } else {
        stepDepths[idx] = currentDepth;
      }
    });

    return (
      <div>
        <h3 className="text-lg font-semibold mb-2">All Execution Steps</h3>
        
        <div className="overflow-x-auto mt-2">
          <table className="min-w-full bg-gray-700 text-sm">
            <thead>
              <tr className="bg-gray-600">
                <th className="p-2 text-left">#</th>
                <th className="p-2 text-left">PC</th>
                <th className="p-2 text-left">Opcode</th>
                <th className="p-2 text-left">Gas</th>
                <th className="p-2 text-left">Line</th>
                <th className="p-2 text-left">Call / Operation</th>
                <th className="p-2 text-left">Notes</th>
              </tr>
            </thead>
            <tbody>
              {allSteps.map((step, idx) => {
                // Determine if this step is mapped or unmapped
                const isMapped = step.sourceInfo && isMappedSourceInfo(step.sourceInfo);
                const isUnmapped = step.sourceInfo && isUnmappedSourceInfo(step.sourceInfo);
                
                // Get styles based on the type of source info
                let rowClasses = `border-t border-gray-600 ${getCategoryClass(step.category)}`;
                if (isMapped) {
                  if (step.sourceInfo.isOutOfBounds) rowClasses += ' bg-red-500 bg-opacity-20';
                  if (step.sourceInfo.isDuplicate) rowClasses += ' bg-yellow-500 bg-opacity-20';
                } else if (isUnmapped) {
                  rowClasses += ' bg-gray-500 bg-opacity-20';
                }
                
                const depth = stepDepths[idx] || 0;
                
                return (
                  <tr 
                    key={idx} 
                    className={rowClasses}
                    onMouseEnter={() => handleStepMouseEnter(step, idx)}
                    onMouseLeave={handleStepMouseLeave}
                  >
                    <td className="p-2">{idx}</td>
                    <td className="p-2 font-mono">{step.pc}</td>
                    <td className="p-2 font-mono">{step.opName}</td>
                    <td className="p-2">{step.gas_used}</td>
                    <td className="p-2">
                      {isMapped ? step.sourceInfo.line + 1 : 'N/A'}
                    </td>
                    <td className="p-2 font-mono truncate max-w-xs">
                      {isMapped ? (
                        <span className="text-indigo-300">
                          {getCallIndentation(step, depth)}
                          {formatCallInfo(step)}
                        </span>
                      ) : 'N/A'}
                    </td>
                    <td className="p-2">
                      {isMapped && step.sourceInfo.isOutOfBounds && (
                        <span className="text-red-400">Out of bounds</span>
                      )}
                      {isMapped && step.sourceInfo.isDuplicate && (
                        <span className="text-yellow-400">Duplicate</span>
                      )}
                      {isUnmapped && (
                        <span className="text-gray-400">Unmapped</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };
  
  // Helper functions
  function getTotalSteps(): number {
    let count = 0;
    if (enhancedTraces.arena) {
      enhancedTraces.arena.forEach(arenaItem => {
        if (arenaItem.trace.steps) {
          count += arenaItem.trace.steps.length;
        }
      });
    }
    return count;
  }
  
  function getSourceMappedSteps(): number {
    let count = 0;
    if (enhancedTraces.arena) {
      enhancedTraces.arena.forEach(arenaItem => {
        if (arenaItem.trace.steps) {
          arenaItem.trace.steps.forEach(step => {
            if (step.sourceInfo && !step.sourceInfo.unmapped) {
              count++;
            }
          });
        }
      });
    }
    return count;
  }
  
  function getOutOfBoundsSteps(): number {
    let count = 0;
    if (enhancedTraces.arena) {
      enhancedTraces.arena.forEach(arenaItem => {
        if (arenaItem.trace.steps) {
          arenaItem.trace.steps.forEach(step => {
            if (step.sourceInfo?.isOutOfBounds) {
              count++;
            }
          });
        }
      });
    }
    return count;
  }
  
  function getDuplicateSteps(): number {
    let count = 0;
    if (enhancedTraces.arena) {
      enhancedTraces.arena.forEach(arenaItem => {
        if (arenaItem.trace.steps) {
          arenaItem.trace.steps.forEach(step => {
            if (step.sourceInfo?.isDuplicate) {
              count++;
            }
          });
        }
      });
    }
    return count;
  }
  
  function getCategoryClass(category?: string): string {
    switch (category) {
      case 'JUMP':
        return 'bg-purple-900 bg-opacity-30';
      case 'STORAGE':
        return 'bg-blue-900 bg-opacity-30';
      case 'MEMORY':
        return 'bg-green-900 bg-opacity-30';
      case 'CALL':
        return 'bg-yellow-900 bg-opacity-30';
      case 'FLOW':
        return 'bg-red-900 bg-opacity-30';
      default:
        return '';
    }
  }
  
  return (
    <div className="p-4 bg-gray-800 text-white rounded">
      <h2 className="text-xl font-bold mb-4">Trace Debugger</h2>
      
      <div className="flex mb-4">
        <button
          className={`px-3 py-1 rounded-l ${activeTab === 'overview' ? 'bg-gray-600' : 'bg-gray-700'}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`px-3 py-1 ${activeTab === 'functions' ? 'bg-gray-600' : 'bg-gray-700'}`}
          onClick={() => setActiveTab('functions')}
        >
          Functions
        </button>
        <button
          className={`px-3 py-1 ${activeTab === 'sourceLine' ? 'bg-gray-600' : 'bg-gray-700'}`}
          onClick={() => setActiveTab('sourceLine')}
        >
          Source Lines
        </button>
        <button
          className={`px-3 py-1 rounded-r ${activeTab === 'steps' ? 'bg-gray-600' : 'bg-gray-700'}`}
          onClick={() => setActiveTab('steps')}
        >
          All Steps
        </button>
      </div>
      
      <div className="mt-4">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'functions' && renderFunctionView()}
        {activeTab === 'sourceLine' && renderSourceLineView()}
        {activeTab === 'steps' && renderStepsView()}
      </div>
    </div>
  );
};

export default TraceDebugger; 