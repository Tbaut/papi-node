import { sr25519CreateDerive } from '@polkadot-labs/hdkd';
import {
  entropyToMiniSecret,
  mnemonicToEntropy,
} from '@polkadot-labs/hdkd-helpers';
import { getPolkadotSigner } from 'polkadot-api/signer';
import { wnd } from '@polkadot-api/descriptors';
import { Binary, createClient } from 'polkadot-api';
import { getWsProvider } from 'polkadot-api/ws-provider/node';
import { withPolkadotSdkCompat } from 'polkadot-api/polkadot-sdk-compat';

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
    withPolkadotSdkCompat(getWsProvider('wss://rpc.dotters.network/westend')),
  );
  const api = client.getTypedApi(wnd);

  const firstTx = api.tx.System.remark({
    remark: Binary.fromText('hello world 1'),
  });

  firstTx.signSubmitAndWatch(aliceSigner, { at: 'best' }).subscribe({
    next: async (event) => {
      if (event.type === 'txBestBlocksState' && event.found === true) {
        console.log('1 in block');

        // create the 2nd tx
        const secondTx = api.tx.System.remark({
          remark: Binary.fromText('hello world 2'),
        });

        secondTx.signSubmitAndWatch(aliceSigner, { at: 'best' }).subscribe({
          next: (e) => console.log(2, JSONprint(e)),
          error: (e) => console.log(2, JSONprint(e)),
        });
      }
    },
    error: (e) => console.log(1, JSONprint(e)),
  });
};

main();
