import { OPCODE_NAMES } from "./opcodeMapper";

export interface Instruction {
  pc: number; // Program counter
  opcode: number; // Numeric opcode
  opcodeName: string; // Human-readable opcode name
  pushData?: string; // Data for PUSH operations
  size: number; // Instruction size in bytes
  index: number; // Instruction index
}

/**
 * Parse EVM bytecode into structured instruction data
 *
 * @param bytecode Hex string bytecode (with or without 0x prefix)
 * @returns Array of parsed instructions with accurate PC values
 */
export function parseEVMBytecode(bytecode: string): Instruction[] {
  const instructions: Instruction[] = [];

  // Ensure bytecode is a hex string and remove 0x prefix if present
  const cleanedBytecode = bytecode.startsWith("0x")
    ? bytecode.slice(2)
    : bytecode;

  if (!cleanedBytecode || cleanedBytecode.length % 2 !== 0) {
    console.error(
      `Invalid bytecode format: ${!cleanedBytecode ? "empty" : "odd length"}`,
    );
    return [];
  }

  // Check if bytecode is actually hexadecimal
  if (!/^[0-9a-fA-F]+$/.test(cleanedBytecode)) {
    console.error("Bytecode contains non-hexadecimal characters");
    return [];
  }

  let pc = 0;
  let index = 0;

  try {
    for (let i = 0; i < cleanedBytecode.length; i += 2) {
      // Extract the opcode byte
      const opcodeByte = cleanedBytecode.slice(i, i + 2);
      const opcode = parseInt(opcodeByte, 16);
      const opcodeName = OPCODE_NAMES[opcode] || `UNKNOWN(0x${opcodeByte})`;

      // Default size is 1 byte (the opcode itself)
      let size = 1;
      let pushData: string | undefined = undefined;

      // Handle PUSH operations (PUSH1-PUSH32)
      if (opcode >= 0x60 && opcode <= 0x7f) {
        const pushSize = opcode - 0x5f; // PUSH1 = 0x60, size = 1

        // Extract the push data
        const dataStart = i + 2;
        const dataEnd = dataStart + pushSize * 2;

        if (dataEnd <= cleanedBytecode.length) {
          pushData = "0x" + cleanedBytecode.slice(dataStart, dataEnd);
          size += pushSize; // Add the push data size
          i += pushSize * 2; // Skip the push data in the next iteration
        } else {
          console.warn(
            `Incomplete PUSH data at PC ${pc}, opcode ${opcodeName}`,
          );
        }
      }

      // Create the instruction
      const instruction: Instruction = {
        pc,
        opcode,
        opcodeName,
        pushData,
        size,
        index,
      };

      instructions.push(instruction);

      // Update program counter for next instruction
      pc += size;
      index++;
    }

    // Quick check of first few instructions for validation
    dumpInstructions(instructions, 5);
  } catch (error) {
    console.error("Error parsing bytecode:", error);
  }

  return instructions;
}

/**
 * Create a mapping from instruction indices to source map entries
 *
 * @param sourceMap Source map string from solc (semicolon-separated entries)
 * @returns Array mapping instruction indices to source map components
 */
export function mapInstructionsToSourceMap(
  instructions: Instruction[],
  sourceMaps: any[],
): Map<number, any> {
  const pcToSourceMap = new Map<number, any>();

  // Simplified approach: map each instruction to corresponding source map entry
  // In a real implementation, you'd need to handle compressed source maps
  for (let i = 0; i < instructions.length && i < sourceMaps.length; i++) {
    const instruction = instructions[i];
    const sourceMapEntry = sourceMaps[i];

    if (sourceMapEntry) {
      pcToSourceMap.set(instruction.pc, sourceMapEntry);
    }
  }
  return pcToSourceMap;
}

/**
 * Dump instructions for debugging
 *
 * @param instructions Parsed instructions
 * @param limit Maximum number of instructions to dump
 */
export function dumpInstructions(
  instructions: Instruction[],
  limit: number = 20,
): void {
  for (let i = 0; i < Math.min(limit, instructions.length); i++) {
    const instr = instructions[i];
  }
}
