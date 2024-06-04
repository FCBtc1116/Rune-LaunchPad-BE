import cron from "node-cron";
import axios from "axios";
import { checkTxStatus } from "../controllers/etch.controller";

import {
  WhitelistFilterList,
  queryWholeAcceptList,
  ClaimingFilterList,
  replaceItem,
} from "./cosmosfunctions";
import { getBlockHeight, getTxStatus } from "./mempool";
import {
  transfer,
  createRune,
  getRuneUtxoByAddress,
  splitUsers,
} from "./transfer";
import { delay, mapToProp } from "./common";
import { getBtcUtxoByAddress } from "./psbt.utils";

import { ADMIN_ADDRESS, RUNE_RECEIVE_VALUE } from "../config/config";

export const main = async () => {
  let cnt = 0;
  const blockArray: any[] = [];
  const finalPublicArray: any[] = [];
  const finalWhitelistArray: any[] = [];
  const finalUpdateWLArray: any[] = [];
  const finalUpdatePLArray: any[] = [];
  const runeIDList: string[] = [];

  const acceptList = await queryWholeAcceptList("REQUEST", "Accept");

  // console.log("acceptList ==> ", acceptList);

  for (const list of acceptList) {
    let sendAmount = 64;
    const runeId = list.runeID;
    const uniqueId = list.uniqueId;
    let runeListIndex =
      runeIDList.indexOf(runeId) < 0 ? cnt : runeIDList.indexOf(runeId);

    // WhiteList
    // console.log("====>>>> This is the whitelist claiming <<<<<====");
    const wlList = await WhitelistFilterList(
      "REQUEST",
      "Whitelist",
      uniqueId,
      sendAmount
    );

    // console.log("wlList ==> ", wlList.length);
    if (wlList.length) {
      // console.log("White List claiming");

      const transferArr = [];

      for (const obj of wlList) {
        const confirmed = await getTxStatus(obj.txId);
        if (confirmed)
          transferArr.push({
            address: obj.address,
            amount: obj.mintCount,
          });
      }

      if (transferArr.length != 0) {
        if (!finalWhitelistArray[runeListIndex])
          finalWhitelistArray[runeListIndex] = [];
        finalWhitelistArray[runeListIndex] =
          finalWhitelistArray[runeListIndex].concat(transferArr);
        if (!finalUpdateWLArray[runeListIndex])
          finalUpdateWLArray[runeListIndex] = [];
        finalUpdateWLArray[runeListIndex] =
          finalUpdateWLArray[runeListIndex].concat(wlList);
      } else {
        if (!finalWhitelistArray[runeListIndex])
          finalWhitelistArray[runeListIndex] = [];
        if (!finalUpdateWLArray[runeListIndex])
          finalUpdateWLArray[runeListIndex] = [];
      }
    }

    sendAmount = sendAmount - wlList.length;

    // Public
    // console.log("====>>>> This is the Public claiming <<<<<====");
    const plList = await ClaimingFilterList(
      "REQUEST",
      "Claming",
      uniqueId,
      sendAmount
    );
    if (plList.length) {
      const plTransferArr = [];

      for (const obj of plList) {
        const confirmed = await getTxStatus(obj.txId);
        if (confirmed)
          plTransferArr.push({
            address: obj.senderAddress,
            amount: list.amountPerClaim,
          });
      }

      const groupedArray = await mapToProp(plTransferArr, "address");

      const plJsonArray = [];
      for (const i in groupedArray) {
        if (groupedArray[i] * list.amountPerClaim !== 0)
          plJsonArray.push({
            address: i,
            amount: groupedArray[i] * list.amountPerClaim,
          });
      }

      if (plJsonArray.length != 0) {
        if (!finalPublicArray[runeListIndex])
          finalPublicArray[runeListIndex] = [];
        finalPublicArray[runeListIndex] =
          finalPublicArray[runeListIndex].concat(plJsonArray);
        if (!finalUpdatePLArray[runeListIndex])
          finalUpdatePLArray[runeListIndex] = [];
        finalUpdatePLArray[runeListIndex] =
          finalUpdatePLArray[runeListIndex].concat(plList);
      } else {
        if (!finalPublicArray[runeListIndex])
          finalPublicArray[runeListIndex] = [];
        if (!finalUpdatePLArray[runeListIndex])
          finalUpdatePLArray[runeListIndex] = [];
      }
    }

    if (runeIDList.indexOf(runeId) < 0) {
      cnt++;
      runeIDList.push(runeId);
    }
  }

  const btcUtxos = await getBtcUtxoByAddress(ADMIN_ADDRESS);

  cnt = 0;
  for (const indRuneId of runeIDList) {
    console.log("indRuneId => ", indRuneId);
    const runeBlock = indRuneId.split(":")[0];
    const runeTx = indRuneId.split(":")[1];

    let finalTxArray: any[] = [];

    if (finalPublicArray[cnt])
      finalTxArray = finalTxArray.concat(finalPublicArray[cnt]);
    if (finalWhitelistArray[cnt])
      finalTxArray = finalTxArray.concat(finalWhitelistArray[cnt]);

    console.log("finalTxArray => ", finalTxArray);

    if (finalTxArray.length > 0) {
      const { runeUtxos, tokenSum, divisibility } = await getRuneUtxoByAddress(
        ADMIN_ADDRESS,
        runeBlock + ":" + runeTx
      );

      const userArray = await splitUsers(finalTxArray);

      const splitRune = createRune(
        BigInt(runeBlock),
        BigInt(runeTx),
        tokenSum,
        userArray.splitRuneInfo,
        divisibility
      );

      const splitTx = await transfer(
        splitRune.buffer,
        userArray.splitRuneInfo,
        btcUtxos,
        blockArray,
        runeUtxos
      );

      console.log("splitTx => ", splitTx);

      let voutCnt = 1;

      if (!splitTx) throw "Failed To Split Tokens";

      for (const eachUser of userArray.splitUserArray) {
        const rune = createRune(
          BigInt(runeBlock),
          BigInt(runeTx),
          eachUser.tokenAmount * 10 ** divisibility,
          eachUser.users,
          divisibility
        );

        const runeUtxo = {
          txid: splitTx,
          vout: voutCnt,
          value: RUNE_RECEIVE_VALUE,
          amount: eachUser.tokenAmount * 10 ** divisibility,
        };

        const transferTx = await transfer(
          rune.buffer,
          eachUser.users,
          btcUtxos,
          blockArray,
          [runeUtxo]
        );

        console.log("transferTx => ", transferTx);

        voutCnt++;

        if (transferTx) {
          finalUpdatePLArray[cnt] &&
            finalUpdatePLArray[cnt].map((pl: any) => {
              if (
                eachUser.users.some((item) => item.address === pl.senderAddress)
              ) {
                pl.status = 2;
                replaceItem("REQUEST", "Claming", pl);
              }
            });

          finalUpdateWLArray[cnt] &&
            finalUpdateWLArray[cnt].map((wl: any) => {
              if (eachUser.users.some((item) => item.address === wl.address)) {
                wl.status = "done";
                replaceItem("REQUEST", "Whitelist", wl);
              }
            });
        }
        await delay(5000);
      }
    }
    cnt++;
  }
};

export const init = async () => {
  await checkTxStatus();
  let lastBlockHeight = await getBlockHeight();

  cron.schedule(`*/10 * * * *`, async () => {
    const blockHeight = await getBlockHeight();
    console.log("Block Height => ", lastBlockHeight, blockHeight);
    if (blockHeight - lastBlockHeight >= 3) {
      lastBlockHeight = blockHeight;
      // console.log(`6th blockHeight ===>>>> ${blockHeight} <<<<<=======`);
      await main();
    }
  });
};
