require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');

// Work Proposal ABI (only the function we need to encode)
const workProposalAbi = [
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "_spaceId",
                "type": "uint256"
            },
            {
                "internalType": "address",
                "name": "_worker",
                "type": "address"
            },
            {
                "internalType": "string",
                "name": "_title",
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
                "internalType": "uint256",
                "name": "_amount",
                "type": "uint256"
            },
            {
                "internalType": "string",
                "name": "_tokenSymbol",
                "type": "string"
            },
            {
                "internalType": "string[]",
                "name": "_responsibilities",
                "type": "string[]"
            }
        ],
        "name": "assignWork",
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

// Space Factory ABI
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
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "_spaceId",
                "type": "uint256"
            }
        ],
        "name": "getSpaceExecutor",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

// DAO Proposals ABI
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
            },
            {
                "internalType": "uint256",
                "name": "_value",
                "type": "uint256"
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

async function testCreateWorkProposal() {
    console.log('Starting create work proposal test...');

    // Configuration
    const WORK_PROPOSAL_ADDRESS = "0x228CE0ad604305b0053764De9CBa612d22fCbeD5";
    const SPACE_ID = process.env.TEST_SPACE_ID || "9";
    const WORKER_ADDRESS = "0x0a5b7D10Ac292D91a80F83CB75478b899964e859"; // Example worker address
    const WORK_DURATION = 30 * 24 * 60 * 60; // 30 days in seconds
    const WORK_AMOUNT = ethers.parseUnits("100", 6); // Assuming USDC (6 decimals)
    const VOTING_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds
    const VALUE = 0; // Amount of native token to send with the proposal execution

    // Initialize provider
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

    // Read test accounts from file
    const accountData = JSON.parse(fs.readFileSync('accounts.json', 'utf8'));
    const firstAccount = accountData[0];
    
    // Initialize wallet
    const wallet = new ethers.Wallet(firstAccount.privateKey, provider);
    
    console.log('\nDebug Information:');
    console.log('Wallet address:', wallet.address);
    console.log('Space ID:', SPACE_ID);
    console.log('Work Proposal address:', WORK_PROPOSAL_ADDRESS);
    console.log('DAO Proposals address:', process.env.DAO_PROPOSALS_ADDRESS);
    console.log('Space Factory address:', process.env.DAO_SPACE_FACTORY_ADDRESS);

    // Create contract instances
    const spaceFactory = new ethers.Contract(
        process.env.DAO_SPACE_FACTORY_ADDRESS,
        spaceFactoryAbi,
        provider
    );

    // Check if user is a member of the space
    const isMember = await spaceFactory.isMember(SPACE_ID, wallet.address);
    console.log('\nMembership check:');
    console.log('Is member of space:', isMember);
    if (!isMember) {
        console.log(`Account ${wallet.address} is not a member of space ${SPACE_ID}`);
        return;
    }

    // Work assignment parameters
    const workParams = {
        title: "Development Task",
        description: "Implement new feature XYZ",
        responsibilities: [
            "Design system architecture",
            "Implement core functionality",
            "Write tests",
            "Document code"
        ],
        tokenSymbol: "USDC"
    };

    // Create Work Proposal contract instance and encode function data
    const workProposalContract = new ethers.Contract(
        WORK_PROPOSAL_ADDRESS,
        workProposalAbi,
        provider
    );

    const executionData = workProposalContract.interface.encodeFunctionData(
        "assignWork",
        [
            SPACE_ID,
            WORKER_ADDRESS,
            workParams.title,
            workParams.description,
            WORK_DURATION,
            WORK_AMOUNT,
            workParams.tokenSymbol,
            workParams.responsibilities
        ]
    ); 

    console.log('\nProposal parameters:');
    console.log('Target contract:', WORK_PROPOSAL_ADDRESS);
    console.log('Worker address:', WORKER_ADDRESS);
    console.log('Work duration:', WORK_DURATION, 'seconds');
    console.log('Work amount:', ethers.formatUnits(WORK_AMOUNT, 6), workParams.tokenSymbol);
    console.log('Voting duration:', VOTING_DURATION, 'seconds');

    // Create DAO Proposals contract instance
    const daoProposals = new ethers.Contract(
        process.env.DAO_PROPOSALS_ADDRESS,
        daoProposalsAbi,
        wallet
    );

    try {
        console.log('\nSubmitting proposal transaction...');
        
        const tx = await daoProposals.createProposal(
            SPACE_ID,
            "Assign Development Work",
            `Proposal to assign work to ${WORKER_ADDRESS} for ${ethers.formatUnits(WORK_AMOUNT, 6)} ${workParams.tokenSymbol}`,
            VOTING_DURATION,
            WORK_PROPOSAL_ADDRESS,
            executionData,
            VALUE
        );

        console.log('Transaction submitted:', tx.hash);
        
        const receipt = await tx.wait();
        
        // Find ProposalCreated event in the receipt
        const event = receipt.logs.find(
            log => log.topics[0] === ethers.id(
                "ProposalCreated(uint256,uint256,uint256,uint256,address,address)"
            )
        );

        if (event) {
            console.log('\n✅ Proposal creation successful');
            console.log(`- Transaction hash: ${receipt.hash}`);
            console.log(`- Gas used: ${receipt.gasUsed.toString()}`);
        } else {
            console.log('\n❌ Proposal creation verification failed - no ProposalCreated event found');
        }

    } catch (error) {
        if (error.message.includes("insufficient funds")) {
            const balance = await provider.getBalance(wallet.address);
            console.log('\nInsufficient funds error:');
            console.log('Current wallet balance:', ethers.formatEther(balance), 'ETH');
        } else {
            console.error('\nError creating proposal:', error);
        }
    }
}

// Execute the test
testCreateWorkProposal().catch(console.error);