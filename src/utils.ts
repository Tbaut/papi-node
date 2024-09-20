export const JSONprint = (e: unknown) =>
    JSON.stringify(e, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 4);