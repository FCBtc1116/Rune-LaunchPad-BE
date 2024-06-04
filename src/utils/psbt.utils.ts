import * as Bitcoin from "bitcoinjs-lib";
import * as ecc from "tiny-secp256k1";
import axios, { type AxiosResponse } from "axios";
import {
  MEMPOOL_URL,
  UNISAT_TOKEN,
  UNISAT_URL,
  TEST_MODE,
  WIF_KEY,
} from "../config/config";
import type { IRuneUtxo, IUtxo, IMempoolUTXO } from "../types/types";
import { WIFWallet } from "./WIFWallet";
import { LocalWallet } from "./localWallet";

Bitcoin.initEccLib(ecc);

const wallet = new WIFWallet({
  networkType: TEST_MODE ? "testnet" : "mainnet",
  privateKey: WIF_KEY,
});

const localWallet = new LocalWallet(WIF_KEY as string, TEST_MODE ? 1 : 0);

const blockstream = new axios.Axios({ baseURL: MEMPOOL_URL });

// Get Inscription UTXO
export const getInscriptionWithUtxo = async (inscriptionId: string) => {
  try {
    const url = `${UNISAT_URL}/v1/indexer/inscription/info/${inscriptionId}`;

    const config = {
      headers: {
        Authorization: `Bearer ${UNISAT_TOKEN}`,
      },
    };

    const res = await axios.get(url, config);

    if (res.data.code === -1) throw "Invalid inscription id";

    return {
      address: res.data.data.address,
      contentType: res.data.data.contentType,
      inscriptionId: inscriptionId,
      inscriptionNumber: res.data.data.inscriptionNumber,
      txid: res.data.data.utxo.txid,
      value: res.data.data.utxo.satoshi,
      vout: res.data.data.utxo.vout,
      scriptpubkey: res.data.data.utxo.scriptPk,
    };
  } catch (error) {
    console.log(
      `Ordinal api is not working now, please try again later Or invalid inscription id ${inscriptionId}`
    );
    throw "Invalid inscription id";
  }
};

// Get BTC UTXO
export const getBtcUtxoByAddress = async (address: string) => {
  const url = `${UNISAT_URL}/v1/indexer/address/${address}/utxo-data`;

  const config = {
    headers: {
      Authorization: `Bearer ${UNISAT_TOKEN}`,
    },
  };

  let cursor = 0;
  const size = 5000;
  const utxos: IUtxo[] = [];

  while (1) {
    const res = await axios.get(url, { ...config, params: { cursor, size } });

    if (res.data.code === -1) throw "Invalid Address";

    utxos.push(
      ...(res.data.data.utxo as any[]).map((utxo) => {
        return {
          scriptpubkey: utxo.scriptPk,
          txid: utxo.txid,
          value: utxo.satoshi,
          vout: utxo.vout,
        };
      })
    );

    cursor += res.data.data.utxo.length;

    if (cursor >= res.data.data.total - res.data.data.totalRunes) break;
  }

  return utxos;
};

// Get Rune UTXO
export const getRuneUtxoByAddress = async (address: string, runeId: string) => {
  const url = `${UNISAT_URL}/v1/indexer/address/${address}/runes/${runeId}/utxo`;
  const config = {
    headers: {
      Authorization: `Bearer ${UNISAT_TOKEN}`,
    },
  };
  let tokenSum = 0;
  let start = 0;
  let divisibility = 0;
  const limit = 500;
  const utxos: IRuneUtxo[] = [];
  while (1) {
    const res = await axios.get(url, { ...config, params: { start, limit } });
    if (res.data.data.utxo.length === 0) break;
    if (res.data.code === -1) throw "Invalid Address";
    utxos.push(
      ...(res.data.data.utxo as any[]).map((utxo) => {
        tokenSum += Number(utxo.runes[0].amount);
        divisibility = utxo.runes[0].divisibility;
        return {
          scriptpubkey: utxo.scriptPk,
          txid: utxo.txid,
          value: utxo.satoshi,
          vout: utxo.vout,
          amount: Number(utxo.runes[0].amount),
        };
      })
    );
    start += res.data.data.utxo.length;
    if (start === res.data.data.total) break;
  }
  return { runeUtxos: utxos, tokenSum, divisibility };
};

// Get BTC UTXO
export const waitUntilUTXO = async (address: string) => {
  return new Promise<IMempoolUTXO[]>((resolve, reject) => {
    let intervalId: any;
    const checkForUtxo = async () => {
      try {
        const response: AxiosResponse<string> = await blockstream.get(
          `/address/${address}/utxo`
        );
        const data: IMempoolUTXO[] = response.data
          ? JSON.parse(response.data)
          : undefined;
        if (data.length > 0) {
          resolve(data);
          clearInterval(intervalId);
        }
      } catch (error) {
        reject(error);
        clearInterval(intervalId);
      }
    };
    intervalId = setInterval(checkForUtxo, 5000);
  });
};

export const combinePsbt = async (
  hexedPsbt: string,
  signedHexedPsbt1: string,
  signedHexedPsbt2?: string
) => {
  try {
    const psbt = Bitcoin.Psbt.fromHex(hexedPsbt);
    const signedPsbt1 = Bitcoin.Psbt.fromHex(signedHexedPsbt1);
    if (signedHexedPsbt2) {
      const signedPsbt2 = Bitcoin.Psbt.fromHex(signedHexedPsbt2);
      psbt.combine(signedPsbt1, signedPsbt2);
    } else {
      psbt.combine(signedPsbt1);
    }
    const tx = psbt.extractTransaction();
    const txHex = tx.toHex();

    const txId = await pushRawTx(txHex);
    return txId;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const pushRawTx = async (rawTx: string) => {
  const txid = await postData(`${MEMPOOL_URL}/tx`, rawTx);
  console.log("pushed txid", txid);
  return txid;
};

const postData = async (
  url: string,
  json: any,
  content_type = "text/plain",
  apikey = ""
) => {
  while (1) {
    try {
      const headers: any = {};

      if (content_type) headers["Content-Type"] = content_type;

      if (apikey) headers["X-Api-Key"] = apikey;
      const res = await axios.post(url, json, {
        headers,
      });

      return res.data;
    } catch (err: any) {
      const axiosErr = err;
      console.log("push tx error", axiosErr.response?.data);

      if (
        !(axiosErr.response?.data).includes(
          'sendrawtransaction RPC error: {"code":-26,"message":"too-long-mempool-chain,'
        )
      )
        throw new Error("Got an err when push tx");
    }
  }
};

export const finalizePsbtInput = async (hexedPsbt: string) => {
  const realPsbt = Bitcoin.Psbt.fromHex(hexedPsbt);
  realPsbt.signInput(0, wallet.ecPair);
  realPsbt.finalizeAllInputs();
  const tx = realPsbt.extractTransaction();

  return tx;
};

export const finalizeTapscriptPsbtInput = async (hexedPsbt: string) => {
  const realPsbt = Bitcoin.Psbt.fromHex(hexedPsbt);
  const signPsbt = await localWallet.signPsbt(realPsbt);
  const tx = signPsbt.extractTransaction(true);

  return tx;
};
