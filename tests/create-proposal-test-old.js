require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');

// ERC20 interface for encoding transfer function
const ERC20_ABI = [
    "function transfer(address to, uint256 amount) returns (bool)"
];

// DAO Proposals ABI (only what we need for this test)
const daoProposalsAbi = [
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "_spaceId",
                "type": "uint256"
            },
            {
                "internalType": "string",
                "name": "_question",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "_description",
                "type": "string"
            },
            {
                "internalType": "uint256",
                "name": "_duration",
                "type": "uint256"
            },
            {
                "internalType": "address",
                "name": "_targetContract",
                "type": "address"
            },
            {
                "internalType": "bytes",
                "name": "_executionData",
                "type": "bytes"
            }
        ],
        "name": "createProposal",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

async function testCreateProposal() {
    console.log('Starting create proposal test...');

    // Configuration
    const SPACE_ID = process.env.TEST_SPACE_ID || "7";
    const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    const FROM_ADDRESS = "0xDB6b07b9eca2cbB8EDA8D1f0747D2C51f1C938aC";
    const TO_ADDRESS = "0x0a5b7D10Ac292D91a80F83CB75478b899964e859";
    const AMOUNT = ethers.parseUnits("0.0001", 6); // USDC has 6 decimals
    const VOTING_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds

    // Read test accounts from file
    let accountData;
    try {
        accountData = JSON.parse(fs.readFileSync('accounts.json', 'utf8'));
        console.log('Loaded test accounts');
    } catch (error) {
        console.error('Error loading accounts.json:', error);
        return;
    }

    // Use the first account from the file
    const firstAccount = accountData[0];
    if (!firstAccount) {
        console.error('No accounts found in accounts.json');
        return;
    }

    // Initialize provider and contracts
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const wallet = new ethers.Wallet(firstAccount.privateKey, provider);
    
    // Create USDC contract instance to encode the transfer function
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
    
    // Encode the transfer function call
    const executionData = usdcContract.interface.encodeFunctionData(
        "transfer",
        [TO_ADDRESS, AMOUNT]
    );

    // Create DAO Proposals contract instance
    const daoProposals = new ethers.Contract(
        process.env.DAO_PROPOSALS_ADDRESS,
        daoProposalsAbi,
        wallet
    );

    try {
        console.log(`Creating proposal from address: ${wallet.address}`);
        console.log(`Target contract (USDC): ${USDC_ADDRESS}`);
        console.log(`Transfer amount: 0.0001 USDC`);
        console.log(`From: ${FROM_ADDRESS}`);
        console.log(`To: ${TO_ADDRESS}`);

        // Create the proposal
        const tx = await daoProposals.createProposal(
            SPACE_ID,
            "USDC Transfer Proposal",
            "Proposal to transfer 0.0001 USDC from treasury to specified address",
            VOTING_DURATION,
            USDC_ADDRESS,
            executionData,
            {
                gasLimit: 500000 // Using fixed gas limit as fallback
            }
        );

        console.log(`Transaction hash: ${tx.hash}`);
        
        const receipt = await tx.wait();
        console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
        console.log(`Gas used: ${receipt.gasUsed.toString()}`);

        // Look for ProposalCreated event
        const proposalCreatedEvent = receipt.logs.find(
            log => log.topics[0] === ethers.id("ProposalCreated(uint256,uint256,uint256,uint256,address,address)")
        );

        if (proposalCreatedEvent) {
            console.log('✅ Proposal created successfully');
            // You could decode the event to get the proposal ID if needed
        } else {
            console.log('❌ Proposal creation verification failed - no ProposalCreated event found');
        }

    } catch (error) {
        console.log('\nError creating proposal:');
        if (error.message.includes("execution reverted")) {
            console.log('Error: Transaction reverted -', error.reason || 'Unknown reason');
        } else {
            console.log('Error:', error.message);
        }
    }
}

// Execute the test
testCreateProposal().catch(console.error);