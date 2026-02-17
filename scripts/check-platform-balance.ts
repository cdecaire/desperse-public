/**
 * Check platform authority wallet balance
 */
import 'dotenv/config';
import { Connection, PublicKey } from '@solana/web3.js';

async function main() {
  const rpcUrl = process.env.HELIUS_API_KEY 
    ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
    : 'https://api.mainnet-beta.solana.com';
  
  const connection = new Connection(rpcUrl, 'confirmed');
  
  // Platform authority wallet
  const platformAuthority = new PublicKey('5wGjfxu2HN2UBmwQWwt2zVyr35oGvVVGHznGbNoiWcU5');
  
  // Platform wallet (receives fees)
  const platformWallet = new PublicKey(process.env.VITE_PLATFORM_WALLET_ADDRESS || '5wGjfxu2HN2UBmwQWwt2zVyr35oGvVVGHznGbNoiWcU5');
  
  console.log('Checking balances...\n');
  
  const authorityBalance = await connection.getBalance(platformAuthority);
  console.log(`Platform Authority (5wGjfxu2HN2UBmwQWwt2zVyr35oGvVVGHznGbNoiWcU5):`);
  console.log(`  Balance: ${authorityBalance / 1e9} SOL (${authorityBalance} lamports)`);
  console.log(`  Minimum needed for Core minting: ~0.05 SOL`);
  console.log(`  Status: ${authorityBalance >= 50_000_000 ? '✅ OK' : '⚠️ LOW - NEEDS FUNDING'}`);

  if (!platformWallet.equals(platformAuthority)) {
    const walletBalance = await connection.getBalance(platformWallet);
    console.log(`\nPlatform Fee Wallet (${platformWallet.toBase58()}):`);
    console.log(`  Balance: ${walletBalance / 1e9} SOL`);
  }

  if (authorityBalance < 50_000_000) {
    console.log('\n🚨 ACTION NEEDED:');
    console.log(`   Send at least 0.1 SOL to the platform authority wallet:`);
    console.log(`   ${platformAuthority.toBase58()}`);
    console.log(`\n   This wallet pays for account creation during NFT minting.`);
    console.log(`   Core Collection creation costs ~0.025 SOL, each edition ~0.003 SOL.`);
    console.log(`   Minting fee collected from buyers: 0.01 SOL each.`);
  }
}

main().catch(console.error);

