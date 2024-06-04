export interface IUtxo {
  txid: string;
  vout: number;
  value: number;
  scriptpubkey?: string;
}

export interface IInscriptionInfo {
  inscriptionId: string;
  amount: number;
  ownerPaymentAddress: string;
  ownerOrdinalAddress: string;
}

export interface IRuneUtxo {
  txid: string;
  vout: number;
  value: number;
  // scriptpubkey: string;
  amount: number;
}
export interface IAddressList {
  address: string;
  amount: number;
}

export interface IMempoolUTXO {
  txid: string;
  vout: number;
  status: {
    confirmed: boolean;
    block_height: number;
    block_hash: string;
    block_time: number;
  };
  value: number;
}
