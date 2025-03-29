import { type Chain, createPublicClient, http, Address, Hex } from "viem";

export function extractFileName(filePath: string): string {
  // This regex matches everything after the last '/' or '\' in the path
  const match = filePath.match(/[/\\]([^/\\]+)$/);
  return match ? match[1] : filePath;
}

export const replacer = (key: any, value: any) =>
  typeof value === "bigint" ? value.toString() : value;

export function getRandomAddress(): `0x${string}` {
  return `0x${[...Array(40)].map(() => Math.floor(Math.random() * 16).toString(16)).join("")}` as `0x${string}`;
}

export async function fetchBytecodeFromChain(
  chain: Chain,
  address: Address,f
): Promise<Hex | undefined> {
  const client = createPublicClient({
    chain,
    transport: http(),
  });

  const bytecode = await client.getBytecode({ address });
  return bytecode;
}
