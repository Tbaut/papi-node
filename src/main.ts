import { sr25519CreateDerive } from '@polkadot-labs/hdkd';
import {
  entropyToMiniSecret,
  mnemonicToEntropy,
} from '@polkadot-labs/hdkd-helpers';
import { getPolkadotSigner } from 'polkadot-api/signer';
import { wnd } from '@polkadot-api/descriptors';
import { Binary, createClient } from 'polkadot-api';
import { getWsProvider } from 'polkadot-api/ws-provider/node';

const JSONprint = (e: unknown) =>
  JSON.stringify(e, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 4);

const main = async () => {
  if (!process.env.MNEMONIC) {
    throw new Error('MNEMONIC not set');
  }

  const aliceKeyPair = sr25519CreateDerive(
    entropyToMiniSecret(mnemonicToEntropy(process.env.MNEMONIC)),
  )('');

  const aliceSigner = getPolkadotSigner(
    aliceKeyPair.publicKey,
    'Sr25519',
    aliceKeyPair.sign,
  );

  // CLIENT AND API
  const client = createClient(
    getWsProvider('wss://rpc.dotters.network/westend'),
  );
  const api = client.getTypedApi(wnd);

  const firstTx = api.tx.System.remark({
    remark: Binary.fromText('hello world 1'),
  });

  // create the 1st signed extrinsic
  const signedTx = await firstTx.sign(aliceSigner, { at: 'best' });

  await client.submitAndWatch(signedTx).subscribe({
    next: async (event) => {
      if (event.type === 'txBestBlocksState' && event.found === true) {
        console.log('1 in block');

        // create the 1nd signed extrinsic
        const secondTx = api.tx.System.remark({
          remark: Binary.fromText('hello world 2'),
        });

        const secondSignedTx = await secondTx.sign(aliceSigner, { at: 'best' });

        client.submitAndWatch(secondSignedTx).subscribe({
          next: (e) => console.log(2, JSONprint(e)),
          error: (e) => console.log(2, JSONprint(e)),
        });
      }
    },
    error: (e) => console.log(1, JSONprint(e)),
  });
};

main();
