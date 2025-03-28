// Types for source mapping between EVM execution traces and Solidity source code

import type { FunctionCallResult, FunctionCall } from "../types";

// Source map entry from compiler
export interface SourceMapEntry {
  offset: number;      // Character offset in source
  length: number;      // Length of the source segment
  index: number;       // Source file index
  jumpType: string;    // Jump type (Regular, In, Out)
  modifierDepth: number; // Depth of modifier if applicable
  
  // Properties from Solidity source maps
  sourceList?: string[];   // List of source file paths
  mappings?: string;       // Compressed mappings string
  sources?: any[];         // Source information
}

// Source location with file information
export interface SourceLocation extends Omit<SourceMapEntry, 'sourceList' | 'mappings' | 'sources'> {
  filePath: string;    // Path to the source file
  line: number;        // Line number (computed from offset)
  column: number;      // Column number (computed from offset)
}

// Enhanced trace step with source information
export interface EnhancedTraceStep {
  // Original trace step data
  pc: number;
  op: number;
  opName?: string;     // Human-readable opcode name (e.g., "JUMPDEST" for 0x5b)
  category?: string;   // Opcode category for grouping/highlighting
  stack: string[];
  memory: string;
  gas_remaining: number;
  gas_used: number;
  gas_cost: number;
  storage_change?: any;
  status: string;
  depth: number;
  contract: string;
  
  // Added source mapping
  sourceInfo?: {
    filePath: string;
    offset: number;
    length: number;
    line: number;
    column: number;
    lineIndex?: number; // Index of the line in the source file array
    jumpType: string;
    sourceLine: string;
    functionName?: string;
    isOutOfBounds?: boolean; // Whether the offset is out of bounds
    isDuplicate?: boolean;   // Whether this is a duplicate mapping
    unmapped?: boolean;      // Whether this step has no source mapping
  } | {
    // For unmapped steps
    unmapped: true;
    pc: number;
  };
}

// Enhanced trace with source information
export interface EnhancedTrace {
  // Original trace data
  parent: null | number;
  children: number[];
  idx: number;
  trace: {
    depth: number;
    success: boolean;
    caller: string;
    address: string;
    kind: string;
    value: string;
    data: string;
    output: string;
    gas_used: number;
    gas_limit: number;
    status: string;
    
    // Enhanced steps with source info
    steps: EnhancedTraceStep[];
  };
  logs: any[];
  ordering: number[];
}

// Function range in source code
export interface FunctionRange {
  name: string;
  start: number;
  end: number;
  line: number;        // Line number for start
  endLine: number;     // Line number for end
}

// Complete source to trace mapping structure
export interface SourceTraceMapping {
  // Original function call
  functionCall: FunctionCall;
  
  // Enhanced traces with source info
  enhancedTraces: {
    arena: EnhancedTrace[];
  };
  
  // Mapping context
  sourceContext: {
    // Program counter to source location
    pcToSource: Map<number, SourceLocation>;
    
    // Source files by path
    sourceFiles: Record<string, string>;
    
    // Function ranges by file path
    functionRanges: Record<string, FunctionRange[]>;
    
    // Execution steps grouped by function
    functionToSteps: Record<string, EnhancedTraceStep[]>;
    
    // Source lines to execution steps
    lineToSteps: Record<string, Record<number, EnhancedTraceStep[]>>;
  };
}

// Enhanced function call result with source mapping
export interface EnhancedFunctionCallResult extends FunctionCallResult {
  sourceMapping?: SourceTraceMapping;
} 