require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');

const spaceFactoryAbi = [
    "function isMember(uint256 _spaceId, address _userAddress) view returns (bool)",
    "function getSpaceExecutor(uint256 _spaceId) view returns (address)"
];

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

async function testCreateETHProposal() {
    console.log('Starting create ETH transfer proposal test...');

    // Configuration
    const SPACE_ID = process.env.TEST_SPACE_ID || "9";
    const TO_ADDRESS = "0x0a5b7D10Ac292D91a80F83CB75478b899964e859";
    const ETH_AMOUNT = ethers.parseEther("0.0001");
    const VOTING_DURATION = 7 * 24 * 60 * 60;

    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const accountData = JSON.parse(fs.readFileSync('accounts.json', 'utf8'));
    const wallet = new ethers.Wallet(accountData[0].privateKey, provider);
    
    console.log('\nDebug Information:');
    console.log('Wallet address:', wallet.address);
    console.log('Space ID:', SPACE_ID);
    console.log('DAO Proposals address:', process.env.DAO_PROPOSALS_ADDRESS);
    console.log('Space Factory address:', process.env.DAO_SPACE_FACTORY_ADDRESS);

    const spaceFactory = new ethers.Contract(
        process.env.DAO_SPACE_FACTORY_ADDRESS,
        spaceFactoryAbi,
        provider
    );

    const isMember = await spaceFactory.isMember(SPACE_ID, wallet.address);
    console.log('\nMembership check:', isMember);
    if (!isMember) {
        throw new Error(`Account ${wallet.address} is not a member of space ${SPACE_ID}`);
    }

    const executor = await spaceFactory.getSpaceExecutor(SPACE_ID);
    console.log('Space executor:', executor);
    if (executor === '0x0000000000000000000000000000000000000000') {
        throw new Error('Executor not set for space');
    }

    // Create contract instance with signer
    const daoProposals = new ethers.Contract(
        process.env.DAO_PROPOSALS_ADDRESS,
        daoProposalsAbi,
        wallet
    );

    try {
        console.log('\nCreating proposal for ETH transfer:');
        console.log('- Amount:', ethers.formatEther(ETH_AMOUNT), 'ETH');
        console.log('- To:', TO_ADDRESS);
        console.log('- Duration:', VOTING_DURATION, 'seconds');

        // Create execution data for the executor contract
        const executionData = ethers.AbiCoder.defaultAbiCoder().encode(
            ["address", "uint256", "bytes"],
            [TO_ADDRESS, ETH_AMOUNT, "0x"]
        );

        console.log('Encoded execution data:', executionData);
        
        // Create proposal transaction
        const tx = await daoProposals.createProposal(
            SPACE_ID,
            "ETH Transfer Proposal",
            `Proposal to transfer ${ethers.formatEther(ETH_AMOUNT)} ETH to ${TO_ADDRESS}`,
            VOTING_DURATION,
            executor, // Using executor as target since it will handle the transfer
            executionData, // Encoded parameters for executor
            0, // No value needed in proposal creation
            {
                gasLimit: 500000
            }
        );

        console.log('\nTransaction sent:', tx.hash);
        
        const receipt = await tx.wait();
        
        if (receipt.status === 1) {
            console.log('\n✅ Proposal creation successful');
            console.log(`- Transaction hash: ${receipt.hash}`);
            console.log(`- Gas used: ${receipt.gasUsed.toString()}`);
            
            // Find ProposalCreated event
            const proposalCreatedTopic = ethers.id(
                "ProposalCreated(uint256,uint256,uint256,uint256,address,address)"
            );
            const event = receipt.logs.find(log => log.topics[0] === proposalCreatedTopic);
            
            if (event) {
                console.log('- ProposalCreated event emitted');
            }
        } else {
            throw new Error('Transaction failed');
        }

    } catch (error) {
        console.error('\nError details:', {
            message: error.message,
            code: error.code,
            reason: error.reason,
            error: error
        });

        if (error.transaction) {
            console.log('\nTransaction details:', {
                to: error.transaction.to,
                from: error.transaction.from,
                data: error.transaction.data,
                value: error.transaction.value
            });
        }
    }
}

testCreateETHProposal().catch(console.error);