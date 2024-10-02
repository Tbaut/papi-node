import { Blake2256 } from '@polkadot-api/substrate-bindings';
import { toHex, fromHex } from '@polkadot-api/utils';
import { HexString } from 'polkadot-api';

export const hashFromTx = (tx: HexString) =>
  toHex(Blake2256(fromHex(tx))) as HexString;
