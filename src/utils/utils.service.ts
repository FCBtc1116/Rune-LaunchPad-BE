export const toXOnly = (pubkey: Buffer): Buffer => {
  return pubkey.subarray(1, 33);
};

export const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));
