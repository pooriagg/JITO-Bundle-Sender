import {
    address,
    appendTransactionMessageInstructions,
    createKeyPairSignerFromBytes,
    createSolanaRpc,
    createTransactionMessage,
    lamports,
    mainnet,
    pipe,
    setTransactionMessageFeePayer,
    setTransactionMessageLifetimeUsingBlockhash,
    signTransactionMessageWithSigners,
    getTransactionEncoder
} from "@solana/web3.js";
import {
    getSetComputeUnitLimitInstruction,
    getSetComputeUnitPriceInstruction
} from "@solana-program/compute-budget";
import { getTransferSolInstruction } from "@solana-program/system";
import { getBase58Decoder } from "@solana/codecs";

import { JitoJsonRpcClient } from "jito-js-rpc";


(async () => {
    const payerKeypair = await createKeyPairSignerFromBytes(
        new Uint8Array(
            "<Keypair>"
        )
    );

    const rpc = createSolanaRpc(
        mainnet(
            "<API-KEY>"
        )
    );

    const jitoClient = new JitoJsonRpcClient("https://mainnet.block-engine.jito.wtf/api/v1", "");
    const jitoTipAccount = await jitoClient.getRandomTipAccount();

    // transaction 1
    const latestBlockhash1 = (await rpc.getLatestBlockhash().send()).value;
    const transactionMessage1 = pipe(
        createTransactionMessage({ version: "legacy" }),
        txMsg => setTransactionMessageFeePayer(payerKeypair.address, txMsg),
        txMsg => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash1, txMsg),
        txMsg => appendTransactionMessageInstructions(
            [
                getSetComputeUnitLimitInstruction({ units: 600 }),
                getSetComputeUnitPriceInstruction({ microLamports: 1_000 }),
                getTransferSolInstruction(
                    {
                        source: payerKeypair,
                        destination: "<RECEIVER>",
                        amount: lamports(100n)
                    }
                ),
                // transfer jito-tip
                getTransferSolInstruction(
                    {
                        source: payerKeypair.address,
                        destination: address(jitoTipAccount),
                        amount: lamports(1_000n)
                    }
                )
            ],
            txMsg
        )        
    );
    const fullySignedTransaction1 = await signTransactionMessageWithSigners(transactionMessage1);
    const base58EncodedTx1 = getBase58Decoder().decode(
        getTransactionEncoder().encode(
            fullySignedTransaction1
        )
    );

    // transaction 2
    const latestBlockhash2 = (await rpc.getLatestBlockhash().send()).value;
    const transactionMessage2 = pipe(
        createTransactionMessage({ version: "legacy" }),
        txMsg => setTransactionMessageFeePayer(payerKeypair.address, txMsg),
        txMsg => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash2, txMsg),
        txMsg => appendTransactionMessageInstructions(
            [
                getSetComputeUnitLimitInstruction({ units: 450 }),
                getSetComputeUnitPriceInstruction({ microLamports: 1_000 }),
                getTransferSolInstruction(
                    {
                        source: payerKeypair,
                        destination: "<RECEIVER>",
                        amount: lamports(100n)
                    }
                )
            ],
            txMsg
        )        
    );
    const fullySignedTransaction2 = await signTransactionMessageWithSigners(transactionMessage2);
    const base58EncodedTx2 = getBase58Decoder().decode(
        getTransactionEncoder().encode(
            fullySignedTransaction2
        )
    );

    // send bundle
    const bundleResult = await jitoClient.sendBundle( // Up to 5 transactions
        [
            [
                base58EncodedTx1,
                base58EncodedTx2
            ]
        ]
    );
    console.log("Bundle id: \n", bundleResult.result);

    const inflightStatus = await jitoClient.confirmInflightBundle(bundleResult.result, 100_000); // 100 seconds timeout
    console.log("Inflight status: \n", inflightStatus.confirmation_status);
    // send bundle
})();