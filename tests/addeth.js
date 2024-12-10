require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');

async function distributeETH(amountPerAccount) {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  // Read accounts from the file
  const accountData = JSON.parse(fs.readFileSync('accounts.json', 'utf8'));

  console.log(`Distributing ${amountPerAccount} ETH to ${accountData.length} accounts...`);

  for (let i = 0; i < accountData.length; i++) {
    const recipientAddress = accountData[i].address;

    try {
      const tx = await wallet.sendTransaction({
        to: recipientAddress,
        value: ethers.parseEther(amountPerAccount.toString())
      });

      await tx.wait();
      console.log(`Sent ${amountPerAccount} ETH to ${recipientAddress}`);
    } catch (error) {
      console.error(`Error sending ETH to ${recipientAddress}:`, error);
    }
  }

  console.log('ETH distribution completed.');
}

// Usage
const amountPerAccount = 0.0002; // Amount of ETH to send to each account
distributeETH(amountPerAccount).catch(console.error);