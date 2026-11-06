import type { NextConfig } from "next";

// @coinbase/cdp-sdk (reached through wagmi/connectors) lazily imports optional @x402/* packages
// that aren't installed. Hypeflow doesn't use them, so alias them to an empty module.
const x402 = ["@x402/core/client", "@x402/evm", "@x402/evm/exact/client", "@x402/evm/upto/client", "@x402/svm/exact/client"];
const stub = "./lib/stubs/empty.js";

const nextConfig: NextConfig = {
  turbopack: { resolveAlias: Object.fromEntries(x402.map((m) => [m, stub])) },
};

export default nextConfig;
