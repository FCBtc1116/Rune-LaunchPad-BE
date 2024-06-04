import * as Bitcoin from "bitcoinjs-lib";
import randomstring from "randomstring";
import fetch from "node-fetch";
import { Request } from "node-fetch";
import { createSendOrd, createSendBTC } from "@unisat/ord-utils";
import { LocalWallet } from "./localWallet";
import { OPENAPI_URL, TEST_MODE, WIF_KEY } from "../config/config";
import { pushRawTx } from "./psbt.utils";
import { getFeeRate } from "./mempool";
import { delay } from "./common";

const key = WIF_KEY;

if (typeof key !== "string" || key === "") {
  throw new Error(
    "Environment variable PRIVATE_KEY must be set and be a valid string."
  );
}

const network = TEST_MODE ? Bitcoin.networks.testnet : Bitcoin.networks.bitcoin;

const wallet = new LocalWallet(key, TEST_MODE ? 1 : 0);

async function httpGet(route: string, params: any) {
  let url = OPENAPI_URL + route;
  let c = 0;
  for (const id in params) {
    if (c == 0) {
      url += "?";
    } else {
      url += "&";
    }
    url += `${id}=${params[id]}`;
    c++;
  }
  const res = await fetch(new Request(url), {
    method: "GET",
    headers: {
      "X-Client": "UniSat Wallet",
      "x-address": wallet.address,
      "x-udid": randomstring.generate(12),
    },
  });
  const data = await res.json();
  return data;
}

async function getInscriptionUtxo(inscriptionId: string) {
  await delay(10000);
  try {
    const data: any = await httpGet("/inscription/utxo", {
      inscriptionId,
    });
    if (data.status == "0") {
      console.log("Can not get Utxo ", data.message);
      return getInscriptionUtxo(inscriptionId);
    }
    return data.result;
  } catch (error: any) {
    console.log(error);
    throw new Error(error);
  }
}

async function getAddressUtxo(address: string) {
  await delay(10000);
  try {
    const data: any = await httpGet("/address/btc-utxo", {
      address,
    });
    if (data.status == "0") {
      console.log("Can not get Utxo ", data.message);
      return getAddressUtxo(address);
    }
    return data.result;
  } catch (error: any) {
    console.log(error);
    throw new Error(error);
  }
}

export async function sendInscription(
  targetAddress: string,
  inscriptionId: string,
  feeRate: number,
  oridnalSize: number
) {
  try {
    const utxo = await getInscriptionUtxo(inscriptionId);
    if (!utxo) {
      throw new Error("UTXO not found.");
    }

    if (utxo.inscriptions.length > 1) {
      throw new Error(
        "Multiple inscriptions are mixed together. Please split them first."
      );
    }
    const btc_utxos = await getAddressUtxo(wallet.address);
    const utxos = [utxo].concat(btc_utxos);
    const inputUtxos = utxos.map((v) => {
      return {
        txId: v.txId,
        outputIndex: v.outputIndex,
        satoshis: v.satoshis,
        scriptPk: v.scriptPk,
        addressType: v.addressType,
        address: wallet.address,
        ords: v.inscriptions,
      };
    });

    const psbt: any = await createSendOrd({
      utxos: inputUtxos,
      toAddress: targetAddress,
      toOrdId: inscriptionId,
      wallet: wallet,
      network: network,
      changeAddress: wallet.address,
      pubkey: wallet.pubkey,
      feeRate,
      outputValue: oridnalSize,
      enableRBF: false,
    });
    psbt.__CACHE.__UNSAFE_SIGN_NONSEGWIT = false;
    const rawTx = psbt.extractTransaction().toHex();
    const txId = await pushRawTx(rawTx);

    return txId;
  } catch (error: any) {
    console.log(error);
    throw new Error(error);
  }
}

export async function sendBTC(amount: number, targetAddress: string) {
  try {
    const feeRate = await getFeeRate();
    const btc_utxos = await getAddressUtxo(wallet.address);
    const utxos = btc_utxos;

    const psbt: any = await createSendBTC({
      utxos: utxos.map((v: any) => {
        return {
          txId: v.txId,
          outputIndex: v.outputIndex,
          satoshis: v.satoshis,
          scriptPk: v.scriptPk,
          addressType: v.addressType,
          address: wallet.address,
          ords: v.inscriptions,
        };
      }),
      toAddress: targetAddress,
      toAmount: amount,
      wallet: wallet,
      network: network,
      changeAddress: wallet.address,
      pubkey: wallet.pubkey,
      feeRate,
      enableRBF: false,
    });

    psbt.__CACHE.__UNSAFE_SIGN_NONSEGWIT = false;

    const rawTx = psbt.extractTransaction().toHex();
    const txId = await pushRawTx(rawTx);
    console.log("Send BTC TX ID => ", txId);

    return txId;

    // return psbt.extractTransaction().getId();
  } catch (error) {
    console.log(error);
    throw new Error(error as string);
  }
}
