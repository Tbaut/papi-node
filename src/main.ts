import { hydration } from '@polkadot-api/descriptors';
import { Binary, createClient, Transaction } from 'polkadot-api';
import { getWsProvider } from 'polkadot-api/ws-provider/node';
import { hashFromTx, JSONprint } from './utils';
import {
  getDynamicBuilder,
  getLookupFn,
} from '@polkadot-api/metadata-builders';
import {
  AccountId,
  Bin,
  compact,
  createDecoder,
  enhanceDecoder,
  Hex,
  HexString,
  metadata as metadataCodec,
  Struct,
  Tuple,
  u8,
  Variant,
  type Decoder,
  type StringRecord,
  type V14,
} from '@polkadot-api/substrate-bindings';

const hydraWs = getWsProvider('wss://rpc.hydradx.cloud');
const hydraClient = createClient(hydraWs);
const hydraApi = hydraClient.getTypedApi(hydration);

const opaqueMetadata = Tuple(compact, Bin(Infinity)).dec;

const getExtDecoderAt = async (blockHash?: string) => {
  const rawMetadata = await (blockHash
    ? hydraClient
        ._request<{
          result: HexString;
        }>('archive_unstable_call', [blockHash, 'Metadata_metadata', ''])
        .then((x) => opaqueMetadata(x.result)[1])
    : hydraApi.apis.Metadata.metadata());

  const metadata = metadataCodec.dec(rawMetadata.asBytes()).metadata
    .value as V14;
  const dynBuilder = getDynamicBuilder(getLookupFn(metadata));

  const versionDec = enhanceDecoder(u8[1], (value) => ({
    version: value & ~(1 << 7),
    signed: !!(value & (1 << 7)),
  }));

  const address = Variant({
    Id: AccountId(),
    Raw: Hex(),
    Address32: Hex(32),
    Address20: Hex(20),
  }).dec;
  const signature = Variant({
    Ed25519: Hex(64),
    Sr25519: Hex(64),
    Ecdsa: Hex(65),
  }).dec;

  const extra = Struct.dec(
    Object.fromEntries(
      metadata.extrinsic.signedExtensions.map(
        (x) =>
          [x.identifier, dynBuilder.buildDefinition(x.type)[1]] as [
            string,
            Decoder<any>,
          ],
      ),
    ) as StringRecord<Decoder<any>>,
  );

  const allBytesDec = Hex(Infinity).dec;
  const signedBody = Struct.dec({
    address,
    signature,
    extra,
    callData: allBytesDec,
  });

  return createDecoder((data) => {
    const len = compact.dec(data);
    const { signed, version } = versionDec(data);
    const body = signed ? signedBody : allBytesDec;

    return { len, signed, version, body: body(data) };
  });
};

// const getEncodedCallFromDecodedTx = (
//   decodedTx: any,
//   compatibilityToken: any,
// ) => {
//   const batch = hydraApi.tx.Utility.batch({
//     calls: [decodedTx],
//   }).getEncodedData(compatibilityToken);

//   // we slice the 3 bytes from utility batch
//   return batch.asHex().replace('0x', '').slice(6);
// };

// const getMultisigInfo = async (
//   call: Transaction<any, any, any, any>['decodedCall'],
// ) => {
//   const compatibilityToken = await hydraApi.compatibilityToken;

//   const result: any[] = [];

//   console.log('----for call', JSONprint(call));

//   const getCallResults = (
//     call: Transaction<any, any, any, any>['decodedCall'],
//   ) => {
//     if (call.type === 'Multisig') {
//       if (call.value.type === 'as_multi') {
//         const callDatawithout0x = getEncodedCallFromDecodedTx(
//           call.value.value.call,
//           compatibilityToken,
//         );
//         const callData = `0x${callDatawithout0x}`;
//         const hash = hashFromTx(callData);
//         // console.log('----- callData', callData);
//         // console.log('----- hash', hash);
//         result.push({
//           name: `${call.value.value.call.type}.${call.value.value.call.value.type}`,
//           hash,
//           callData,
//         });
//       } else if (call.value.type === 'approve_as_multi') {
//         result.push({
//           name: 'Unknown call',
//           hash: call.value.value.call_hash,
//           callData: undefined,
//         });
//       }
//     } else {
//       if (!!call.value.value.call) {
//         getCallResults(call.value.value.call);
//       }

//       if (!!call.value.value.calls) {
//         call.value.value.calls.forEach((c: any) => getCallResults(c));
//       }
//     }
//   };

//   getCallResults(call);
//   console.log('result', JSONprint(result));
//   return result;
// };

const main = async () => {
  // see https://hydration.subscan.io/multisig_extrinsic/3422950-2?call_hash=0x139b71c0ceed23715da69f0a04e507308416ba01e42eb98789ca348961e0e225
  const BLOCK_HEIGHT = 3422950;

  const blockHash = (
    await hydraClient._request('archive_unstable_hashByHeight', [BLOCK_HEIGHT])
  )[0];

  if (!blockHash) {
    console.log('no hash found for height', BLOCK_HEIGHT);
    return;
  }

  const body = (await hydraClient._request('archive_unstable_body', [
    blockHash,
  ])) as HexString[];

  // console.log('blockHash', JSONprint(blockHash));
  // console.log('body', JSONprint(body));

  const decoder = await getExtDecoderAt(blockHash);
  // body.forEach((tx) => {
  //   console.log('-----------------------------');
  //   console.log(JSONprint(decoder(tx)));
  // });
  const promises = body.map((tx) => {
    const decodedExtrinsic = decoder(tx);
    const toDecode = decodedExtrinsic.signed
      ? (decodedExtrinsic.body as any).callData
      : decodedExtrinsic.body;
    // console.log('-----------------------------');
    // console.log(JSONprint(decodedExtrinsic));
    return hydraApi.txFromCallData(Binary.fromHex(toDecode));
  });

  Promise.all(promises).then((txs) => {
    console.log('-------------decoded');
    console.log('txs', JSONprint(txs));
    // txs.map((tx) => getMultisigInfo(tx.decodedCall));
  });
};

main();
