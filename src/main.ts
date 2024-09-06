import { sr25519CreateDerive } from '@polkadot-labs/hdkd';
import {
  entropyToMiniSecret,
  mnemonicToEntropy,
} from '@polkadot-labs/hdkd-helpers';
import { getPolkadotSigner } from 'polkadot-api/signer';
import { wnd } from '@polkadot-api/descriptors';
import { Binary, createClient } from 'polkadot-api';
import { getWsProvider } from 'polkadot-api/ws-provider/node';

const main = async () => {
  const aliceKeyPair = sr25519CreateDerive(
    entropyToMiniSecret(mnemonicToEntropy('YOUR_MNEMONIC_HERE')),
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

  // create the call from some call-data
  // here a batch with a remark, and a system.setCode that we're not allowed to do
  const tx = await api.txFromCallData(
    Binary.fromHex('0x10000800002c73686f756c6420776f726b000208beef'),
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
  console.log(dryRunResult);
  // { success: true, value: { success: true, value: undefined } }

  // The the dry run is successful, but there are errors in the events
  // although the dispatchError is undefined
  if (dryRunResult.success) {
    const submitResult = await client
      .submitAndWatch(signedTx)
      .subscribe((event) => {
        if (event.type === 'txBestBlocksState' && event.found === true) {
          console.log('dispatchError', event.dispatchError);
          event.events.forEach((e) =>
            console.log(
              JSON.stringify(e, (_, v) =>
                typeof v === 'bigint' ? v.toString() : v,
              ),
            ),
          );
        }

        //  dispatchError undefined
        // {"type":"Balances","value":{"type":"Withdraw","value":{"who":"5HbVkMa1pk2aDBv7CGGyN3AQYjy9W3wwGRPd8kSXF1eAVpdX","amount":"127369831879"}}}
        // {"type":"Utility","value":{"type":"ItemCompleted"}}
        // {"type":"Utility","value":{"type":"BatchInterrupted","value":{"index":1,"error":{"type":"BadOrigin"}}}}
        // {"type":"Balances","value":{"type":"Deposit","value":{"who":"5HbVkMa1pk2aDBv7CGGyN3AQYjy9W3wwGRPd8kSXF1eAVpdX","amount":"0"}}}
        // {"type":"Balances","value":{"type":"Deposit","value":{"who":"5G1ojzh47Yt8KoYhuAjXpHcazvsoCXe3G8LZchKDvumozJJJ","amount":"127369831879"}}}
        // {"type":"TransactionPayment","value":{"type":"TransactionFeePaid","value":{"who":"5HbVkMa1pk2aDBv7CGGyN3AQYjy9W3wwGRPd8kSXF1eAVpdX","actual_fee":"127369831879","tip":"0"}}}
        // {"type":"System","value":{"type":"ExtrinsicSuccess","value":{"dispatch_info":{"weight":{"ref_time":"129165303376","proof_size":"1485"},"class":{"type":"Normal"},"pays_fee":{"type":"Yes"}}}}}
      });
  } else {
    console.log('dryrun failed');
  }
};

main();
