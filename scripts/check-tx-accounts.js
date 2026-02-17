/**
 * Check transaction accounts and identify the address in question
 */

const TX_SIGNATURE = '2hVJE692pwVVyK5EEQYMQEJr6219h8SL7oYY72BEwYTDVNnaizaeg2nLuaPMGL4QVhmPXcRYqMegGyNFRz9MBeN2';
const TARGET_ADDRESS = 'xbjrXnY2Cgua4cB4L5xGHYwbUov5wG1w6m9LujD2oGz';
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
if (!HELIUS_API_KEY) { console.error('HELIUS_API_KEY env var is required'); process.exit(1); }
const RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

async function checkTransaction() {
  console.log('Checking transaction:', TX_SIGNATURE);
  console.log('Looking for address:', TARGET_ADDRESS);
  console.log('');
  
  try {
    const txResponse = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTransaction',
        params: [
          TX_SIGNATURE,
          {
            encoding: 'jsonParsed',
            maxSupportedTransactionVersion: 0,
          },
        ],
      }),
    });
    
    const txData = await txResponse.json();
    
    if (txData.error) {
      console.error('Transaction fetch error:', txData.error);
      return;
    }
    
    if (!txData.result) {
      console.error('Transaction not found');
      return;
    }
    
    const accounts = txData.result.transaction?.message?.accountKeys || [];
    const preBalances = txData.result.meta?.preBalances || [];
    const postBalances = txData.result.meta?.postBalances || [];
    const fee = txData.result.meta?.fee || 0;
    
    console.log('=== All Accounts in Transaction ===');
    let foundTarget = false;
    
    accounts.forEach((acc, i) => {
      const pubkey = typeof acc === 'string' ? acc : acc.pubkey;
      const isSigner = typeof acc === 'object' ? (acc.signer || false) : false;
      const isWritable = typeof acc === 'object' ? (acc.writable || false) : false;
      const pre = preBalances[i] || 0;
      const post = postBalances[i] || 0;
      const diff = post - pre;
      
      if (pubkey === TARGET_ADDRESS) {
        foundTarget = true;
        console.log(`\n🎯 FOUND TARGET ADDRESS at index ${i}:`);
        console.log(`   Address: ${pubkey}`);
        console.log(`   Signer: ${isSigner}`);
        console.log(`   Writable: ${isWritable}`);
        console.log(`   Pre-balance: ${pre / 1e9} SOL`);
        console.log(`   Post-balance: ${post / 1e9} SOL`);
        console.log(`   Balance change: ${diff / 1e9} SOL`);
        console.log(`   Role: ${isSigner ? 'SIGNER (Fee Payer/Tree Authority)' : isWritable ? 'WRITABLE ACCOUNT' : 'READ-ONLY ACCOUNT'}`);
      }
      
      // Show all accounts with balance changes or that are signers
      if (diff !== 0 || isSigner) {
        const marker = pubkey === TARGET_ADDRESS ? ' ⭐ TARGET' : '';
        console.log(`[${i}] ${pubkey}${marker}`);
        console.log(`    Signer: ${isSigner} | Writable: ${isWritable} | Balance: ${pre / 1e9} → ${post / 1e9} SOL (${diff >= 0 ? '+' : ''}${diff / 1e9})`);
      }
    });
    
    if (!foundTarget) {
      console.log(`\n⚠️  Address ${TARGET_ADDRESS} NOT FOUND in transaction accounts`);
      console.log('This might be:');
      console.log('1. A program-derived address (PDA)');
      console.log('2. A program account');
      console.log('3. Not directly involved in this transaction');
    }
    
    console.log('\n=== Transaction Fee ===');
    console.log(`Total fee: ${fee / 1e9} SOL`);
    console.log(`Fee payer: ${accounts.find((acc, i) => {
      const isSigner = typeof acc === 'object' ? (acc.signer || false) : false;
      return isSigner && i === 0; // First signer is typically fee payer
    }) || 'Unknown'}`);
    
    // Check instructions to see what programs were called
    console.log('\n=== Instructions ===');
    const instructions = txData.result.transaction?.message?.instructions || [];
    instructions.forEach((ix, idx) => {
      const programId = typeof ix === 'object' && ix.programId ? ix.programId : 'Unknown';
      console.log(`[${idx}] Program: ${programId}`);
      if (typeof ix === 'object' && ix.parsed) {
        console.log(`    Type: ${ix.parsed.type || 'Unknown'}`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkTransaction();

