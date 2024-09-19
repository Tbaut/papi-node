import { wnd } from '@polkadot-api/descriptors';
import { Binary, createClient } from 'polkadot-api';
import { getWsProvider } from 'polkadot-api/ws-provider/node';
import { sr25519CreateDerive } from '@polkadot-labs/hdkd';
import {
  DEV_PHRASE,
  entropyToMiniSecret,
  mnemonicToEntropy,
} from '@polkadot-labs/hdkd-helpers';
import { getPolkadotSigner } from 'polkadot-api/signer';

const main = async () => {
  // ALICE ACCOUNT
  const derive = sr25519CreateDerive(
    entropyToMiniSecret(mnemonicToEntropy(DEV_PHRASE)),
  );
  const aliceKeyPair = derive('//Bob');
  const aliceSigner = getPolkadotSigner(
    aliceKeyPair.publicKey,
    'Sr25519',
    aliceKeyPair.sign,
  );

  // CLIENT AND API
  const client = createClient(
    getWsProvider('wss://rpc-test-network-1.novasamatech.org'),
  );
  const api = client.getTypedApi(wnd);

  // create the call from some call-data
  const tx = await api.txFromCallData(
    Binary.fromHex(
      '0x0402001cbd2d43530a44705ad088af313e18f80b53ef16b36177cd4b77b846f2a5f07c001cbd2d43530a44705ad088af313e18f80b53ef16b36177cd4b77b846f2a5f07c0b00a0724e1809',
    ),
  );
  // create the signed extrinsic
  const signedTx = await tx.sign(aliceSigner);
  // see what the result of this extrinsic would be against the current best-block
  const dryRunResult = await api.apis.BlockBuilder.apply_extrinsic(
    Binary.fromOpaqueHex(signedTx),
    { at: 'best' },
  );
  // `dryRunResult` is a strongly typed object, so if `success` is false, then
  // the value will have a strongly typed enum with the reason why it didn't succeed
  console.log('dryRunResult', dryRunResult);
  // In your case it would print:
  // {
  //  success: false,
  //  value: {
  //    type: "Invalid",
  //    value: {
  //      type: "ExhaustsResources",
  //      value: undefined,
  //    },
  //  },
  // }

  // Therefore, you could first check whether the dryRun worked before
  // broadcasting the transaction
  if (dryRunResult.success) {
    const submitResult = await client.submit(signedTx);
  } else {
    // some error handling logic
  }
};

main();
