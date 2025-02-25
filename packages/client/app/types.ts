import { Address, DecodeEventLogReturnType, Hex, Log } from "viem";

export interface CompilationResult {
  errors: {
    sourceLocation: {
      file: string;
      start: number;
      end: number;
    };
    type: string;
    component: string;
    severity: string;
    errorCode: string;
    message: string;
    formattedMessage: string;
  }[];
  contracts: {
    [fileName: string]: {
      [contractName: string]: {
        contract: {
          abi: {
            type: string;
            name: string;
            inputs: {
              name: string;
              type: string;
              internalType: string;
            }[];
            outputs?: {
              name: string;
              type: string;
              internalType: string;
            }[];
            stateMutability: string;
            anonymous?: boolean;
          }[];
          userdoc: {};
          devdoc: {};
          evm: {
            bytecode: {
              object: string;
              opcodes: string;
              sourceMap: string;
              linkReferences: {};
            };
            deployedBytecode: {
              object: string;
              opcodes: string;
              sourceMap: string;
              linkReferences: {};
            };
            methodIdentifiers: {
              [key: string]: string;
            };
          };
        };
        version: string;
        build_id: string;
      }[];
    };
  };
}

export type FunctionCallResult = {
  call: string;
  gasUsed: string;
  response: string | undefined;
  logs?: DecodeEventLogReturnType[];
  rawLogs: Log[];
  traces: {
    arena: Array<{
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
        steps: any[];
      };
      logs: any[];
      ordering: number[];
    }>;
  };
};

export type FileId = string;

export interface FileFunctionCalls {
  [id: FileId]: FunctionCall[];
}

export interface FunctionCall {
  rawInput: string;
  name?: string;
  // biome-ignore lint/suspicious/noExplicitAny:
  args?: any[];
  value?: bigint;
  caller?: Address;
  encodedCalldata?: Hex;
}

export interface SolidityFile {
  id: FileId;
  name: string;
  content: string;
  address: Address;
  bytecode?: Hex;
}

export type ExecutionResponse = {
  exitReason: string;
  reverted: boolean;
  result: Hex;
  gasUsed: string;
  logs: Log[];
  traces: FunctionCallResult["traces"];
};

export interface ForkConfig {
  rpcUrl?: string;
  chainId?: number;
  blockNumber?: number;
}

export interface ChainOption {
  id: number;
  name: string;
  rpcUrl?: string;
}
