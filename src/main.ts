import { IdentityData, pas, people } from '@polkadot-api/descriptors';
import { Binary, createClient, HexString, type TypedApi } from 'polkadot-api';
// import { withPolkadotSdkCompat } from 'polkadot-api/polkadot-sdk-compat';
import { getWsProvider } from 'polkadot-api/ws-provider/node';
import { JSONprint } from './utils';
import { fromHex, toHex } from 'polkadot-api/utils';
import { Blake2256 } from '@polkadot-api/substrate-bindings';

// const pasWs = getWsProvider('wss://paseo.rpc.amforc.com');
// const pasClient = createClient(pasWs);
// const pasApi = pasClient.getTypedApi(pas);

const pplWs = getWsProvider('wss://polkadot-people-rpc.polkadot.io');
const pplClient = createClient(pplWs);
const peopleApi = pplClient.getTypedApi(people);

// const alepWs = getWsProvider('wss://aleph-zero.api.onfinality.io/public-ws');
// const alepClient = createClient(withPolkadotSdkCompat(alepWs));
// const alepApi = alepClient.getTypedApi(alep);

// const dotWs = getWsProvider('wss://rpc.ibp.network/polkadot');
// const dotClient = createClient(dotWs);
// const dotApi = dotClient.getTypedApi(dot);

// With the `client`, you can get information such as subscribing to the last
// block to get the latest hash:
// pplClient.finalizedBlock$.subscribe((finalizedBlock) =>
//   console.log(finalizedBlock.number, finalizedBlock.hash)
// );

// const polkadotAddress = '12doHFjPjPngNvZCWX4WeF4rkLFJ5LmmEyDvPGQ2C1aPppwy';
// const pplAddress = '13Mg5VGLpLSHKfKhEzicruy7GBqY5MNcRiCyzHK9HvZti9rf';

// const getIdentity = async ({
//   api,
//   type,
//   address,
// }:
//    {
//       type: 'people';
//       api: TypedApi<typeof people>;
//       address: string;
//     }
//   | {
//       type: 'alep';
//       api: TypedApi<typeof alep>;
//       address: string;
//     }) => {
//   const val = await api.query.Identity.IdentityOf.getValue(address);

//   if (!val) {
//     console.log('no val');
//     return;
//   }

//   if (type === 'people') {
//     const [res] = val;
//     console.log('ppl', res.info);
//     return;
//   }

//   if (type === 'alep') {
//     const { info } = val;
//     console.log('alep', info);
//     return;
//   }
// };
const hashFromTx = (tx: HexString) => toHex(Blake2256(fromHex(proxyCallData)));

const proxyCallData =
  '0x1d0000145d6c503d0cf97f4c7725ca773741bd02e1760bfb52e021af5a9f2de283012c00000018626c61626c61';

const address = '5CXQZrh1MSgnGGCdJu3tqvRfCv7t5iQXGGV9UKotrbfhkavs';

const main = async () => {
  peopleApi.query.Identity.IdentityOf.watchValue(address, 'best').subscribe(
    (val) => {
      const id: Record<string, any> = { judgements: [] };
      val?.[0].judgements.forEach(([, judgement]) => {
        id.judgements.push(judgement.type);
      });
      Object.entries(val?.[0]?.info || {}).forEach(([key, value]) => {
        console.log(JSONprint(key), JSONprint(value));
        id[key] = (value as IdentityData).type?.toString();
      });

      // console.log(JSONprint(id));
    },
  );
};

main();
