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
    
    // For out-of-bounds offsets, clamp to valid range
    // Note: offsets may be referring to intermediate Yul IR, not the Solidity source directly
    const clampedOffset = Math.min(Math.max(0, offset), source.length);
    
    // Log that we're clamping and returning a best guess
    if (offset !== clampedOffset) {
      console.warn(`Clamping out-of-bounds offset ${offset} to ${clampedOffset} (likely referencing Yul IR position)`);
      offset = clampedOffset;
    }
  }
  
  // Use a more efficient approach for line calculation
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
  console.log('Source files available:', Object.keys(sourceFiles).join(', '));
  
  // Debug: log the first few lines of each source file to verify content
  for (const [path, content] of Object.entries(sourceFiles)) {
    const firstLines = content.split('\n').slice(0, 3).join('\n');
    console.log(`First few lines of ${path}:\n${firstLines}...\n(total ${content.length} chars)`);
  }
  
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
    // For each file path in sourceFiles, create multiple normalized versions
    const fileName = filePath.split('/').pop() || filePath;
    normalizedFilePathsMap.set(filePath, filePath); // Original to original
    normalizedFilePathsMap.set(fileName, filePath); // Short name to original
    
    // Also add without file extensions (handles variations like .sol vs empty)
    if (fileName.includes('.')) {
      const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
      normalizedFilePathsMap.set(nameWithoutExt, filePath);
    }
  }
  
  // Debug: log the normalization map
  console.log('File path normalization map:');
  Array.from(normalizedFilePathsMap.entries()).forEach(([key, value]) => {
    console.log(`  "${key}" -> "${value}"`);
  });
  
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
    
    // One more attempt - try without file extension
    if (fileName.includes('.')) {
      const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
      if (sourceFiles[nameWithoutExt]) {
        return sourceFiles[nameWithoutExt];
      }
      
      // Check if there's a match with any file starting with this name
      for (const key of Object.keys(sourceFiles)) {
        if (key.startsWith(nameWithoutExt)) {
          return sourceFiles[key];
        }
      }
    }
    
    // Log the failed lookup
    console.warn(`Source file not found: "${path}"`);
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
    
    // Count for statistics
    let validMappings = 0;
    let invalidOffsets = 0;
    let missingFiles = 0;
    
    // Check if the sourceMaps format is the newer JSON format with direct entries
    if (sourceMaps.length > 0 && sourceMaps[0].offset > 0) {
      console.log('Using direct source map entries (JSON format)');
      
      // For each entry in the source map...
      for (let i = 0; i < sourceMaps.length; i++) {
        const entry = sourceMaps[i];
        
        // Find the instruction by its index
        const instruction = indexToInstruction.get(i);
        
        if (!instruction) {
          continue;
        }
        
        if (!entry.sourceList || entry.sourceList.length === 0) {
          continue;
        }
        
        const sourceFilePath = entry.sourceList[0];
        const fileContent = getFileContentByPath(sourceFilePath);
        
        if (!fileContent) {
          missingFiles++;
          continue;
        }
        
        // Handle source map offsets that refer to Yul IR positions
        // Instead of treating them as errors, just clamp them to the file content
        const originalOffset = entry.offset;
        let offset = originalOffset;
        let isOutOfBounds = false;
        
        if (offset < 0 || offset > fileContent.length) {
          isOutOfBounds = true;
          invalidOffsets++;
          
          // Clamp to valid bounds while preserving a flag that this was out of bounds
          offset = Math.min(Math.max(0, offset), fileContent.length);
        }
        
        // Get normalized file path
        const normalizedPath = normalizedFilePathsMap.get(sourceFilePath) || 
                             normalizedFilePathsMap.get(sourceFilePath.split('/').pop() || sourceFilePath) || 
                             sourceFilePath;
        
        // Calculate line and column
        const { line, column } = calculateLineAndColumn(fileContent, offset);
        
        // Create source location
        const sourceLocation: SourceLocation = {
          offset: offset, // Use the clamped offset for valid calculations
          length: entry.length,
          index: entry.index,
          jumpType: entry.jumpType,
          modifierDepth: entry.modifierDepth,
          filePath: normalizedPath,
          line,
          column
        };
        
        // Add to map, even if the offset was out of bounds
        pcToSource.set(instruction.pc, sourceLocation);
        validMappings++;
      }
    } 
    // Handle traditional semicolon-separated format
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
        console.error(`Source file '${sourceFilePath}' not found for main mapping`);
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
        
        // Parse source map entries
        // The format is: offset:sourceIndex:startPos:length:jumpType:modifierDepth
        // Any of these may be omitted to use the previous value
        
        // Parse offset (program counter relative)
        const offset = parts[0] ? parseInt(parts[0], 10) : lastOffset;
        
        // Parse source index (file index)
        let sourceIndex = lastSourceIndex;
        if (parts.length > 1 && parts[1]) {
          sourceIndex = parseInt(parts[1], 10);
        }
        
        // Skip if no source index (e.g., compiler-generated code)
        if (sourceIndex === -1) {
          continue;
        }
        
        // Parse start position (character offset in source)
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
        
        if (!instruction) {
          continue;
        }
        
        // Handle source map offsets that refer to Yul IR positions
        // Instead of treating them as errors, just clamp them and flag them
        const originalStartPos = startPos;
        let isOutOfBounds = false;
        
        if (startPos < 0 || startPos > fileContent.length) {
          isOutOfBounds = true;
          invalidOffsets++;
          
          // Clamp to valid bounds
          startPos = Math.min(Math.max(0, startPos), fileContent.length);
        }
        
        // Calculate line and column
        const { line, column } = calculateLineAndColumn(fileContent, startPos);
        
        // Create source location with additional metadata
        const sourceLocation: SourceLocation = {
          offset: startPos, // Use the clamped offset for valid calculations
          length,
          index: sourceIndex,
          jumpType,
          modifierDepth,
          filePath: normalizedPath,
          line,
          column
        };
        
        // Add to map, even if the offset was out of bounds
        pcToSource.set(instruction.pc, sourceLocation);
        validMappings++;
        
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
    
    console.log(`Created PC to source map with ${pcToSource.size} entries (${validMappings} valid, ${invalidOffsets} invalid offsets, ${missingFiles} missing files)`);
    console.log('Note: Invalid offsets likely refer to Yul IR positions rather than direct Solidity source positions');
    
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
  // Extract function ranges from Solidity source
  const functionRanges: { name: string; start: number; end: number; line: number; endLine: number }[] = [];
  
  try {
    // Regular expression to match function declarations in Solidity
    // This pattern has been improved to better handle variations in function syntax
    const functionPattern = /function\s+(\w+)\s*\(([^)]*)\)(?:\s+(?:external|public|internal|private|pure|view|payable|virtual|override))*\s*(?:returns\s*\([^)]*\))?\s*{/g;
    
    // Find all line break positions to calculate line numbers
    const lineBreaks: number[] = [];
    let lineBreakIndex = source.indexOf('\n');
    while (lineBreakIndex !== -1) {
      lineBreaks.push(lineBreakIndex);
      lineBreakIndex = source.indexOf('\n', lineBreakIndex + 1);
    }
    
    // Helper function to get line number from character offset
    const getLineNumber = (offset: number): number => {
      let line = 0;
      for (let i = 0; i < lineBreaks.length; i++) {
        if (lineBreaks[i] >= offset) {
          break;
        }
        line++;
      }
      return line;
    };
    
    // Find all function declarations
    let match;
    while ((match = functionPattern.exec(source)) !== null) {
      const functionName = match[1];
      const startOffset = match.index;
      
      // Find the matching closing brace for this function
      let openBraces = 1;
      let endOffset = match.index + match[0].length;
      
      // Special case for tiny functions that might be on a single line with a simple return
      const singleLineReturnPattern = new RegExp(`function\\s+${functionName}[^{]*{\\s*return[^;]*;\\s*}`, 'g');
      singleLineReturnPattern.lastIndex = match.index;
      const singleLineMatch = singleLineReturnPattern.exec(source);
      
      if (singleLineMatch && singleLineMatch.index === match.index) {
        // This is a single-line function with a simple return
        endOffset = singleLineMatch.index + singleLineMatch[0].length - 1;
      } else {
        // Normal multi-line or complex function - count braces
        for (let i = endOffset; i < source.length; i++) {
          if (source[i] === '{') {
            openBraces++;
          } else if (source[i] === '}') {
            openBraces--;
            if (openBraces === 0) {
              endOffset = i;
              break;
            }
          }
        }
      }
      
      const startLine = getLineNumber(startOffset);
      const endLine = getLineNumber(endOffset);
      
      functionRanges.push({
        name: functionName,
        start: startOffset,
        end: endOffset,
        line: startLine,
        endLine: endLine
      });
      
      console.log(`Detected function: ${functionName} at lines ${startLine+1}-${endLine+1}, offsets ${startOffset}-${endOffset}`);
      console.log(`Function code: "${source.substring(startOffset, Math.min(startOffset + 40, endOffset))}..."`);
    }
    
    console.log(`Total functions detected: ${functionRanges.length}`);
  } catch (error) {
    console.error('Error extracting function ranges:', error);
  }
  
  return functionRanges;
} 