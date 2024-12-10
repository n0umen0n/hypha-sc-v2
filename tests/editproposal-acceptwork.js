require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');

// DAO Proposals ABI (adding the editProposal function)
const daoProposalsAbi = [
    {
        "inputs": [
            {
                "components": [
                    {
                        "internalType": "uint256",
                        "name": "spaceId",
                        "type": "uint256"
                    },
                    {
                        "internalType": "string",
                        "name": "question",
                        "type": "string"
                    },
                    {
                        "internalType": "string",
                        "name": "description",
                        "type": "string"
                    },
                    {
                        "internalType": "uint256",
                        "name": "duration",
                        "type": "uint256"
                    },
                    {
                        "internalType": "address",
                        "name": "targetContract",
                        "type": "address"
                    },
                    {
                        "internalType": "bytes",
                        "name": "executionData",
                        "type": "bytes"
                    },
                    {
                        "internalType": "uint256",
                        "name": "value",
                        "type": "uint256"
                    }
                ],
                "internalType": "struct IDAOProposals.ProposalParams",
                "name": "params",
                "type": "tuple"
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
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "_proposalId",
                "type": "uint256"
            },
            {
                "components": [
                    {
                        "internalType": "uint256",
                        "name": "spaceId",
                        "type": "uint256"
                    },
                    {
                        "internalType": "string",
                        "name": "question",
                        "type": "string"
                    },
                    {
                        "internalType": "string",
                        "name": "description",
                        "type": "string"
                    },
                    {
                        "internalType": "uint256",
                        "name": "duration",
                        "type": "uint256"
                    },
                    {
                        "internalType": "address",
                        "name": "targetContract",
                        "type": "address"
                    },
                    {
                        "internalType": "bytes",
                        "name": "executionData",
                        "type": "bytes"
                    },
                    {
                        "internalType": "uint256",
                        "name": "value",
                        "type": "uint256"
                    }
                ],
                "internalType": "struct IDAOProposals.ProposalParams",
                "name": "params",
                "type": "tuple"
            }
        ],
        "name": "editProposal",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

// Work Proposal ABI (same as in the original script)
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

async function testEditWorkProposal() {
    console.log('Starting edit work proposal test...');

    // Configuration
    const WORK_PROPOSAL_ADDRESS = "0x228CE0ad604305b0053764De9CBa612d22fCbeD5";
    const SPACE_ID = process.env.TEST_SPACE_ID || "9";
    const WORKER_ADDRESS = "0x0a5b7D10Ac292D91a80F83CB75478b899964e859";
    const PROPOSAL_ID = process.env.TEST_PROPOSAL_ID; // ID of the proposal to edit
    
    // Updated parameters
    const UPDATED_WORK_DURATION = 45 * 24 * 60 * 60; // 45 days in seconds
    const UPDATED_WORK_AMOUNT = ethers.parseUnits("150", 6); // Updated USDC amount
    const UPDATED_VOTING_DURATION = 10 * 24 * 60 * 60; // 10 days in seconds
    const VALUE = 0;

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
    console.log('Proposal ID to edit:', PROPOSAL_ID);
    console.log('Work Proposal address:', WORK_PROPOSAL_ADDRESS);

    // Updated work parameters
    const updatedWorkParams = {
        title: "Updated Development Task",
        description: "Updated implementation of feature XYZ with additional requirements",
        responsibilities: [
            "Updated system architecture design",
            "Implementation of enhanced functionality",
            "Comprehensive testing suite",
            "Detailed documentation",
            "Performance optimization"
        ],
        tokenSymbol: "USDC"
    };

    // Create Work Proposal contract instance
    const workProposalContract = new ethers.Contract(
        WORK_PROPOSAL_ADDRESS,
        workProposalAbi,
        provider
    );

    // Encode the updated function data
    const updatedExecutionData = workProposalContract.interface.encodeFunctionData(
        "assignWork",
        [
            SPACE_ID,
            WORKER_ADDRESS,
            updatedWorkParams.title,
            updatedWorkParams.description,
            UPDATED_WORK_DURATION,
            UPDATED_WORK_AMOUNT,
            updatedWorkParams.tokenSymbol,
            updatedWorkParams.responsibilities
        ]
    );

    console.log('\nUpdated proposal parameters:');
    console.log('Target contract:', WORK_PROPOSAL_ADDRESS);
    console.log('Worker address:', WORKER_ADDRESS);
    console.log('Updated work duration:', UPDATED_WORK_DURATION, 'seconds');
    console.log('Updated work amount:', ethers.formatUnits(UPDATED_WORK_AMOUNT, 6), updatedWorkParams.tokenSymbol);
    console.log('Updated voting duration:', UPDATED_VOTING_DURATION, 'seconds');

    // Create DAO Proposals contract instance
    const daoProposals = new ethers.Contract(
        process.env.DAO_PROPOSALS_ADDRESS,
        daoProposalsAbi,
        wallet
    );

    try {
        console.log('\nSubmitting proposal edit transaction...');
        
        const proposalParams = {
            spaceId: SPACE_ID,
            question: "Updated: Assign Development Work",
            description: `Updated proposal to assign work to ${WORKER_ADDRESS} for ${ethers.formatUnits(UPDATED_WORK_AMOUNT, 6)} ${updatedWorkParams.tokenSymbol}`,
            duration: UPDATED_VOTING_DURATION,
            targetContract: WORK_PROPOSAL_ADDRESS,
            executionData: updatedExecutionData,
            value: VALUE
        };

        const tx = await daoProposals.editProposal(
            PROPOSAL_ID,
            proposalParams
        );

        console.log('Edit transaction submitted:', tx.hash);
        
        const receipt = await tx.wait();
        
        // Find ProposalEdited event in the receipt
        const event = receipt.logs.find(
            log => log.topics[0] === ethers.id(
                "ProposalEdited(uint256,uint256,uint256,address,bytes,string,string,uint256,address)"
            )
        );

        if (event) {
            console.log('\n✅ Proposal edit successful');
            console.log(`- Transaction hash: ${receipt.hash}`);
            console.log(`- Gas used: ${receipt.gasUsed.toString()}`);
        } else {
            console.log('\n❌ Proposal edit verification failed - no ProposalEdited event found');
        }

    } catch (error) {
        if (error.message.includes("insufficient funds")) {
            const balance = await provider.getBalance(wallet.address);
            console.log('\nInsufficient funds error:');
            console.log('Current wallet balance:', ethers.formatEther(balance), 'ETH');
        } else {
            console.error('\nError editing proposal:', error);
        }
    }
}

// Execute the test
testEditWorkProposal().catch(console.error);