import { type Address, type Hex } from "viem";

export interface FunctionCall {
  rawInput: string;
  encodedCalldata?: Hex;
  name?: string;
  args?: any[];
  caller?: Address;
  id?: string; // ID property for tracking function calls
}
