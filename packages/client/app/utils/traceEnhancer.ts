import { FunctionCall, FunctionCallResult } from "../types";
import { EnhancedFunctionCallResult, EnhancedTraceStep, FunctionRange, SourceLocation, SourceMapEntry, SourceTraceMapping } from "../types/sourceMapping";
import { getOpcodeName, getOpcodeCategory } from "./opcodeMapper";
import { calculateLineAndColumn, createPCToSourceMap, extractFunctionRanges, parseSourceMaps } from "./sourceMapParser";
import { parseEVMBytecode } from "./bytecodeParser";

// Define the SourceContext type
interface SourceContext {
  sourceFiles: Record<string, string>;
  functionRanges: Record<string, FunctionRange[]>;
  pcToSource: Map<number, any>;
  lineToSteps?: Record<string, Record<string, EnhancedTraceStep[]>>;
}

/**
 * Enhance trace steps with opcode names and categories
 * 
 * @param traces Original trace data
 * @returns Enhanced trace data with opcode names and categories
 */
export function enhanceTracesWithOpcodes(traces: FunctionCallResult["traces"]): FunctionCallResult["traces"] {
  if (!traces || !traces.arena) {
    return traces;
  }
  
  // Deep clone to avoid modifying original
  const enhancedTraces = JSON.parse(JSON.stringify(traces));
  
  // Process each arena item
  for (const arenaItem of enhancedTraces.arena) {
    if (arenaItem.trace.steps && Array.isArray(arenaItem.trace.steps)) {
      // Enhance each step with opcode information
      for (const step of arenaItem.trace.steps) {
        if (typeof step.op === 'number') {
          // Add human-readable opcode name
          step.opName = getOpcodeName(step.op);
          
          // Add opcode category for grouping/coloring
          step.category = getOpcodeCategory(step.opName);
        }
      }
    }
  }
  
  return enhancedTraces;
}

/**
 * Add source code information to trace steps
 * 
 * @param traces Traces (possibly already enhanced with opcode info)
 * @param pcToSource Mapping from PC to source location
 * @param sourceFiles Source files content by path
 * @returns Traces enhanced with source information
 */
export function enhanceTracesWithSourceInfo(
  traces: FunctionCallResult["traces"],
  pcToSource: Map<number, SourceLocation>,
  sourceFiles: Record<string, string>
): FunctionCallResult["traces"] {
  if (!traces || !traces.arena) {
    return traces;
  }
  
  // Deep clone to avoid modifying original
  const enhancedTraces = JSON.parse(JSON.stringify(traces));
  
  // Create lookup for file content lines
  const fileLines: Record<string, string[]> = {};
  for (const [path, content] of Object.entries(sourceFiles)) {
    fileLines[path] = content.split('\n');
  }
  
  let mappedSteps = 0;
  let totalSteps = 0;
  let duplicateCount = 0;
  let lastMappedPC: number | null = null;
  let lastSourceInfo: any = null;
  
  // Process each arena item
  for (const arenaItem of enhancedTraces.arena) {
    if (arenaItem.trace.steps && Array.isArray(arenaItem.trace.steps)) {
      // Enhance each step with source information
      for (const step of arenaItem.trace.steps) {
        totalSteps++;
        const pc = step.pc;
        
        if (pc !== undefined) {
          const sourceInfo = pcToSource.get(pc);
          
          if (sourceInfo) {
            mappedSteps++;
            const { filePath, line, column } = sourceInfo;
            
            // Extract the relevant source code snippet
            const sourceLines = fileLines[filePath] || [];
            const lineIndex = Math.min(Math.max(0, line), sourceLines.length - 1);
            const sourceLine = sourceLines[lineIndex] || '';
            
            // Check if this is the same location as the previous step
            const isDuplicate = 
              lastMappedPC !== null && 
              lastSourceInfo !== null && 
              sourceInfo.filePath === lastSourceInfo.filePath &&
              sourceInfo.line === lastSourceInfo.line;
            
            if (isDuplicate) {
              duplicateCount++;
            }
            
            // Add more detailed source information to the step
            step.sourceInfo = {
              filePath,
              offset: sourceInfo.offset,
              length: sourceInfo.length,
              line,
              column,
              lineIndex,
              jumpType: sourceInfo.jumpType,
              sourceLine,
              isOutOfBounds: sourceInfo.offset < 0 || sourceInfo.offset > (sourceFiles[filePath]?.length || 0),
              isDuplicate
            };
            
            // Update tracking variables
            lastMappedPC = pc;
            lastSourceInfo = sourceInfo;
          } else {
            // If no source mapping found for this PC, add placeholder
            step.sourceInfo = {
              unmapped: true,
              pc: pc
            };
          }
        }
      }
    }
  }
  
  return enhancedTraces;
}

/**
 * Group trace steps by function
 * 
 * @param steps Enhanced trace steps
 * @param sourceContext Source context containing function ranges and source files
 * @returns Record of function names to trace steps
 */
function groupStepsByFunction(
  steps: EnhancedTraceStep[],
  sourceContext: SourceContext
): Record<string, EnhancedTraceStep[]> {
  const functionToSteps: Record<string, EnhancedTraceStep[]> = {};
  const sourceFiles = Object.keys(sourceContext.sourceFiles);
  const functionRanges = sourceContext.functionRanges;
  
  // Count steps assigned to each function
  const assignedSteps: Record<string, number> = {};
  let unmappedSteps = 0;
  
  // Process steps and assign them to functions
  steps.forEach(step => {
    if (step.sourceInfo && !('unmapped' in step.sourceInfo)) {
      const { filePath, offset } = step.sourceInfo;
      let foundFunction = false;
      
      // Find which function contains this offset
      if (functionRanges[filePath]) {
        for (const fnRange of functionRanges[filePath]) {
          // Check if the offset is within the function's range
          // We use a more relaxed check to account for edge cases around function boundaries
          if (offset >= fnRange.start && offset <= fnRange.end) {
            const funcKey = `${filePath}:${fnRange.name}`;
            
            // Initialize array if this is the first step for this function
            if (!functionToSteps[funcKey]) {
              functionToSteps[funcKey] = [];
              assignedSteps[funcKey] = 0;
            }
            
            // Add step to this function's array
            functionToSteps[funcKey].push(step);
            assignedSteps[funcKey]++;
            
            // Set function name in sourceInfo
            step.sourceInfo.functionName = fnRange.name;
            foundFunction = true;
            break;
          }
        }
      }
      
      if (!foundFunction) {
        // If we couldn't find a function, try a more lenient approach for small functions
        // Some opcodes might map to points just outside the formal function boundary
        if (functionRanges[filePath]) {
          // Try to find the closest function by line number
          const stepLine = step.sourceInfo.line;
          let closestFunction = null;
          let smallestDistance = Infinity;
          
          for (const fnRange of functionRanges[filePath]) {
            // Check if the line is close to this function's range
            if (stepLine >= fnRange.line - 1 && stepLine <= fnRange.endLine + 1) {
              const distance = Math.min(
                Math.abs(stepLine - fnRange.line),
                Math.abs(stepLine - fnRange.endLine)
              );
              
              if (distance < smallestDistance) {
                smallestDistance = distance;
                closestFunction = fnRange;
              }
            }
          }
          
          if (closestFunction) {
            const funcKey = `${filePath}:${closestFunction.name}`;
            
            // Initialize array if this is the first step for this function
            if (!functionToSteps[funcKey]) {
              functionToSteps[funcKey] = [];
              assignedSteps[funcKey] = 0;
            }
            
            // Add step to this function's array
            functionToSteps[funcKey].push(step);
            assignedSteps[funcKey]++;
            
            // Set function name in sourceInfo
            step.sourceInfo.functionName = closestFunction.name;
            foundFunction = true;
          }
        }
      }
      
      if (!foundFunction) {
        unmappedSteps++;
      }
    } else {
      unmappedSteps++;
    }
  });
  
  return functionToSteps;
}

/**
 * Group trace steps by source line
 * 
 * @param steps Array of enhanced trace steps
 * @returns Record of file paths to record of line numbers to trace steps
 */
function groupStepsBySourceLine(
  steps: EnhancedTraceStep[]
): Record<string, Record<number, EnhancedTraceStep[]>> {
  const result: Record<string, Record<number, EnhancedTraceStep[]>> = {};
  
  if (!steps || steps.length === 0) {
    return result;
  }
  
  // Process each step
  for (const step of steps) {
    if (step.sourceInfo && !('unmapped' in step.sourceInfo)) {
      const { filePath, line } = step.sourceInfo;
      
      // Initialize the file entry if it doesn't exist
      if (!result[filePath]) {
        result[filePath] = {};
      }
      
      // Initialize the line entry if it doesn't exist
      if (!result[filePath][line]) {
        result[filePath][line] = [];
      }
      
      // Add the step to the line's array
      result[filePath][line].push(step);
    }
  }
  
  return result;
}

/**
 * Build a comprehensive source-to-trace mapping
 * 
 * @param functionCall Function call
 * @param traces Execution traces
 * @param compilationResult Compilation result with source maps
 * @param sourceFiles Source files content by path
 * @returns Complete source trace mapping
 */
export function buildSourceTraceMapping(
  functionCall: FunctionCall,
  traces: FunctionCallResult["traces"],
  compilationResult: any,
  sourceFiles: Record<string, string>
): SourceTraceMapping {
  // 1. Parse source maps
  const sourceMaps = parseSourceMaps(compilationResult.source_maps || {});
  
  // 2. Extract function ranges from source files
  const functionRanges: Record<string, { name: string; start: number; end: number; line: number; endLine: number }[]> = {};
  for (const [path, content] of Object.entries(sourceFiles)) {
    functionRanges[path] = extractFunctionRanges(content);
  }
  
  // 3. Create PC to source mapping
  let bytecode = '';
  if (compilationResult.contracts) {
    // Try to get bytecode from compilation result
    const firstContract = Object.keys(compilationResult.contracts)[0];
    if (firstContract && compilationResult.contracts[firstContract][0]) {
      bytecode = compilationResult.contracts[firstContract][0].contract.evm.deployedBytecode.object;
    }
  }
  
  // Fallback to the function call's contract's bytecode if available
  if (!bytecode && 'contractBytecode' in functionCall) {
    bytecode = (functionCall as any).contractBytecode;
  }
  
  const pcToSource = createPCToSourceMap(sourceMaps, bytecode, sourceFiles);
  
  // 4. Enhance traces with opcode information
  const tracesWithOpcodes = enhanceTracesWithOpcodes(traces);
  
  // 5. Enhance traces with source information
  const enhancedTraces = enhanceTracesWithSourceInfo(tracesWithOpcodes, pcToSource, sourceFiles);
  
  // 6. Group steps by function
  // Extract all steps from all traces
  const allSteps: EnhancedTraceStep[] = [];
  if (enhancedTraces.arena) {
    for (const arenaItem of enhancedTraces.arena) {
      if (arenaItem.trace.steps && Array.isArray(arenaItem.trace.steps)) {
        for (const step of arenaItem.trace.steps) {
          allSteps.push(step as EnhancedTraceStep);
        }
      }
    }
  }

  // Now pass the extracted steps to the groupStepsByFunction function
  const functionToSteps = groupStepsByFunction(allSteps, { sourceFiles, functionRanges, pcToSource });
  
  // 7. Group steps by source line
  const lineToSteps = groupStepsBySourceLine(allSteps);
  
  // Build and return the complete structure
  return {
    functionCall,
    enhancedTraces,
    sourceContext: {
      pcToSource,
      sourceFiles,
      functionRanges,
      functionToSteps,
      lineToSteps
    }
  };
}

/**
 * Enhance a function call result with source mapping
 * 
 * @param result Original function call result
 * @param functionCall Function call
 * @param compilationResult Compilation result with source maps
 * @param sourceFiles Source files content by path
 * @returns Enhanced function call result with source mapping
 */
export function enhanceFunctionCallResult(
  result: FunctionCallResult,
  functionCall: FunctionCall,
  compilationResult: any,
  sourceFiles: Record<string, string>
): EnhancedFunctionCallResult {
  // Build source trace mapping
  const sourceMapping = buildSourceTraceMapping(
    functionCall,
    result.traces,
    compilationResult,
    sourceFiles
  );
  
  // Return enhanced result
  return {
    ...result,
    sourceMapping
  };
}

/**
 * Enhance trace steps with source mapping information
 */
export function enhanceTraceWithSourceInfo(
  result: FunctionCallResult,
  sourceFiles: Record<string, string>,
  bytecode: string,
  sourceMaps: any
): EnhancedFunctionCallResult {
  if (!result.traces || !result.traces.arena) {
    return result as EnhancedFunctionCallResult;
  }
  
  // 1. Parse source maps
  const parsedSourceMaps = parseSourceMaps(sourceMaps);
  
  // 2. Create a mapping from PC to source location
  const pcToSource = createPCToSourceMap(
    parsedSourceMaps,
    bytecode,
    sourceFiles
  );
  
  // 3. Extract function ranges from the source code
  const functionRanges: Record<string, FunctionRange[]> = {};
  for (const [filePath, content] of Object.entries(sourceFiles)) {
    functionRanges[filePath] = extractFunctionRanges(content);
  }
  
  // 4. Extract all steps from all traces
  const allSteps: EnhancedTraceStep[] = [];
  result.traces.arena.forEach(arenaItem => {
    if (arenaItem.trace.steps) {
      arenaItem.trace.steps.forEach(step => {
        // Create a copy of the step to avoid modifying the original
        const enhancedStep = {...step} as EnhancedTraceStep;
        
        // Add opcode name and category
        if (typeof enhancedStep.op === 'number') {
          enhancedStep.opName = getOpcodeName(enhancedStep.op);
          enhancedStep.category = getOpcodeCategory(enhancedStep.opName);
        }
        
        allSteps.push(enhancedStep);
      });
    }
  });
  
  // 5. Enhance each step with source info  
  // Create lookup for file content lines
  const fileLines: Record<string, string[]> = {};
  for (const [path, content] of Object.entries(sourceFiles)) {
    fileLines[path] = content.split('\n');
  }
  
  let mappedSteps = 0;
  let totalSteps = 0;
  let duplicateCount = 0;
  let lastMappedPC: number | null = null;
  let lastSourceInfo: any = null;
  
  // Enhance each step with source information
  for (const step of allSteps) {
    totalSteps++;
    const pc = step.pc;
    
    if (pc !== undefined) {
      const sourceInfo = pcToSource.get(pc);
      
      if (sourceInfo) {
        mappedSteps++;
        const { filePath, line, column } = sourceInfo;
        
        // Extract the relevant source code snippet
        const sourceLines = fileLines[filePath] || [];
        const lineIndex = Math.min(Math.max(0, line), sourceLines.length - 1);
        const sourceLine = sourceLines[lineIndex] || '';
        
        // Check if this is the same location as the previous step
        const isDuplicate = 
          lastMappedPC !== null && 
          lastSourceInfo !== null && 
          sourceInfo.filePath === lastSourceInfo.filePath &&
          sourceInfo.line === lastSourceInfo.line;
        
        if (isDuplicate) {
          duplicateCount++;
        }
        
        // Add more detailed source information to the step
        step.sourceInfo = {
          filePath,
          offset: sourceInfo.offset,
          length: sourceInfo.length,
          line,
          column,
          lineIndex,
          jumpType: sourceInfo.jumpType,
          sourceLine,
          isOutOfBounds: sourceInfo.offset < 0 || sourceInfo.offset > (sourceFiles[filePath]?.length || 0),
          isDuplicate
        };
        
        // Update tracking variables
        lastMappedPC = pc;
        lastSourceInfo = sourceInfo;
      } else {
        // If no source mapping found for this PC, add placeholder
        step.sourceInfo = {
          unmapped: true,
          pc: pc
        };
      }
    }
  }
  
  // 6. Create source context
  const sourceContext: SourceContext = { 
    sourceFiles, 
    functionRanges, 
    pcToSource
  };
  
  // 7. Group steps by function
  const functionToSteps = groupStepsByFunction(allSteps, sourceContext);
  
  // 8. Group steps by source line
  const lineToSteps = groupStepsBySourceLine(allSteps);
  
  // Create the complete source trace mapping
  const sourceMapping: SourceTraceMapping = {
    functionCall: { rawInput: result.call },
    enhancedTraces: result.traces,
    sourceContext: {
      pcToSource,
      sourceFiles,
      functionRanges,
      functionToSteps,
      lineToSteps
    }
  };
  
  return {
    ...result,
    sourceMapping
  };
} 