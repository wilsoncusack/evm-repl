import { Abi, decodeErrorResult } from "viem";

export function decodeRevertData(
  data: string,
  output: string,
  abi: any[],
): string {
  // If there's no output or it's just "0x", we can't decode anything
  if (!output || output === "0x") {
    return "Transaction reverted without a reason";
  }

  try {
    // Try to decode using viem's decodeErrorResult
    const decoded = decodeErrorResult({
      abi: abi as Abi,
      data: output as `0x${string}`,
    });

    // Format the error message
    let errorMessage = `Error: ${decoded.errorName}`;

    // Add arguments if available
    if (decoded.args && decoded.args.length > 0) {
      errorMessage += `(${decoded.args
        .map((arg) => (typeof arg === "bigint" ? arg.toString() : String(arg)))
        .join(", ")})`;
    }

    return errorMessage;
  } catch (error) {
    console.log("Error decoding revert data:", error);

    // Extract the error signature (first 4 bytes)
    const errorSignature = output.slice(0, 10);

    // Try to provide a helpful message with the signature
    return `Unknown error with signature: ${errorSignature}
    
You can look up this signature at: https://openchain.xyz/signatures?query=${errorSignature}`;
  }
}
