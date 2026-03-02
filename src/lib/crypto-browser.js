/**
 * Browser shim for Node.js 'crypto' module.
 *
 * @ardrive/turbo-sdk and @dha-team/arbundles import from 'crypto' even in
 * their web builds. This provides real implementations using @noble/hashes
 * (synchronous, pure JS, no Node dependencies) for the functions actually
 * called in our Solana signing code path.
 *
 * Only used during Vite esbuild dep pre-bundling (client-side only).
 * SSR uses real Node crypto — this file is never loaded server-side.
 */

import { sha256 } from "@noble/hashes/sha256";
import { sha384 } from "@noble/hashes/sha512";

export function createHash(algorithm) {
  const chunks = [];
  return {
    update(data) {
      if (typeof data === "string") {
        chunks.push(new TextEncoder().encode(data));
      } else {
        chunks.push(new Uint8Array(data));
      }
      return this;
    },
    digest() {
      const totalLen = chunks.reduce((s, c) => s + c.length, 0);
      const merged = new Uint8Array(totalLen);
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }
      const algo = algorithm.toLowerCase().replace("-", "");
      if (algo === "sha256") return sha256(merged);
      if (algo === "sha384") return sha384(merged);
      throw new Error(`Unsupported hash algorithm: ${algorithm}`);
    },
  };
}

export function randomBytes(size) {
  const buf = new Uint8Array(size);
  globalThis.crypto.getRandomValues(buf);
  return buf;
}

export function createSign() {
  throw new Error("RSA signing not available in browser");
}

export const constants = {
  RSA_PKCS1_PSS_PADDING: 6,
  RSA_PSS_SALTLEN_DIGEST: -1,
};

export default { createHash, randomBytes, createSign, constants };
