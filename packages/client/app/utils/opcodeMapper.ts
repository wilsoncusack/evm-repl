/**
 * Map of EVM opcode numbers to their human-readable names
 */
export const OPCODE_NAMES: Record<number, string> = {
  0x00: 'STOP',
  0x01: 'ADD',
  0x02: 'MUL',
  0x03: 'SUB',
  0x04: 'DIV',
  0x05: 'SDIV',
  0x06: 'MOD',
  0x07: 'SMOD',
  0x08: 'ADDMOD',
  0x09: 'MULMOD',
  0x0a: 'EXP',
  0x0b: 'SIGNEXTEND',
  
  // 0x10s: Comparison & Bitwise Logic
  0x10: 'LT',
  0x11: 'GT',
  0x12: 'SLT',
  0x13: 'SGT',
  0x14: 'EQ',
  0x15: 'ISZERO',
  0x16: 'AND',
  0x17: 'OR',
  0x18: 'XOR',
  0x19: 'NOT',
  0x1a: 'BYTE',
  0x1b: 'SHL',
  0x1c: 'SHR',
  0x1d: 'SAR',
  
  // 0x20s: Cryptographic operations
  0x20: 'SHA3',
  
  // 0x30s: Environmental Information
  0x30: 'ADDRESS',
  0x31: 'BALANCE',
  0x32: 'ORIGIN',
  0x33: 'CALLER',
  0x34: 'CALLVALUE',
  0x35: 'CALLDATALOAD',
  0x36: 'CALLDATASIZE',
  0x37: 'CALLDATACOPY',
  0x38: 'CODESIZE',
  0x39: 'CODECOPY',
  0x3a: 'GASPRICE',
  0x3b: 'EXTCODESIZE',
  0x3c: 'EXTCODECOPY',
  0x3d: 'RETURNDATASIZE',
  0x3e: 'RETURNDATACOPY',
  0x3f: 'EXTCODEHASH',
  
  // 0x40s: Block Information
  0x40: 'BLOCKHASH',
  0x41: 'COINBASE',
  0x42: 'TIMESTAMP',
  0x43: 'NUMBER',
  0x44: 'DIFFICULTY',
  0x45: 'GASLIMIT',
  0x46: 'CHAINID',
  0x47: 'SELFBALANCE',
  0x48: 'BASEFEE',
  
  // 0x50s: Stack, Memory, Storage and Flow Operations
  0x50: 'POP',
  0x51: 'MLOAD',
  0x52: 'MSTORE',
  0x53: 'MSTORE8',
  0x54: 'SLOAD',
  0x55: 'SSTORE',
  0x56: 'JUMP',
  0x57: 'JUMPI',
  0x58: 'PC',
  0x59: 'MSIZE',
  0x5a: 'GAS',
  0x5b: 'JUMPDEST',
  
  // 0x60s & 0x70s: Push Operations
  0x5f: 'PUSH0',
  0x60: 'PUSH1',
  0x61: 'PUSH2',
  0x62: 'PUSH3',
  0x63: 'PUSH4',
  0x64: 'PUSH5',
  0x65: 'PUSH6',
  0x66: 'PUSH7',
  0x67: 'PUSH8',
  0x68: 'PUSH9',
  0x69: 'PUSH10',
  0x6a: 'PUSH11',
  0x6b: 'PUSH12',
  0x6c: 'PUSH13',
  0x6d: 'PUSH14',
  0x6e: 'PUSH15',
  0x6f: 'PUSH16',
  0x70: 'PUSH17',
  0x71: 'PUSH18',
  0x72: 'PUSH19',
  0x73: 'PUSH20',
  0x74: 'PUSH21',
  0x75: 'PUSH22',
  0x76: 'PUSH23',
  0x77: 'PUSH24',
  0x78: 'PUSH25',
  0x79: 'PUSH26',
  0x7a: 'PUSH27',
  0x7b: 'PUSH28',
  0x7c: 'PUSH29',
  0x7d: 'PUSH30',
  0x7e: 'PUSH31',
  0x7f: 'PUSH32',
  
  // 0x80s: Duplication Operations
  0x80: 'DUP1',
  0x81: 'DUP2',
  0x82: 'DUP3',
  0x83: 'DUP4',
  0x84: 'DUP5',
  0x85: 'DUP6',
  0x86: 'DUP7',
  0x87: 'DUP8',
  0x88: 'DUP9',
  0x89: 'DUP10',
  0x8a: 'DUP11',
  0x8b: 'DUP12',
  0x8c: 'DUP13',
  0x8d: 'DUP14',
  0x8e: 'DUP15',
  0x8f: 'DUP16',
  
  // 0x90s: Exchange Operations
  0x90: 'SWAP1',
  0x91: 'SWAP2',
  0x92: 'SWAP3',
  0x93: 'SWAP4',
  0x94: 'SWAP5',
  0x95: 'SWAP6',
  0x96: 'SWAP7',
  0x97: 'SWAP8',
  0x98: 'SWAP9',
  0x99: 'SWAP10',
  0x9a: 'SWAP11',
  0x9b: 'SWAP12',
  0x9c: 'SWAP13',
  0x9d: 'SWAP14',
  0x9e: 'SWAP15',
  0x9f: 'SWAP16',
  
  // 0xa0s: Logging Operations
  0xa0: 'LOG0',
  0xa1: 'LOG1',
  0xa2: 'LOG2',
  0xa3: 'LOG3',
  0xa4: 'LOG4',
  
  // 0xf0s: System Operations
  0xf0: 'CREATE',
  0xf1: 'CALL',
  0xf2: 'CALLCODE',
  0xf3: 'RETURN',
  0xf4: 'DELEGATECALL',
  0xf5: 'CREATE2',
  0xfa: 'STATICCALL',
  0xfd: 'REVERT',
  0xfe: 'INVALID',
  0xff: 'SELFDESTRUCT'
};

/**
 * Get the human-readable name for an opcode
 * 
 * @param op Opcode number
 * @returns Opcode name or 'UNKNOWN' if not found
 */
export function getOpcodeName(op: number): string {
  return OPCODE_NAMES[op] || `UNKNOWN(0x${op.toString(16)})`;
}

/**
 * Categories of opcodes for coloring and grouping
 */
export const OPCODE_CATEGORIES = {
  JUMP: ['JUMP', 'JUMPI', 'JUMPDEST'],
  STORAGE: ['SLOAD', 'SSTORE'],
  MEMORY: ['MLOAD', 'MSTORE', 'MSTORE8'],
  CALL: ['CALL', 'STATICCALL', 'DELEGATECALL', 'CALLCODE'],
  CREATE: ['CREATE', 'CREATE2'],
  FLOW: ['STOP', 'RETURN', 'REVERT', 'INVALID', 'SELFDESTRUCT'],
  STACK: ['POP', 'DUP1', 'DUP2', 'DUP3', 'DUP4', 'DUP5', 'DUP6', 'DUP7', 'DUP8',
         'DUP9', 'DUP10', 'DUP11', 'DUP12', 'DUP13', 'DUP14', 'DUP15', 'DUP16',
         'SWAP1', 'SWAP2', 'SWAP3', 'SWAP4', 'SWAP5', 'SWAP6', 'SWAP7', 'SWAP8',
         'SWAP9', 'SWAP10', 'SWAP11', 'SWAP12', 'SWAP13', 'SWAP14', 'SWAP15', 'SWAP16'],
  ARITHMETIC: ['ADD', 'MUL', 'SUB', 'DIV', 'SDIV', 'MOD', 'SMOD', 'ADDMOD', 'MULMOD', 'EXP', 'SIGNEXTEND']
};

/**
 * Get the category of an opcode
 * 
 * @param opName Opcode name
 * @returns Category name or 'OTHER' if not in a specific category
 */
export function getOpcodeCategory(opName: string): string {
  for (const [category, opcodes] of Object.entries(OPCODE_CATEGORIES)) {
    if (opcodes.includes(opName)) {
      return category;
    }
  }
  return 'OTHER';
} 