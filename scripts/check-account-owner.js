/**
 * Check what program owns an account
 */

const TARGET_ADDRESS = process.argv[2] || 'xbjrXnY2Cgua4cB4L5xGHYwbUov5wG1w6m9LujD2oGz';
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
if (!HELIUS_API_KEY) { console.error('HELIUS_API_KEY env var is required'); process.exit(1); }
const RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

// Known Bubblegum program ID
const BUBBLEGUM_PROGRAM = 'BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY';

async function checkAccount() {
  console.log('Checking account:', TARGET_ADDRESS);
  console.log('');
  
  try {
    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getAccountInfo',
        params: [
          TARGET_ADDRESS,
          {
            encoding: 'base64',
          },
        ],
      }),
    });
    
    const data = await response.json();
    
    if (data.error) {
      console.error('Error:', data.error);
      return;
    }
    
    if (!data.result || !data.result.value) {
      console.log('Account does not exist or has no data');
      return;
    }
    
    const account = data.result.value;
    const owner = account.owner;
    const lamports = account.lamports;
    const executable = account.executable;
    const rentEpoch = account.rentEpoch;
    
    console.log('=== Account Info ===');
    console.log('Address:', TARGET_ADDRESS);
    console.log('Owner Program:', owner);
    console.log('Is Bubblegum Program:', owner === BUBBLEGUM_PROGRAM);
    console.log('Balance:', lamports / 1e9, 'SOL');
    console.log('Executable:', executable);
    console.log('Rent Epoch:', rentEpoch);
    console.log('Data Length:', account.data?.[0]?.length || 0, 'bytes');
    
    if (owner === BUBBLEGUM_PROGRAM) {
      console.log('\n✅ This is a Bubblegum program account!');
      console.log('This is likely:');
      console.log('- A program-derived address (PDA) for the Merkle tree');
      console.log('- A Bubblegum program account that stores tree state');
      console.log('- The funds sent here were for rent/maintaining the account');
    } else {
      console.log('\n⚠️  This account is owned by a different program:', owner);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAccount();

