import { pas } from '@polkadot-api/descriptors';
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
  metadata as metadataCodec,
  Struct,
  u8,
  Variant,
  type Decoder,
  type StringRecord,
  type V14,
} from '@polkadot-api/substrate-bindings';
import { Hex } from '@polkadot-api/substrate-bindings';

const pasWs = getWsProvider('wss://paseo.rpc.amforc.com');
const pasClient = createClient(pasWs);
const pasApi = pasClient.getTypedApi(pas);

const main = async () => {
  const rawMetadata = await pasApi.apis.Metadata.metadata();

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

  const extrinsicDecoder = createDecoder((data) => {
    const len = compact.dec(data);
    const { signed, version } = versionDec(data);
    const body = signed ? signedBody : allBytesDec;
    return { len, signed, version, body: body(data) };
  });

  const BLOCK_HEIGHT = 14004;

  const blockHash = await pasClient._request('archive_unstable_hashByHeight', [
    BLOCK_HEIGHT,
  ]);

  if (!blockHash[0]) {
    console.log('no hash found for height', BLOCK_HEIGHT);
    return;
  }

  const body = await pasClient._request('archive_unstable_body', [
    blockHash[0],
  ]);

  console.log('blockHash', JSONprint(blockHash[0]));
  console.log('body', JSONprint(body));

  body.forEach((tx: string) => {
    console.log('-----------------------------');
    console.log(JSONprint(extrinsicDecoder(tx)));
  });

  //   blockHash "0x83dae55d34d3bc082e29a6c102522f83b08ad22562e2fdc61eb63c0b2c91c64d"
  //   body [
  //       "0x280403000bb04629c98d01",
  //       "0x3113043600340000000000dab4da908e833ffcfe1311ed09e9eca49ae76356be33b8fa3ce281ed6dd564269e35aa0e69b5d4d2d5908bfdb83e09437ac84a4388cd3d6094257ae482772e8d000100000008163954fa7ae1b75f0f78ca900716f8b65ac70d9bd773f532157c16f91b4142f46cdf8ef1969bb55dbfac08d86995db0479305dfa154ffb832bab2216efd8890002000000a041d52d811c3fe2b98deae48709a1d03bee1afaf0b5dae081df5f2a4c97d60f4e17a70be75220ec9c5d4da770057b05cb0cb8394389fff9febf7aaae2d8a78d00040000008e5a3fa3b8216d45dacd0543303f8665f120acef72d123f0f8dadda2d356724649d06bcadb9da9fc1a576931a92f33b13b25a03d2d2ac2bed51fbdeee4d9ab8000050000008e0654b4fc4b9778fddc7795fb71ba762ae5c56621e8bd25a4e4a99a61ac510ee136adaaa73de77167697fba1f6457ab19e4b9d7b4f70a4a8144efdd2ba3d58100060000003cbf3546f1ad7b9874ce0aa7224979e967bad9893b511aa68d92ef4c46d0f149674dbe65ed20aeba4fb842d3bcf2fe5139179d5d13908f46248cf51f4ad72c8d0007000000308e055a2984661ee41267c8aa090d8b66e825f2b1cd8190c25a54a6c384da0ca955360d339ed066eba8a7b8bf3bf697046fee5790041ce241666b11e67548810008000000c69fcfcfc11c1320c3484d834cbf97860d4d99bc46dd1238e371f1dd2555a00edcc114df7109c6ca4a00ae2c7ffd3db38988477ff9ee6c094eaa936895170782000900000050dbca273e59522a844b7fb6cd6866b651bc9d1b8b70b5efc5d690e67091522071008d64cb524eb3923f95ef98b70f5184671f022b61be41ed659736209aa186000a0000005466f9d2c1544f26d55dc88f894b7e82955eb8d2b9fe6d292de3df69137c2e424d73a11cb83073f7d6eecd0ac811d3fb865f1fb55d3a8a27c05cf97d4589a08b000b000000d6f77ae42bb711dd7b239cef0fdfb181d17c1311f57a7e421a3427285d7c711ca9d4cfa283bd8d58b34cf8101af9eae147be87b9b341a724defce4a02c86958f000c000000d09073e1e76ef97bf8984e5ac01a597ee81303a990c1e8a417715d5d5686f97d81fa4608308d662297c8be5e49a8b70ee7c35aa4ab824021de43c0c4dc291887000d0000003c5179624332b5b6d870a4cbfb06d682af5bd9c56686ed92aeff3c44c6665109e9923254e06452be6e54444c52559cd0f4efdcdbf4d450210060d7c0b8a361840000b5196ea51376ef35716dc54d402d5ffc4c4f27b9a6daf4244330371b8b19bcd0cdda829e2b94ef5106e93e1ccbc85fcb7b09debbcb95b2fb642332c155e87a49c5e8b897b98ee2c9770e070f95d7ee162050dbf80610d19cb7ea7b2f0fbb79d9149a0c0642414245b5010104000000ace1f81000000000f0d2df1a475b0f99c3fda1970d50a66e81d1a001f9ecae6754eab27941c2ad5268484cc470c0ce72378a7f923f17e45519b769a1790e47cacbb9a75c915bb406d1f4c79768b6407381b316e9006c3425d2258cfe56a486d46b5e392a273ede0f04424545468403cc000fbd4e8e6786a8d95e88a43be5fc8a24cfeb3b0fc5cb2eaea24ce652ad0e05424142450101c42b264458677e9a2181a4e81b054e83715271db10b56a2d63b416c8e2dfca0c06f316e7ae155c0bb3d0ec7737594af3b6604f7dd086d69741a429cc44cb248c",
  //       "0x1103840080ee65d694c03331022088ca72d91db7aefd2dbf614fb47c64ba9f1b7a03613f0126b37201367daca7f00a20e26620e9435935f16ea15cfd4806d6ac745e0f3b7d53d0523ce57849002eba9c21944a8f1693eba8e2151f4843b655d29117d1e689f50200001a020805030038ac2aee98d90e65c0c359f322291aedd7910135f22ae2e3161c8702587043c00780b27551331e010200044a64e4fa912554bdf8aeab7071337d6672250aaae8f86e05020bac6e729bd75a001d04000000000000000000"
  //   ]
  //   -----------------------------
  //   {
  //       "len": 10,
  //       "signed": false,
  //       "version": 4,
  //       "body": "0x03000bb04629c98d01"
  //   }
  //   -----------------------------
  //   {
  //       "len": 1228,
  //       "signed": false,
  //       "version": 4,
  //       "body": "0x3600340000000000dab4da908e833ffcfe1311ed09e9eca49ae76356be33b8fa3ce281ed6dd564269e35aa0e69b5d4d2d5908bfdb83e09437ac84a4388cd3d6094257ae482772e8d000100000008163954fa7ae1b75f0f78ca900716f8b65ac70d9bd773f532157c16f91b4142f46cdf8ef1969bb55dbfac08d86995db0479305dfa154ffb832bab2216efd8890002000000a041d52d811c3fe2b98deae48709a1d03bee1afaf0b5dae081df5f2a4c97d60f4e17a70be75220ec9c5d4da770057b05cb0cb8394389fff9febf7aaae2d8a78d00040000008e5a3fa3b8216d45dacd0543303f8665f120acef72d123f0f8dadda2d356724649d06bcadb9da9fc1a576931a92f33b13b25a03d2d2ac2bed51fbdeee4d9ab8000050000008e0654b4fc4b9778fddc7795fb71ba762ae5c56621e8bd25a4e4a99a61ac510ee136adaaa73de77167697fba1f6457ab19e4b9d7b4f70a4a8144efdd2ba3d58100060000003cbf3546f1ad7b9874ce0aa7224979e967bad9893b511aa68d92ef4c46d0f149674dbe65ed20aeba4fb842d3bcf2fe5139179d5d13908f46248cf51f4ad72c8d0007000000308e055a2984661ee41267c8aa090d8b66e825f2b1cd8190c25a54a6c384da0ca955360d339ed066eba8a7b8bf3bf697046fee5790041ce241666b11e67548810008000000c69fcfcfc11c1320c3484d834cbf97860d4d99bc46dd1238e371f1dd2555a00edcc114df7109c6ca4a00ae2c7ffd3db38988477ff9ee6c094eaa936895170782000900000050dbca273e59522a844b7fb6cd6866b651bc9d1b8b70b5efc5d690e67091522071008d64cb524eb3923f95ef98b70f5184671f022b61be41ed659736209aa186000a0000005466f9d2c1544f26d55dc88f894b7e82955eb8d2b9fe6d292de3df69137c2e424d73a11cb83073f7d6eecd0ac811d3fb865f1fb55d3a8a27c05cf97d4589a08b000b000000d6f77ae42bb711dd7b239cef0fdfb181d17c1311f57a7e421a3427285d7c711ca9d4cfa283bd8d58b34cf8101af9eae147be87b9b341a724defce4a02c86958f000c000000d09073e1e76ef97bf8984e5ac01a597ee81303a990c1e8a417715d5d5686f97d81fa4608308d662297c8be5e49a8b70ee7c35aa4ab824021de43c0c4dc291887000d0000003c5179624332b5b6d870a4cbfb06d682af5bd9c56686ed92aeff3c44c6665109e9923254e06452be6e54444c52559cd0f4efdcdbf4d450210060d7c0b8a361840000b5196ea51376ef35716dc54d402d5ffc4c4f27b9a6daf4244330371b8b19bcd0cdda829e2b94ef5106e93e1ccbc85fcb7b09debbcb95b2fb642332c155e87a49c5e8b897b98ee2c9770e070f95d7ee162050dbf80610d19cb7ea7b2f0fbb79d9149a0c0642414245b5010104000000ace1f81000000000f0d2df1a475b0f99c3fda1970d50a66e81d1a001f9ecae6754eab27941c2ad5268484cc470c0ce72378a7f923f17e45519b769a1790e47cacbb9a75c915bb406d1f4c79768b6407381b316e9006c3425d2258cfe56a486d46b5e392a273ede0f04424545468403cc000fbd4e8e6786a8d95e88a43be5fc8a24cfeb3b0fc5cb2eaea24ce652ad0e05424142450101c42b264458677e9a2181a4e81b054e83715271db10b56a2d63b416c8e2dfca0c06f316e7ae155c0bb3d0ec7737594af3b6604f7dd086d69741a429cc44cb248c"
  //   }
  //   -----------------------------
  //   TypeError: innerDecoder is not a function
  //       at /home/thib/Github/Tbaut/papi-node/node_modules/.pnpm/scale-ts@1.6.0/node_modules/scale-ts/src/codecs/Enum.ts:79:14
  //       at /home/thib/Github/Tbaut/papi-node/node_modules/.pnpm/scale-ts@1.6.0/node_modules/scale-ts/src/internal/toInternalBytes.ts:60:5
  //       at /home/thib/Github/Tbaut/papi-node/node_modules/.pnpm/@polkadot-api+substrate-bindings@0.7.0/node_modules/@polkadot-api/substrate-bindings/src/codecs/scale/Variant.ts:61:28
  //       at /home/thib/Github/Tbaut/papi-node/node_modules/.pnpm/scale-ts@1.6.0/node_modules/scale-ts/src/codecs/Tuple.ts:8:56
  //       at Array.map (<anonymous>)
  //       at /home/thib/Github/Tbaut/papi-node/node_modules/.pnpm/scale-ts@1.6.0/node_modules/scale-ts/src/codecs/Tuple.ts:8:39
  //       at /home/thib/Github/Tbaut/papi-node/node_modules/.pnpm/scale-ts@1.6.0/node_modules/scale-ts/src/internal/toInternalBytes.ts:60:5
  //       at /home/thib/Github/Tbaut/papi-node/node_modules/.pnpm/scale-ts@1.6.0/node_modules/scale-ts/src/utils.ts:25:12
  //       at /home/thib/Github/Tbaut/papi-node/node_modules/.pnpm/scale-ts@1.6.0/node_modules/scale-ts/src/codecs/Tuple.ts:8:56
  //       at Array.map (<anonymous>)
  //   [ERROR] 10:08:03 TypeError: innerDecoder is not a function
};

main();
