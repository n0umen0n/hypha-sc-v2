require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');

// ERC20 interface for encoding transfer function
const ERC20_ABI = [
    "function transfer(address to, uint256 amount) returns (bool)"
];

// Extended DAO Proposals ABI with additional functions for checking conditions
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

// Space Factory ABI for membership check
const spaceFactoryAbi = [
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "_spaceId",
                "type": "uint256"
            },
            {
                "internalType": "address",
                "name": "_userAddress",
                "type": "address"
            }
        ],
        "name": "isMember",
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

async function testCreateProposal() {
    console.log('Starting create proposal test with debug checks...');

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
    
    console.log('\nDebug Information:');
    console.log('Wallet address:', wallet.address);
    console.log('Space ID:', SPACE_ID);
    console.log('DAO Proposals address:', process.env.DAO_PROPOSALS_ADDRESS);
    console.log('Space Factory address:', process.env.DAO_SPACE_FACTORY_ADDRESS);

    // Check if contracts are properly initialized
    if (!process.env.DAO_PROPOSALS_ADDRESS || !process.env.DAO_SPACE_FACTORY_ADDRESS) {
        console.error('Error: Contract addresses not found in .env file');
        return;
    }

    // Create contract instances
    const spaceFactory = new ethers.Contract(
        process.env.DAO_SPACE_FACTORY_ADDRESS,
        spaceFactoryAbi,
        provider
    );

    // Check if user is a member of the space
    try {
        const isMember = await spaceFactory.isMember(SPACE_ID, wallet.address);
        console.log('\nMembership check:');
        console.log('Is member of space:', isMember);
        if (!isMember) {
            console.error('Error: Account is not a member of the space');
            return;
        }
    } catch (error) {
        console.error('Error checking membership:', error.message);
        return;
    }

    // Create USDC contract instance to encode the transfer function
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
    
    // Encode the transfer function call
    const executionData = usdcContract.interface.encodeFunctionData(
        "transfer",
        [TO_ADDRESS, AMOUNT]
    );

    console.log('\nProposal parameters:');
    console.log('Target contract (USDC):', USDC_ADDRESS);
    console.log('Execution data length:', executionData.length);
    console.log('Transfer amount:', ethers.formatUnits(AMOUNT, 6), 'USDC');
    console.log('From:', FROM_ADDRESS);
    console.log('To:', TO_ADDRESS);
    console.log('Voting duration:', VOTING_DURATION, 'seconds');

    // Create DAO Proposals contract instance
    const daoProposals = new ethers.Contract(
        process.env.DAO_PROPOSALS_ADDRESS,
        daoProposalsAbi,
        wallet
    );

    try {
        console.log('\nSubmitting proposal transaction...');
        
        // Estimate gas first
        try {
            const gasEstimate = await daoProposals.createProposal.estimateGas(
                SPACE_ID,
                "USDC Transfer Proposal",
                "Proposal to transfer 0.0001 USDC from treasury to specified address",
                VOTING_DURATION,
                USDC_ADDRESS,
                executionData
            );
            console.log('Estimated gas:', gasEstimate.toString());
        } catch (error) {
            console.log('Gas estimation failed:', error.message);
            // Continue anyway as we'll use a fixed gas limit
        }

        // Create the proposal
        const tx = await daoProposals.createProposal(
            SPACE_ID,
            "USDC Transfer Proposal",
            "Proposal to transfer 0.0001 USDC from treasury to specified address",
            VOTING_DURATION,
            USDC_ADDRESS,
            executionData,
            {
                gasLimit: 1000000 // Increased gas limit
            }
        );

        console.log('Transaction submitted:', tx.hash);
        
        console.log('Waiting for confirmation...');
        const receipt = await tx.wait();
        console.log('Transaction confirmed in block:', receipt.blockNumber);
        console.log('Gas used:', receipt.gasUsed.toString());

        // Look for ProposalCreated event
        const proposalCreatedEvent = receipt.logs.find(
            log => log.topics[0] === ethers.id("ProposalCreated(uint256,uint256,uint256,uint256,address,address)")
        );

        if (proposalCreatedEvent) {
            console.log('✅ Proposal created successfully');
        } else {
            console.log('❌ Proposal creation verification failed - no ProposalCreated event found');
        }

    } catch (error) {
        console.log('\nError creating proposal:');
        if (error.message.includes("execution reverted")) {
            console.log('Transaction reverted. Possible reasons:');
            console.log('1. Space executor not set');
            console.log('2. Invalid voting duration');
            console.log('3. Contracts not initialized');
            console.log('4. Not a space member');
            console.log('\nFull error:', error.message);
        } else {
            console.log('Error:', error.message);
        }
    }
}

// Execute the test
testCreateProposal().catch(console.error);