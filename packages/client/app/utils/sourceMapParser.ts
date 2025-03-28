import { SourceMapEntry, SourceLocation } from "../types/sourceMapping";
import { Instruction, parseEVMBytecode, dumpInstructions } from "./bytecodeParser";

/**
 * Parse source maps from compilation result
 * 
 * @param sourceMapData Source maps from compilation result
 * @returns Array of parsed source map entries
 */
export function parseSourceMaps(sourceMapData: any): SourceMapEntry[] {
  console.log('Parsing source maps');
  console.log('Source map data type:', typeof sourceMapData);
  console.log('Source map data keys:', Object.keys(sourceMapData));
  
  if (!sourceMapData) {
    console.warn('No source maps provided');
    return [];
  }
  
  const result: SourceMapEntry[] = [];
  
  try {
    // Check if we have a deployed source map
    const deployedKeys = Object.keys(sourceMapData).filter(key => 
      key.includes(':deployed:') || key.includes('deployedSourceMap')
    );
    
    console.log('Deployed source map keys found:', deployedKeys);
    
    if (deployedKeys.length === 0) {
      console.warn('No deployed source maps found in compiler output');
      return [];
    }
    
    // Prioritize deployed source maps
    for (const key of deployedKeys) {
      console.log(`Processing source map key: ${key}`);
      const sourceMap = sourceMapData[key];
      
      if (!sourceMap) {
        console.warn(`No source map found for key: ${key}`);
        continue;
      }
      
      console.log(`Source map type for ${key}:`, typeof sourceMap);
      
      // Extract source file path from the key
      const filePath = key.split(':deployed:')[0];
      console.log('Extracted file path:', filePath);
      
      // Process the source map based on its type
      if (typeof sourceMap === 'string') {
        console.log(`Processing string source map for ${key}`);
        
        try {
          // Check if it's a JSON string
          if (sourceMap.trim().startsWith('[')) {
            // Try to parse JSON
            const parsedMap = JSON.parse(sourceMap);
            console.log(`Parsed JSON source map with ${parsedMap.length} entries`);
            
            // Add each entry to the result
            for (const entry of parsedMap) {
              result.push({
                offset: entry.offset || 0,
                length: entry.length || 0,
                index: entry.index || 0,
                jumpType: entry.jumpType || '',
                modifierDepth: entry.modifierDepth || 0,
                sourceList: [filePath],
                sources: []
              });
            }
          } else {
            // Standard semicolon-separated format
            const entries = sourceMap.split(';');
            console.log(`Found ${entries.length} semicolon-separated entries`);
            
            // Create a single entry to hold the mappings
            result.push({
              offset: 0,
              length: 0,
              index: 0,
              jumpType: '',
              modifierDepth: 0,
              sourceList: [filePath],
              mappings: sourceMap,
              sources: []
            });
          }
        } catch (error) {
          console.error('Error parsing source map JSON:', error);
          // Fallback: treat as a simple string
          result.push({
            offset: 0,
            length: 0,
            index: 0,
            jumpType: '',
            modifierDepth: 0,
            sourceList: [filePath],
            mappings: sourceMap,
            sources: []
          });
        }
      } else if (typeof sourceMap === 'object') {
        console.log(`Processing object source map with keys:`, Object.keys(sourceMap));
        
        // Object-based source map - add directly
        result.push({
          offset: 0,
          length: 0,
          index: 0,
          jumpType: '',
          modifierDepth: 0,
          sourceList: sourceMap.sources || [filePath],
          mappings: sourceMap.mappings || '',
          sources: sourceMap.sources || []
        });
      }
    }
    
    console.log(`Parsed ${result.length} source map entries`);
    
    // Log some sample entries
    if (result.length > 0) {
      console.log('First source map entry:', {
        offset: result[0].offset,
        length: result[0].length,
        index: result[0].index,
        jumpType: result[0].jumpType,
        sourceList: result[0].sourceList
      });
    }
  } catch (error) {
    console.error('Error parsing source maps:', error);
  }
  
  return result;
}

/**
 * Calculate line and column numbers from a character offset in source code
 * 
 * @param source Source code text
 * @param offset Character offset
 * @returns Object containing line and column numbers (0-indexed)
 */
export function calculateLineAndColumn(source: string, offset: number): { line: number; column: number } {
  // Handle invalid offsets
  if (offset < 0 || offset > source.length) {
    console.warn(`Offset ${offset} is out of bounds for source of length ${source.length}`);
    
    // For out-of-bounds offsets, clamp to valid range instead of returning 0,0
    const clampedOffset = Math.min(Math.max(0, offset), source.length);
    
    // If the offset is completely out of bounds but positive, use the last character position
    if (offset > source.length) {
      const textBefore = source;
      const lines = textBefore.split('\n');
      return { 
        line: lines.length - 1, 
        column: lines[lines.length - 1].length 
      };
    }
  }
  
  const textBefore = source.substring(0, offset);
  const lines = textBefore.split('\n');
  const line = lines.length - 1; // 0-indexed
  const column = lines[lines.length - 1].length; // 0-indexed
  
  return { line, column };
}

/**
 * Create a mapping from program counter (PC) to source location
 * 
 * @param sourceMaps Parsed source maps
 * @param bytecode Contract bytecode
 * @param sourceFiles Source files content by path
 * @returns Map from PC to source location
 */
export function createPCToSourceMap(
  sourceMaps: SourceMapEntry[],
  bytecode: string,
  sourceFiles: Record<string, string>
): Map<number, SourceLocation> {
  console.log('Creating PC to source map');
  console.log('Source maps length:', sourceMaps.length);
  console.log('Bytecode length:', bytecode?.length || 'undefined');
  
  const pcToSource = new Map<number, SourceLocation>();
  
  if (!bytecode || bytecode.length === 0) {
    console.warn('No bytecode provided, returning empty map');
    return pcToSource;
  }
  
  if (sourceMaps.length === 0) {
    console.warn('No source maps provided, returning empty map');
    return pcToSource;
  }
  
  // Create a map for normalizing file paths
  const normalizedFilePathsMap = new Map<string, string>();
  for (const filePath of Object.keys(sourceFiles)) {
    // For each file path in sourceFiles, create a normalized version (just the file name)
    const fileName = filePath.split('/').pop() || filePath;
    normalizedFilePathsMap.set(filePath, filePath); // Original to original
    normalizedFilePathsMap.set(fileName, filePath); // Short name to original
  }
  
  // Helper function to get file content by normalized path
  const getFileContentByPath = (path: string): string | undefined => {
    // Try direct lookup first
    if (sourceFiles[path]) {
      return sourceFiles[path];
    }
    
    // Try to find by file name only (normalize the path)
    const fileName = path.split('/').pop() || path;
    if (sourceFiles[fileName]) {
      return sourceFiles[fileName];
    }
    
    // Try using the normalized path map
    const normalizedPath = normalizedFilePathsMap.get(path) || normalizedFilePathsMap.get(fileName);
    if (normalizedPath && sourceFiles[normalizedPath]) {
      return sourceFiles[normalizedPath];
    }
    
    // Log the failed lookup
    console.warn(`Source file not found: ${path}`);
    console.warn('Available files:', Object.keys(sourceFiles));
    console.warn('Normalized path mappings:', Array.from(normalizedFilePathsMap.entries()));
    
    return undefined;
  };
  
  try {
    // Parse bytecode to get accurate PC values
    const instructions = parseEVMBytecode('0x' + bytecode.replace(/^0x/, ''));
    console.log(`Parsed ${instructions.length} instructions from bytecode`);
    
    // Create a mapping from index to instruction
    const indexToInstruction = new Map<number, Instruction>();
    instructions.forEach(instruction => {
      indexToInstruction.set(instruction.index, instruction);
    });
    
    // Debug: log first few instructions
    console.log('First 5 instructions:');
    instructions.slice(0, 5).forEach(inst => {
      console.log(`Index: ${inst.index}, PC: ${inst.pc}, Op: ${inst.opcodeName}`);
    });
    
    // If source maps have individual entries (from JSON parsing), use them directly
    if (sourceMaps.length > 0 && sourceMaps[0].offset > 0) {
      console.log('Using direct source map entries');
      
      // For each entry in the source map...
      for (let i = 0; i < sourceMaps.length; i++) {
        const entry = sourceMaps[i];
        
        // Find the instruction by its index
        // We map the source entry index to the instruction index
        const instruction = indexToInstruction.get(i);
        
        if (instruction && entry.sourceList && entry.sourceList.length > 0) {
          const sourceFilePath = entry.sourceList[0];
          const fileContent = getFileContentByPath(sourceFilePath);
          
          if (!fileContent) {
            continue;
          }
          
          // Get normalized file path
          const normalizedPath = normalizedFilePathsMap.get(sourceFilePath) || 
                               normalizedFilePathsMap.get(sourceFilePath.split('/').pop() || sourceFilePath) || 
                               sourceFilePath;
          
          // Calculate line and column
          const { line, column } = calculateLineAndColumn(fileContent, entry.offset);
          
          // Create source location
          const sourceLocation: SourceLocation = {
            offset: entry.offset,
            length: entry.length,
            index: entry.index,
            jumpType: entry.jumpType,
            modifierDepth: entry.modifierDepth,
            filePath: normalizedPath,
            line,
            column
          };
          
          // Add to map
          pcToSource.set(instruction.pc, sourceLocation);
        }
      }
    } 
    // If we have the traditional semicolon-separated format
    else if (sourceMaps.length > 0 && sourceMaps[0].mappings) {
      console.log('Using semicolon-separated source maps');
      
      const sourceMap = sourceMaps[0];
      const mappings = sourceMap.mappings ? sourceMap.mappings.split(';') : [];
      console.log(`Mapping entries: ${mappings.length}`);
      
      // Get source file
      let sourceFilePath: string | undefined;
      if (sourceMap.sourceList && sourceMap.sourceList.length > 0) {
        sourceFilePath = sourceMap.sourceList[0];
      }
      
      if (!sourceFilePath) {
        console.warn('No source file path found in source map');
        return pcToSource;
      }
      
      const fileContent = getFileContentByPath(sourceFilePath);
      if (!fileContent) {
        return pcToSource;
      }
      
      // Get normalized file path
      const normalizedPath = normalizedFilePathsMap.get(sourceFilePath) || 
                           normalizedFilePathsMap.get(sourceFilePath.split('/').pop() || sourceFilePath) || 
                           sourceFilePath;
      
      // Track the current state while parsing
      let lastSourceIndex = -1;
      let lastOffset = 0;
      let lastLength = 0;
      let lastJumpType = '';
      let lastModifierDepth = 0;
      
      // For each mapping...
      for (let i = 0; i < mappings.length; i++) {
        const mapping = mappings[i];
        
        if (!mapping) continue;
        
        // Split mapping into components
        const parts = mapping.split(':');
        
        // Parse offset
        const offset = parts[0] ? parseInt(parts[0], 10) : lastOffset;
        
        // Parse source index
        let sourceIndex = lastSourceIndex;
        if (parts.length > 1 && parts[1]) {
          sourceIndex = parseInt(parts[1], 10);
        }
        
        // Skip if no source index (e.g., compiler-generated code)
        if (sourceIndex === -1) continue;
        
        // Parse start position
        let startPos = lastOffset;
        if (parts.length > 2 && parts[2]) {
          startPos = parseInt(parts[2], 10);
        }
        
        // Parse length
        let length = lastLength;
        if (parts.length > 3 && parts[3]) {
          length = parseInt(parts[3], 10);
        }
        
        // Parse jump type
        let jumpType = lastJumpType;
        if (parts.length > 4 && parts[4]) {
          jumpType = parts[4];
        }
        
        // Parse modifier depth (optional)
        let modifierDepth = lastModifierDepth;
        if (parts.length > 5 && parts[5]) {
          modifierDepth = parseInt(parts[5], 10);
        }
        
        // Get instruction by index
        const instruction = indexToInstruction.get(i);
        
        if (instruction) {
          // Calculate line and column
          const { line, column } = calculateLineAndColumn(fileContent, startPos);
          
          // Create source location
          const sourceLocation: SourceLocation = {
            offset: startPos,
            length,
            index: sourceIndex,
            jumpType,
            modifierDepth,
            filePath: normalizedPath,
            line,
            column
          };
          
          // Add to map
          pcToSource.set(instruction.pc, sourceLocation);
        }
        
        // Update state
        lastSourceIndex = sourceIndex;
        lastOffset = offset;
        lastLength = length;
        lastJumpType = jumpType;
        lastModifierDepth = modifierDepth;
      }
    } else {
      console.warn('Source maps are in an unrecognized format');
    }
    
    console.log(`Created PC to source map with ${pcToSource.size} entries`);
    
    // Log some sample entries
    const entries = Array.from(pcToSource.entries());
    if (entries.length > 0) {
      console.log('Sample PC to source mappings:');
      entries.slice(0, 5).forEach(([pc, loc]) => {
        console.log(`PC ${pc} -> ${loc.filePath}:${loc.line}:${loc.column} (offset: ${loc.offset}, length: ${loc.length})`);
      });
    }
  } catch (error) {
    console.error('Error creating PC to source map:', error);
  }
  
  return pcToSource;
}

/**
 * Extract function ranges from Solidity source code using regex
 * Note: This is a simplified approach - for production, consider using a proper Solidity parser
 * 
 * @param source Solidity source code
 * @returns Array of function ranges
 */
export function extractFunctionRanges(source: string): { name: string; start: number; end: number; line: number; endLine: number }[] {
  const functions = [];
  // Match function declarations, including visibility and modifiers
  const functionRegex = /function\s+(\w+)\s*\([^)]*\)(?:\s+(?:external|public|internal|private|pure|view|payable|virtual|override))*\s*(?:{|returns)/g;
  let match;
  
  while ((match = functionRegex.exec(source)) !== null) {
    const functionName = match[1];
    const startOffset = match.index;
    const { line } = calculateLineAndColumn(source, startOffset);
    
    // Find the function body opening brace
    let braceIndex = source.indexOf('{', match.index + match[0].length);
    if (source.substring(match.index + match[0].length, braceIndex).includes('returns')) {
      // If there's a returns clause, find the opening brace after it
      braceIndex = source.indexOf('{', braceIndex);
    }
    
    if (braceIndex === -1) {
      console.warn(`Could not find opening brace for function ${functionName}`);
      continue;
    }
    
    // Find the closing brace - handle nested braces
    let openBraces = 1;
    let endOffset = braceIndex + 1;
    
    for (let i = braceIndex + 1; i < source.length; i++) {
      if (source[i] === '{') openBraces++;
      if (source[i] === '}') openBraces--;
      
      if (openBraces === 0) {
        endOffset = i + 1;
        break;
      }
    }
    
    const { line: endLine } = calculateLineAndColumn(source, endOffset);
    
    functions.push({
      name: functionName,
      start: startOffset,
      end: endOffset,
      line,
      endLine
    });
    
    console.log(`Found function ${functionName} at offset ${startOffset}-${endOffset}, lines ${line}-${endLine}`);
  }
  
  return functions;
} 