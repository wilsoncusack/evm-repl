export interface FunctionCall {
  rawInput: string;
  encodedCalldata?: Hex;
  name?: string;
  args?: any[];
  caller?: Address;
  id?: string;
} 