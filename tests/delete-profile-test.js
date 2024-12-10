require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');

const profileManagerAbi = [
  {
    "inputs": [],
    "name": "deleteProfile",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_address",
        "type": "address"
      }
    ],
    "name": "hasProfile",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

async function testDeleteProfile() {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const profileContract = new ethers.Contract(
    process.env.PROFILE_CONTRACT_ADDRESS,
    profileManagerAbi,
    provider
  );

  // Read test accounts from file
  const accountData = JSON.parse(fs.readFileSync('accounts.json', 'utf8'));

  console.log('Testing deleteProfile function...');

  for (let i = 0; i < accountData.length; i++) {
    const wallet = new ethers.Wallet(accountData[i].privateKey, provider);
    const connectedProfileContract = profileContract.connect(wallet);

    // Check if profile exists
    const hasProfile = await profileContract.hasProfile(wallet.address);
    if (!hasProfile) {
      console.log(`Account ${wallet.address} has no profile. Skipping...`);
      continue;
    }

    try {
      // Test deleting profile
      const tx = await connectedProfileContract.deleteProfile();
      await tx.wait();
      console.log(`Profile deleted for account ${wallet.address}`);

      // Verify profile was deleted
      const profileExists = await profileContract.hasProfile(wallet.address);
      console.log(`Profile exists verification after deletion: ${profileExists}`);
      
      if (profileExists) {
        console.error(`Profile deletion failed for account ${wallet.address}`);
      }

    } catch (error) {
      console.error(`Error deleting profile for account ${wallet.address}:`, error);
    }
  }

  console.log('Delete profile testing completed.');
}

// Usage
testDeleteProfile().catch(console.error);