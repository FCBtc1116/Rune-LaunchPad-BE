import { Runestone, RuneId } from "runestone-js";
import axios from "axios";
import { U128, U32, U64 } from "big-varuint-js";
import {
  initEccLib,
  opcodes,
  script,
  networks,
  Psbt,
  address,
} from "bitcoinjs-lib";
import {
  TEST_MODE,
  UNISAT_TOKEN,
  UNISAT_URL,
  ADMIN_ADDRESS,
  WIF_KEY,
  RUNE_RECEIVE_VALUE,
  MEMPOOL_URL,
} from "../config/config";
import * as ecc from "tiny-secp256k1";
import { LocalWallet, publicKeyToScriptPk } from "./localWallet";
import { getFeeRate } from "./mempool";
import type { IRuneUtxo, IAddressList, IUtxo } from "../types/types";

initEccLib(ecc);

const network = TEST_MODE ? networks.testnet : networks.bitcoin;
const wallet = new LocalWallet(WIF_KEY as string, TEST_MODE ? 1 : 0);
const walletOutput = publicKeyToScriptPk(wallet.pubkey, 2, TEST_MODE ? 1 : 0);

export const createRune = (
  runeTx: bigint,
  runeId: bigint,
  tokenSum: number,
  receiverList: IAddressList[],
  divisibility: number
) => {
  const edicts = [];
  let cnt = 1;
  let claimAmount = 0;
  for (const receiverAddress of receiverList) {
    edicts.push({
      id: new RuneId(new U64(runeTx), new U32(runeId)),
      amount: new U128(BigInt(receiverAddress.amount * 10 ** divisibility)),
      output: new U32(BigInt(cnt)),
    });
    claimAmount += receiverAddress.amount * 10 ** divisibility;
    cnt++;
  }
  if (tokenSum < claimAmount) throw "Invalid Claimable Amount";
  edicts.push({
    id: new RuneId(new U64(runeTx), new U32(runeId)),
    amount: new U128(BigInt(tokenSum - claimAmount)),
    output: new U32(BigInt(cnt)),
  });
  const runestone = new Runestone({
    edicts: edicts,
  });
  const buffer = runestone.enchiper();
  return {
    buffer,
    commitBuffer: runestone.etching?.rune?.commitBuffer(),
  };
};

// Calc Tx Fee
const calculateTxFee = (psbt: Psbt, feeRate: number, userCounts: number) => {
  // const tx = new Transaction();
  // const SIGNATURE_SIZE = 126;
  // for (let i = 0; i < psbt.txInputs.length; i++) {
  //   const txInput = psbt.txInputs[i];
  //   tx.addInput(txInput.hash, txInput.index, txInput.sequence);
  //   tx.setWitness(i, [Buffer.alloc(SIGNATURE_SIZE)]);
  // }
  // for (let txOutput of psbt.txOutputs) {
  //   tx.addOutput(txOutput.script, txOutput.value);
  // }
  // tx.addOutput(psbt.txOutputs[1].script, psbt.txOutputs[1].value);
  // tx.addOutput(psbt.txOutputs[1].script, psbt.txOutputs[1].value);
  // return tx.virtualSize() * feeRate;
  const virtualSize =
    psbt.txInputs.length * 146 + (psbt.txOutputs.length + 1) * 33 + 10;
  return virtualSize * feeRate + (userCounts + 1) * RUNE_RECEIVE_VALUE;
};
const createPsbt = async (
  runeBuffer: Buffer,
  btcUtxos: IUtxo[],
  runeUtxos: IRuneUtxo[],
  receiverList: IAddressList[],
  usedTxId: string[]
) => {
  let totalBtcAmount = 0;
  const psbt = new Psbt({ network });
  const feeRate = await getFeeRate();

  for (const runeUtxo of runeUtxos) {
    psbt.addInput({
      hash: runeUtxo.txid,
      index: runeUtxo.vout,
      witnessUtxo: {
        value: runeUtxo.value,
        script: Buffer.from(walletOutput as string, "hex"),
      },
      tapInternalKey: Buffer.from(wallet.pubkey, "hex").slice(1, 33),
    });
  }

  const runeScript = script.compile([
    opcodes.OP_RETURN,
    opcodes.OP_13,
    runeBuffer,
  ]);
  psbt.addOutput({
    script: runeScript,
    value: 0,
  });
  for (const receiverAddress of receiverList) {
    psbt.addOutput({
      address: receiverAddress.address,
      value: RUNE_RECEIVE_VALUE,
    });
  }
  psbt.addOutput({
    address: ADMIN_ADDRESS,
    value: RUNE_RECEIVE_VALUE,
  });

  for (const btcUtxo of btcUtxos) {
    const fee = calculateTxFee(psbt, feeRate, receiverList.length);
    if (
      totalBtcAmount < fee + RUNE_RECEIVE_VALUE * receiverList.length &&
      btcUtxo.value > 10000 &&
      !usedTxId.includes(btcUtxo.txid + btcUtxo.vout)
    ) {
      totalBtcAmount += btcUtxo.value;
      psbt.addInput({
        hash: btcUtxo.txid,
        index: btcUtxo.vout,
        witnessUtxo: {
          value: btcUtxo.value,
          script: Buffer.from(btcUtxo.scriptpubkey as string, "hex"),
        },
        tapInternalKey: Buffer.from(wallet.pubkey, "hex").slice(1, 33),
      });
      usedTxId.push(btcUtxo.txid + btcUtxo.vout);
    }
  }

  const fee = calculateTxFee(psbt, feeRate, receiverList.length);
  console.log("Pay Fee =>", fee, totalBtcAmount);
  if (totalBtcAmount < fee + RUNE_RECEIVE_VALUE * receiverList.length)
    throw "BTC Balance is not enough";
  psbt.addOutput({
    address: ADMIN_ADDRESS,
    value: totalBtcAmount - fee - RUNE_RECEIVE_VALUE * receiverList.length,
  });
  return psbt;
};

export const splitUsers = async (finalTxArray: IAddressList[]) => {
  const users = finalTxArray;
  const splitUserArray = [];
  const splitRuneInfo = [];
  while (1) {
    if (users.length === 0) break;
    if (users.length < 8) {
      const tempArray: IAddressList[] = users.splice(0, users.length);
      const totalTokenAmount = tempArray.reduce(
        (accumulator, currentValue) => accumulator + currentValue.amount,
        0
      );
      splitRuneInfo.push({
        address: ADMIN_ADDRESS,
        amount: totalTokenAmount,
      });
      splitUserArray.push({
        users: tempArray,
        tokenAmount: totalTokenAmount,
      });
      break;
    } else {
      const tempArray: IAddressList[] = users.splice(0, 8);
      const totalTokenAmount = tempArray.reduce(
        (accumulator, currentValue) => accumulator + currentValue.amount,
        0
      );
      splitRuneInfo.push({
        address: ADMIN_ADDRESS,
        amount: totalTokenAmount,
      });
      splitUserArray.push({
        users: tempArray,
        tokenAmount: totalTokenAmount,
      });
    }
  }
  return { splitUserArray, splitRuneInfo };
};

// Get Rune UTXO
export const getRuneUtxoByAddress = async (address: string, runeId: string) => {
  const url = `${UNISAT_URL}/indexer/address/${address}/runes/${runeId}/utxo`;
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
          // scriptpubkey: utxo.scriptPk,
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

const pushRawTx = async (rawTx: string) => {
  const txid = await postData(`${MEMPOOL_URL}/tx`, rawTx);
  // console.log("pushed txid", txid);
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
      console.log("err => ", err);
      const axiosErr = err;
      // console.log("push tx error", axiosErr.response?.data);
      if (
        !(axiosErr.response?.data).includes(
          'sendrawtransaction RPC error: {"code":-26,"message":"too-long-mempool-chain,'
        )
      )
        throw new Error("Got an err when push tx");
    }
  }
};

export const combinePsbt = async (
  hexedPsbt: string,
  signedHexedPsbt1: string,
  signedHexedPsbt2?: string
) => {
  try {
    const psbt = Psbt.fromHex(hexedPsbt);
    const signedPsbt1 = Psbt.fromHex(signedHexedPsbt1);
    if (signedHexedPsbt2) {
      const signedPsbt2 = Psbt.fromHex(signedHexedPsbt2);
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

export const transfer = async (
  runeBuffer: Buffer,
  receiverList: IAddressList[],
  btcUtxos: IUtxo[],
  usedTxId: string[],
  runeUtxos: IRuneUtxo[]
) => {
  try {
    const psbt: Psbt = await createPsbt(
      runeBuffer,
      btcUtxos,
      runeUtxos,
      receiverList,
      usedTxId
    );

    const signedPSBT = await wallet.signPsbt(psbt);

    const txID = await combinePsbt(psbt.toHex(), signedPSBT.toHex());

    console.log("txID => ", txID);

    return txID;

    // return "abfb2f3d3a2fd8265952cebafa5dded651c8dd5767ee215ba3935c581b89b572";
  } catch (error) {
    console.log(error);
  }
};
