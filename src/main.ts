import { dot, people, alep } from '@polkadot-api/descriptors';
import { createClient, type TypedApi } from 'polkadot-api';
import { withPolkadotSdkCompat } from 'polkadot-api/polkadot-sdk-compat';
import { getWsProvider } from 'polkadot-api/ws-provider/node';

const pplWs = getWsProvider('wss://polkadot-people-rpc.polkadot.io');
const pplClient = createClient(pplWs);
const peopleApi = pplClient.getTypedApi(people);

const alepWs = getWsProvider('wss://aleph-zero.api.onfinality.io/public-ws');
const alepClient = createClient(withPolkadotSdkCompat(alepWs));
const alepApi = alepClient.getTypedApi(alep);

// const dotWs = getWsProvider('wss://rpc.ibp.network/polkadot');
// const dotClient = createClient(dotWs);
// const dotApi = dotClient.getTypedApi(dot);

// With the `client`, you can get information such as subscribing to the last
// block to get the latest hash:
// pplClient.finalizedBlock$.subscribe((finalizedBlock) =>
//   console.log(finalizedBlock.number, finalizedBlock.hash)
// );

const alepAddress = '5Gjy5yh1ZtHFDkqptN2UqyMMqTjPSZSH8nJcz3oTA6Z6Dtmy';
const polkadotAddress = '12doHFjPjPngNvZCWX4WeF4rkLFJ5LmmEyDvPGQ2C1aPppwy';
const pplAddress = '13Mg5VGLpLSHKfKhEzicruy7GBqY5MNcRiCyzHK9HvZti9rf';

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

type IdentityParams =
  | {
      type: 'people';
      api: TypedApi<typeof people>;
      address: string;
    }
  | {
      type: 'alep';
      api: TypedApi<typeof alep>;
      address: string;
    };

const getIdentity = async ({ type, api, address }: IdentityParams) => {
  if (type === 'people') {
    const val = await api.query.Identity.IdentityOf.getValue(address);

    if (!val) {
      console.log('no val');
      return;
    }
    const [res] = val; // api is inferred to be TypedApi<typeof people>
    console.log('ppl', res.info.display.value?.asText());
    return;
  }

  if (type === 'alep') {
    const val = await api.query.Identity.IdentityOf.getValue(address);

    if (!val) {
      console.log('no val');
      return;
    }

    const { info } = val; // api is inferred to be TypedApi<typeof alep>
    console.log('alep', info.display.value?.asText());
    return;
  }
};

// getIdentity(dotApi);
getIdentity({ api: peopleApi, type: 'people', address: pplAddress });
getIdentity({ api: alepApi, type: 'alep', address: alepAddress });
