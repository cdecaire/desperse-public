---
name: Privy
description: Use when building authentication systems, embedded wallets, wallet controls, transaction signing, user management, and policy enforcement for blockchain applications. Reach for this skill when implementing user onboarding, wallet creation, transaction signing, multi-sig controls, or server-side wallet automation.
metadata:
    mintlify-proj: privy
    version: "1.0"
---

# Privy Skill Reference

## Product summary

Privy is an authentication and wallet infrastructure platform for blockchain applications. It provides client-side SDKs (React, React Native, Swift, Android, Flutter, Unity) and server-side SDKs (Node, Python, Java, Go, Rust) to build user onboarding, embedded wallets, and transaction signing into your app. Key files: `PrivyProvider` configuration in React apps, authorization keys for server-side control, policies for transaction constraints. Primary docs: https://docs.privy.io

## When to use

Use Privy when:
- Building user authentication with email, SMS, social login, passkeys, or wallet-based login
- Creating embedded wallets for users without requiring separate wallet clients
- Implementing transaction signing and message signing across Ethereum, Solana, Bitcoin, and 50+ blockchains
- Setting up wallet controls: owners, signers, policies, and multi-sig approvals
- Managing user accounts with linked social/wallet accounts
- Automating wallet actions server-side with authorization keys and policies
- Building trading apps, treasury management, agent wallets, or fintech applications
- Enforcing transaction limits, recipient allowlists, or time-based constraints

## Quick reference

### Client-side SDKs

| SDK | Environment | Use case |
|-----|-------------|----------|
| React | Web (Next.js, CRA, Remix) | User login, embedded wallets, transaction signing |
| React Native | Mobile (Expo, bare) | Mobile app authentication and wallets |
| Swift | iOS | Native iOS apps |
| Android | Android | Native Android apps |
| Flutter | Cross-platform | Flutter apps |
| Unity | Game engines | Unity games |

### Server-side SDKs

| SDK | Environment | Use case |
|-----|-------------|----------|
| Node (@privy-io/node) | Node, Deno, Bun, Edge | Wallet creation, policies, user management |
| Python | Python backends | Server-side wallet operations |
| Java | Java backends | Enterprise wallet management |
| Go | Go backends | High-performance wallet operations |
| Rust | Rust backends | Systems-level wallet control |

### Core configuration (React)

```tsx
<PrivyProvider
  appId="your-privy-app-id"
  clientId="optional-app-client-id"
  config={{
    embeddedWallets: {
      ethereum: { createOnLogin: 'users-without-wallets' },
      solana: { createOnLogin: 'users-without-wallets' }
    },
    loginMethods: ['email', 'sms', 'google', 'wallet'],
    appearance: { walletList: ['metamask', 'phantom'] }
  }}
>
  {children}
</PrivyProvider>
```

### REST API authentication

All API requests require:
- `Authorization: Basic {base64(appId:appSecret)}`
- `privy-app-id: {appId}`

### Key hooks (React)

| Hook | Purpose |
|------|---------|
| `usePrivy()` | Access user, login, logout, ready state |
| `useWallets()` | Get connected wallets, create wallets |
| `useSignMessage()` | Sign messages with wallet |
| `useSignTransaction()` | Sign transactions |
| `useSendTransaction()` | Send transactions |

### Wallet control models

| Model | Owner | Signers | Use case |
|-------|-------|---------|----------|
| User-owned | User | None | Self-custodial consumer wallets |
| User + server | User | Server (scoped) | Automated trading, limit orders |
| App-owned | Authorization key | Multiple keys | Treasury, bots, agents |
| Custodial | Custodian | Custodian | Regulated custody, FBO accounts |

## Decision guidance

### When to use embedded vs external wallets

| Scenario | Embedded | External |
|----------|----------|----------|
| New users, no crypto experience | ✓ | |
| Users have existing wallets | | ✓ |
| Seamless onboarding required | ✓ | |
| Power users, self-custody preference | | ✓ |
| Cross-chain support needed | ✓ | ✓ |
| Mobile app | ✓ | ✓ |

### When to use Privy auth vs JWT-based auth

| Scenario | Privy auth | JWT-based |
|----------|-----------|-----------|
| Building from scratch | ✓ | |
| Existing auth system | | ✓ |
| Multiple login methods needed | ✓ | |
| Social login required | ✓ | |
| Custom auth provider | | ✓ |
| MFA for wallets | ✓ | ✓ |

### When to use policies vs signers

| Scenario | Policies | Signers |
|----------|----------|---------|
| Enforce transaction limits | ✓ | |
| Restrict recipient addresses | ✓ | |
| Delegate scoped permissions | | ✓ |
| Require multi-sig approval | ✓ | ✓ |
| Time-based constraints | ✓ | |
| Server automation | | ✓ |

## Workflow

### 1. Set up authentication

1. Create app in Privy Dashboard, get app ID and app secret
2. Wrap app with `PrivyProvider` (client-side) or initialize `PrivyClient` (server-side)
3. Configure login methods: email, SMS, social, wallet, passkey
4. Test login flow with `usePrivy()` hook or `useLogin()` method
5. Verify user object contains linked accounts

### 2. Create and manage wallets

1. Enable embedded wallets in PrivyProvider config or create via API
2. Set `createOnLogin` to auto-create wallets on user signup
3. Access wallet with `useWallets()` hook (client) or `wallets().get()` (server)
4. Specify wallet owner: user ID (self-custodial) or authorization key (app-controlled)
5. Optionally add signers for delegated permissions

### 3. Implement transaction signing

1. Get connected wallet from `useWallets()` or API
2. Build transaction object (to, data, value, etc.)
3. Call `signTransaction()` or `sendTransaction()` with wallet
4. Handle user confirmation modal (client-side) or authorization context (server-side)
5. Monitor transaction status via webhooks or polling

### 4. Set up policies and controls

1. Create authorization key via Dashboard or `generateP256KeyPair()` (Node SDK)
2. Define policy rules: amount limits, recipient allowlists, contract restrictions
3. Assign policy to wallet signer or owner
4. Test policy enforcement by attempting restricted transaction
5. Update policies via API if constraints change

### 5. Monitor wallet activity

1. Register webhook endpoint in Dashboard
2. Subscribe to events: `wallet.funds_deposited`, `transaction.confirmed`, `user.created`
3. Verify webhook signature using Privy's public key
4. Parse webhook payload and update app state
5. Implement retry logic for failed webhook deliveries

## Common gotchas

- **Forgot to wait for `ready`**: Always check `usePrivy().ready` before accessing user state or wallets. Privy initializes async.
- **Authorization key not saved**: Private keys are generated once and never stored by Privy. Save immediately or lose access.
- **Wrong SDK for environment**: Use client SDKs for frontend, server SDKs for backend. Mixing causes auth failures.
- **Missing app ID or secret**: REST API calls fail silently without proper `Authorization` header and `privy-app-id` header.
- **Policies not enforced on client**: Policies are evaluated server-side in secure enclaves. Client-side validation is UX only.
- **Wallet not created on login**: Set `createOnLogin: 'users-without-wallets'` in config. Default is `'off'`.
- **Identity tokens not enabled**: Enable in Dashboard under User management > Authentication > Advanced before using.
- **Solana RPC not configured**: Solana wallets require RPC endpoints in `config.solana.rpcs`. Ethereum uses default providers.
- **Webhook signature verification skipped**: Always verify webhook signatures to prevent spoofing.
- **Deprecated server-auth SDK**: `@privy-io/server-auth` is deprecated. Use `@privy-io/node` instead.

## Verification checklist

Before submitting work:

- [ ] App ID and app secret are set in environment variables, not hardcoded
- [ ] `PrivyProvider` wraps entire app and `ready` state is checked before use
- [ ] Login methods are configured in Dashboard and match app config
- [ ] Wallets are created with correct owner (user ID or authorization key)
- [ ] Transaction signing includes proper error handling for user cancellation
- [ ] Policies are tested with transactions that should succeed and fail
- [ ] Webhooks are registered and signatures are verified
- [ ] Identity tokens are enabled if accessing user data server-side
- [ ] Authorization keys are securely stored (not in version control)
- [ ] Rate limits are handled with retry logic on API calls

## Resources

- **Comprehensive navigation**: https://docs.privy.io/llms.txt
- **Key concepts and architecture**: https://docs.privy.io/basics/key-concepts
- **React SDK setup and quickstart**: https://docs.privy.io/basics/react/setup
- **REST API reference**: https://docs.privy.io/api-reference/introduction
- **Wallet controls and policies**: https://docs.privy.io/controls/overview

---

> For additional documentation and navigation, see: https://docs.privy.io/llms.txt