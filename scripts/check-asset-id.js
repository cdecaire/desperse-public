/**
 * Check transaction and extract asset ID for a cNFT mint
 */

// Use global fetch (Node 18+) or import if needed

const TX_SIGNATURE = process.argv[2] || '2hVJE692pwVVyK5EEQYMQEJr6219h8SL7oYY72BEwYTDVNnaizaeg2nLuaPMGL4QVhmPXcRYqMegGyNFRz9MBeN2';
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
if (!HELIUS_API_KEY) { console.error('HELIUS_API_KEY env var is required'); process.exit(1); }
const RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

async function checkTransaction() {
  console.log('Checking transaction:', TX_SIGNATURE);
  console.log('RPC URL:', RPC_URL.replace(/\?api-key=[^&]+/, '?api-key=***'));
  
  try {
    // Get transaction
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
      console.error('Transaction not found or not yet indexed');
      return;
    }
    
    const logs = txData.result.meta?.logMessages || [];
    console.log('\n=== Transaction Logs ===');
    
    // Look for asset ID in logs
    let assetId = null;
    for (const log of logs) {
      if (log.includes('Leaf asset ID:') || log.includes('leaf asset ID:')) {
        const match = log.match(/[Ll]eaf asset ID: ([A-Za-z0-9]+)/);
        if (match && match[1]) {
          assetId = match[1];
          console.log('✅ Found asset ID in logs:', assetId);
        }
      }
      
      // Also check for other asset-related logs
      if (log.includes('asset') || log.includes('Asset') || log.includes('mint')) {
        console.log('  Log:', log);
      }
    }
    
    if (!assetId) {
      console.log('\n⚠️  Asset ID not found in logs. Transaction may still be indexing.');
      console.log('You can query DAS API later using getAssetsByOwner with the collector address.');
    } else {
      console.log('\n=== Asset ID ===');
      console.log('Asset ID:', assetId);
      console.log('View on Solscan (if supported):', `https://solscan.io/token/${assetId}`);
      console.log('Query DAS API:', `getAsset({ id: "${assetId}" })`);
    }
    
    // Also check transaction status
    console.log('\n=== Transaction Status ===');
    console.log('Slot:', txData.result.slot);
    console.log('Block Time:', txData.result.blockTime ? new Date(txData.result.blockTime * 1000).toISOString() : 'N/A');
    console.log('Status:', txData.result.meta?.err ? 'FAILED' : 'SUCCESS');
    if (txData.result.meta?.err) {
      console.log('Error:', JSON.stringify(txData.result.meta.err, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkTransaction();

