import {
  IdentityData,
  IdentityJudgement,
  pas,
  people,
} from '@polkadot-api/descriptors';
import { createClient } from 'polkadot-api';
import { getWsProvider } from 'polkadot-api/ws-provider/node';
import { JSONprint } from './utils';
import {
  getDynamicBuilder,
  getLookupFn,
} from '@polkadot-api/metadata-builders';
import {
  AccountId,
  compact,
  createDecoder,
  enhanceDecoder,
  FixedSizeBinary,
  metadata as metadataCodec,
  Struct,
  u8,
  Variant,
  type Decoder,
  type StringRecord,
  type V14,
} from '@polkadot-api/substrate-bindings';
import { Hex } from '@polkadot-api/substrate-bindings';

const pplWs = getWsProvider('wss://polkadot-people-rpc.polkadot.io');
const pplClient = createClient(pplWs);
const pplApi = pplClient.getTypedApi(people);

export interface IdentityInfo extends Record<string, any> {
  judgements: IdentityJudgement['type'][];
  sub?: string;
}

const address = '14sD2iYm1HsFPoHaT2GJNUMD2KJzvJNfVe9PBrG1KGyDBeHn';
const main = async () => {
  const id: IdentityInfo = { judgements: [] };

  const [parentAddress, parentIdentity] =
    (await pplApi.query.Identity.SuperOf.getValue(address, {
      at: 'best',
    })) || [];
  console.log(JSONprint(parentIdentity));

  if (parentAddress && parentIdentity) {
    id.sub =
      (parentIdentity.type !== 'None' &&
        parentIdentity.value &&
        (parentIdentity.value as FixedSizeBinary<3>).asText()) ||
      '';
  }

  pplApi.query.Identity.IdentityOf.getValue(parentAddress || address, {
    at: 'best',
  }).then((val) => {
    val?.[0].judgements.forEach(([, judgement]) => {
      id.judgements.push(judgement.type);
    });
    Object.entries(val?.[0]?.info || {}).forEach(([key, value]) => {
      if ((value as IdentityData)?.type !== 'None') {
        // console.log('key', JSONprint(key));
        // console.log('value', JSONprint(value));
        const text = (value as IdentityData)?.value as
          | FixedSizeBinary<2>
          | undefined;
        if (text) {
          id[key] = text.asText();
        }
      }
    });

    console.log(JSONprint(id));
  });
};

main();
