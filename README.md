# Hypeflow

Token locks, vesting, and streaming on Elysium. Set an unlock schedule and share the onchain proof.

First flow: launch a token on [Ascend](https://app.ascendlaunch.xyz/) with a dev buy, lock those tokens on Hypeflow, and share a public proof link that anyone can verify without a wallet.

## Repo layout

| Path | What |
|---|---|
| `contracts/` | `HypeflowEscrow` (Solidity, Foundry, OpenZeppelin). Hard lock + linear vesting with cliff, beneficiary-only claims. No admin, no fee, not upgradeable. |
| `web/` | Next.js app: landing page, `/app` (positions), `/app/create`, `/proof/[chainId]/[id]`. wagmi + viem + RainbowKit. |
| `landing/` | Original static landing page prototype. |

## Contracts

```bash
git clone --recurse-submodules https://github.com/wealthy-org/hyperflow.git
cd hyperflow/contracts
forge test
```

Supported tokens: standard ERC‑20s with fixed balances and transfer amounts. Fee-on-transfer tokens are rejected at deposit; rebasing tokens are not supported. Not audited.

Deploy to Elysium testnet (chain 99801):

```bash
forge script script/Deploy.s.sol --rpc-url elysium_testnet --broadcast -i 1 --sender <your address>
```

## Web

```bash
cd web
cp .env.example .env.local   # set NEXT_PUBLIC_ESCROW_99801 after deploying
npm install
npm run dev
```

All position data is read from the contract; there is no database. For local development, run `anvil`, deploy to it, and set `NEXT_PUBLIC_ENABLE_LOCAL=1` and `NEXT_PUBLIC_ESCROW_31337` (see `web/.env.example`).
