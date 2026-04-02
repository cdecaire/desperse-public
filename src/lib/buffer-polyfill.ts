/**
 * Buffer polyfill for the browser.
 * Uses the Node.js 'buffer' package which works in both SSR and client.
 * Import this as a side-effect at the top of __root.tsx.
 */
import { Buffer } from 'buffer'

if (typeof globalThis !== 'undefined' && !(globalThis as any).Buffer) {
	;(globalThis as any).Buffer = Buffer
}

export {}
