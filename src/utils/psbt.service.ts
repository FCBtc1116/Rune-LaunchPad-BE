import * as Bitcoin from "bitcoinjs-lib";
import * as ecc from "tiny-secp256k1";
import axios from "axios";
import { Rune, Runestone, none, some, Terms, Range, Etching } from "runelib";
import {
  TEST_MODE,
  UNISAT_URL,
  UNISAT_TOKEN,
  SIGNATURE_SIZE,
  ADMIN_ADDRESS,
  SERVICE_FEE_ADDRESS,
  RUNE_RECEIVE_VALUE,
} from "../config/config";
import { WalletTypes, MEMPOOL_URL, WIF_KEY } from "../config/config";
import type { IUtxo, IMempoolUTXO } from "../types/types";
import { WIFWallet } from "./WIFWallet";
import { toXOnly } from "./utils.service";
import { getFeeRate } from "./mempool";
import { finalizePsbtInput, pushRawTx } from "./psbt.utils";
import { getBtcUtxoByAddress } from "./psbt.utils";

Bitcoin.initEccLib(ecc);
const network = TEST_MODE ? Bitcoin.networks.testnet : Bitcoin.networks.bitcoin;

const wallet = new WIFWallet({
  networkType: TEST_MODE ? "testnet" : "mainnet",
  privateKey: WIF_KEY,
});

// Calc Tx Fee
export const calculateTxFee = (psbt: Bitcoin.Psbt, feeRate: number) => {
  const tx = new Bitcoin.Transaction();

  for (let i = 0; i < psbt.txInputs.length; i++) {
    const txInput = psbt.txInputs[i];
    tx.addInput(txInput.hash, txInput.index, txInput.sequence);
    tx.setWitness(i, [Buffer.alloc(SIGNATURE_SIZE)]);
  }

  for (let txOutput of psbt.txOutputs) {
    tx.addOutput(txOutput.script, txOutput.value);
  }
  tx.addOutput(psbt.txOutputs[0].script, psbt.txOutputs[0].value);
  tx.addOutput(psbt.txOutputs[0].script, psbt.txOutputs[0].value);

  return tx.virtualSize() * feeRate;
};

const getTxHexById = async (txId: string) => {
  try {
    const { data } = await axios.get(`${MEMPOOL_URL}/tx/${txId}/hex`);

    return data as string;
  } catch (error) {
    // console.log("Mempool api error. Can not get transaction hex");

    throw "Mempool api is not working now. Try again later";
  }
};

// Generate Send BTC PSBT
export const generateSendBTCPSBT = async (
  walletType: WalletTypes,
  paymentPubkey: string,
  ordinalAddress: string,
  ordinalPubkey: string,
  serviceFeePrice: number,
  networkFeePrice: number,
  usedUTXOs: string[]
) => {
  // console.log(" <<<< Generate PSBT for sign >>>> ");
  const returnUtxos = usedUTXOs;

  const psbt = new Bitcoin.Psbt({ network: network });

  // Add Inscription Input
  let paymentAddress, paymentoutput;

  if (walletType === WalletTypes.XVERSE) {
    const hexedPaymentPubkey = Buffer.from(paymentPubkey, "hex");
    const p2wpkh = Bitcoin.payments.p2wpkh({
      pubkey: hexedPaymentPubkey,
      network: network,
    });

    const { address, redeem } = Bitcoin.payments.p2sh({
      redeem: p2wpkh,
      network: network,
    });

    paymentAddress = address;
    paymentoutput = redeem?.output;
  } else if (
    walletType === WalletTypes.UNISAT ||
    walletType === WalletTypes.OKX
  ) {
    paymentAddress = ordinalAddress;
  } else if (walletType === WalletTypes.HIRO) {
    const hexedPaymentPubkey = Buffer.from(paymentPubkey, "hex");
    const { address, output } = Bitcoin.payments.p2wpkh({
      pubkey: hexedPaymentPubkey,
      network: network,
    });
    paymentAddress = address;
  }

  psbt.addOutput({
    address: SERVICE_FEE_ADDRESS,
    value: serviceFeePrice,
  });

  psbt.addOutput({
    address: ADMIN_ADDRESS,
    value: networkFeePrice,
  });

  // console.log("add 1, 2 output!!");

  const btcUtxos = await getBtcUtxoByAddress(paymentAddress as string);
  const feeRate = await getFeeRate();

  // console.log("feeRate ==>", feeRate);

  let amount = 0;

  const buyerPaymentsignIndexes: number[] = [];

  // console.log("payer btcUtxos", btcUtxos);

  for (const utxo of btcUtxos) {
    const fee = calculateTxFee(psbt, feeRate);
    if (
      amount < serviceFeePrice + networkFeePrice + fee &&
      utxo.value > 10000 &&
      !returnUtxos.includes(utxo.txid + utxo.vout)
    ) {
      amount += utxo.value;

      buyerPaymentsignIndexes.push(psbt.inputCount);

      if (walletType === WalletTypes.UNISAT) {
        if (ordinalAddress.length == 62) {
          psbt.addInput({
            hash: utxo.txid,
            index: utxo.vout,
            witnessUtxo: {
              value: utxo.value,
              script: Buffer.from(utxo.scriptpubkey as string, "hex"),
            },
            tapInternalKey: Buffer.from(ordinalPubkey, "hex").slice(1, 33),
            sighashType: Bitcoin.Transaction.SIGHASH_ALL,
          });
        } else {
          psbt.addInput({
            hash: utxo.txid,
            index: utxo.vout,
            witnessUtxo: {
              value: utxo.value,
              script: Buffer.from(utxo.scriptpubkey as string, "hex"),
            },
          });
        }
      } else if (walletType === WalletTypes.OKX) {
        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          witnessUtxo: {
            value: utxo.value,
            script: Buffer.from(utxo.scriptpubkey as string, "hex"),
          },
          tapInternalKey: Buffer.from(ordinalPubkey, "hex"),
          sighashType: Bitcoin.Transaction.SIGHASH_ALL,
        });
      } else if (walletType === WalletTypes.HIRO) {
        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          witnessUtxo: {
            value: utxo.value,
            script: Buffer.from(utxo.scriptpubkey as string, "hex"),
          },
        });
      } else if (walletType === WalletTypes.XVERSE) {
        const txHex = await getTxHexById(utxo.txid);

        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          redeemScript: paymentoutput,
          nonWitnessUtxo: Buffer.from(txHex, "hex"),
          sighashType: Bitcoin.Transaction.SIGHASH_ALL,
        });
      }

      returnUtxos.push(utxo.txid + utxo.vout);
    }
  }

  // console.log("buyerPaymentsignIndexes ==>", buyerPaymentsignIndexes);

  const fee = calculateTxFee(psbt, feeRate);

  // console.log("fee ==>", fee);

  if (amount < serviceFeePrice + networkFeePrice + fee)
    throw "You do not have enough bitcoin in your wallet";

  psbt.addOutput({
    address: paymentAddress as string,
    value: amount - serviceFeePrice - networkFeePrice - fee,
  });

  // console.log("add 3 output!!");

  // console.log(psbt.toBase64());

  return {
    psbt: psbt,
    buyerPaymentsignIndexes,
    returnUtxos,
    serviceFeePrice,
    networkFeePrice,
  };
};

// Generate Inscribe Image PSBT
export const inscribeImagePSBT = async (
  utxo: IMempoolUTXO[],
  ordinal_p2tr: Bitcoin.payments.Payment,
  redeem: any,
  receiveAddress: string
) => {
  const psbt = new Bitcoin.Psbt({ network });
  psbt.addInput({
    hash: utxo[0].txid,
    index: utxo[0].vout,
    tapInternalKey: toXOnly(wallet.ecPair.publicKey),
    witnessUtxo: { value: utxo[0].value, script: ordinal_p2tr.output! },
    tapLeafScript: [
      {
        leafVersion: redeem.redeemVersion,
        script: redeem.output,
        controlBlock: ordinal_p2tr.witness![ordinal_p2tr.witness!.length - 1],
      },
    ],
  });
  psbt.addOutput({
    address: receiveAddress,
    value: RUNE_RECEIVE_VALUE,
  });

  return psbt;
};

// Genreate Rune PSBT
export const inscribeRunePSBT = async (
  utxo: IMempoolUTXO[],
  script_p2tr: Bitcoin.payments.Payment,
  etching_p2tr: Bitcoin.payments.Payment,
  redeem: any,
  receiveAddress: string,
  symbol: string,
  runeAmount: number,
  originalName: string,
  spacers: number
) => {
  const psbt = new Bitcoin.Psbt({ network });
  psbt.addInput({
    hash: utxo[0].txid,
    index: utxo[0].vout,
    witnessUtxo: { value: utxo[0].value, script: script_p2tr.output! },
    tapLeafScript: [
      {
        leafVersion: redeem.redeemVersion,
        script: redeem.output,
        controlBlock: etching_p2tr.witness![etching_p2tr.witness!.length - 1],
      },
    ],
  });

  const rune = Rune.fromName(originalName);

  const terms = new Terms(
    0,
    0,
    new Range(none(), none()),
    new Range(none(), none())
  );

  const etching = new Etching(
    none(),
    some(runeAmount),
    some(rune),
    some(spacers),
    some(symbol),
    some(terms),
    true
  );

  const stone = new Runestone([], some(etching), none(), none());

  psbt.addOutput({
    script: stone.encipher(),
    value: 0,
  });

  psbt.addOutput({
    address: receiveAddress,
    value: RUNE_RECEIVE_VALUE,
  });

  return psbt;
};

// Broadcast PSBT
export const broadcastPSBT = async (psbt: string) => {
  try {
    const tx = await finalizePsbtInput(psbt);
    const txId = await pushRawTx(tx.toHex());

    console.log("Boradcast PSBT txid => ", txId);
    return txId;
  } catch (error) {
    console.log("Boradcast PSBT Error => ", error);
    throw error;
  }
};
