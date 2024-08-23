import { dot, people, alep } from '@polkadot-api/descriptors';
import { createClient, type TypedApi } from 'polkadot-api';
import { getWsProvider } from 'polkadot-api/ws-provider/node';

// const pplWs = getWsProvider('wss://polkadot-people-rpc.polkadot.io');
const dotWs = getWsProvider('wss://rpc.ibp.network/polkadot');
// const alepWs = getWsProvider('wss://aleph-zero.api.onfinality.io/public-ws');

// Connect to the polkadot relay chain.
// const pplClient = createClient(pplWs);
const dotClient = createClient(dotWs);
// const alepClient = createClient(alepWs);

// With the `client`, you can get information such as subscribing to the last
// block to get the latest hash:
// pplClient.finalizedBlock$.subscribe((finalizedBlock) =>
//   console.log(finalizedBlock.number, finalizedBlock.hash)
// );

// const peopleApi = pplClient.getTypedApi(people);
const dotApi = dotClient.getTypedApi(dot);
// const alepApi = alepClient.getTypedApi(alep);

const alepAddress = '5DxrqFfMPP6pUigSkSqKgHtgdwe8gtjGRsBNkW9xs9YfdHv8';
const polkadotAddress = '12doHFjPjPngNvZCWX4WeF4rkLFJ5LmmEyDvPGQ2C1aPppwy';
const pplAddress = '12doHFjPjPngNvZCWX4WeF4rkLFJ5LmmEyDvPGQ2C1aPppwy';

const getIdentity = (
  api: TypedApi<typeof alep | typeof dot | typeof people>,
) => {
  api.query.Identity.IdentityOf.getValues([
    [alepAddress],
    [polkadotAddress],
    [pplAddress],
  ])
    .then((val) => {
      val.map(console.log);
    })
    .catch(console.error);
};

getIdentity(dotApi);
// getIdentity(peopleApi);
// getIdentity(alepApi);
