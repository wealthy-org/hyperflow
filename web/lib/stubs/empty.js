// Stub for optional @x402/* deps pulled in by @coinbase/cdp-sdk via wagmi/connectors.
// Hypeflow never uses x402 payments; these exist only so the bundler can resolve the imports.
const unsupported = () => {
  throw new Error("x402 payments are not supported in Hypeflow");
};
export const toClientEvmSigner = unsupported;
export const registerExactEvmScheme = unsupported;
export const registerExactSvmScheme = unsupported;
export class x402Client { constructor() { unsupported(); } }
export class ExactEvmScheme { constructor() { unsupported(); } }
export class UptoEvmScheme { constructor() { unsupported(); } }
export class ExactSvmScheme { constructor() { unsupported(); } }
