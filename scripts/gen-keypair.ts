import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import bs58 from 'bs58'
import * as fs from 'node:fs'
import * as path from 'node:path'

const umi = createUmi('https://api.devnet.solana.com')
const kp = umi.eddsa.generateKeypair()

// Umi publicKey is a base58 string, secretKey is a Uint8Array (64 bytes)
const address = kp.publicKey.toString()
const privkey = bs58.encode(kp.secretKey)

const outPath = path.join(process.cwd(), 'echoes-fee-payer.json')
fs.writeFileSync(outPath, JSON.stringify(Array.from(kp.secretKey)))

console.log(`Fee payer address: ${address}`)
console.log(`Saved to: ${outPath}`)
console.log(`\nAdd to .env.local:`)
console.log(`ECHOES_FEE_PAYER_PRIVATE_KEY=${privkey}`)
console.log(`PFP_PAYMENT_WALLET=${address}`)
