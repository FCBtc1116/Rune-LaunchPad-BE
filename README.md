# Rune Launchpad Typescript
---
Rune Launchpad(Users can claim rune tokens)

## Prerequisites
---
Before running the script, ensure you have the following dependencies installed:

- `bitcoinjs-lib`
- `ecpair`
- `@bitcoinerlab/secp256k1`
- `axios`
- `runelib`
-  `cbor`

You can install them using npm:

```sh
npm install bitcoinjs-lib ecpair @bitcoinerlab/secp256k1 axios runelib
```

## Configuration
---
Ensure you have a `.env` file in your project root with the following variables:

```plaintext
PRIVATE_KEY=<your_private_key>
MNEMONIC=<your_seed_mnemonic> (optional, if using SeedWallet)
```
### Usage

1. **Initialize ECC Library**:
   The script initializes the ECC library using `initEccLib` from `bitcoinjs-lib`.

2. **Wallet Setup**:
   The script supports two types of wallets: `SeedWallet` and `WIFWallet`. Currently, the `WIFWallet` is used.

3. **Create Etching**:
   The `etching` function is the main function that creates the recursive ordinal. It involves the following steps:
   - Define the HTML content to be inscribed.
   - Create an inscription object using `EtchInscription`.
   - Define a Taproot script with the inscription and the wallet's public key.
   - Generate a Taproot address and wait for UTXOs to be funded to this address.
   - Create a Partially Signed Bitcoin Transaction (PSBT).
   - Add inputs and outputs to the PSBT.
   - Sign and broadcast the transaction.

4. **Broadcast Transaction**:
   The `signAndSend` function handles the signing and broadcasting of the transaction. It supports both node environment and browser environment.

## Usage

1. **Initialize ECC Library**:
   The script initializes the ECC library using `initEccLib` from `bitcoinjs-lib`.

2. **Wallet Setup**:
   The script supports two types of wallets: `SeedWallet` and `WIFWallet`. Currently, the `WIFWallet` is used.

3. **Minting with Taproot**:
   The `mintWithTaproot` function is the main function that mints Runes. It involves the following steps:
   - Define Runes to be minted.
   - Create a Runestone with the specified Runes.
   - Tweak the signer for Taproot key tweaking.
   - Generate a Taproot address.
   - Wait for UTXOs to be funded to this address.
   - Create a Partially Signed Bitcoin Transaction (PSBT).
   - Add inputs and outputs to the PSBT.
   - Sign and broadcast the transaction.

4. **Broadcast Transaction**:
   The `signAndSend` function handles the signing and broadcasting of the transaction. It supports both node environment and browser environment.

## Prerequisites

Make sure you have the following dependencies installed:

- `bitcoinjs-lib`
- `ecpair`
- `@bitcoinerlab/secp256k1`
- `axios`
- `cbor`
- `runelib`

You can install them using npm:

```sh
npm install bitcoinjs-lib ecpair @bitcoinerlab/secp256k1 axios cbor runelib
```
- The script is configured to work with the Bitcoin testnet.
- Ensure that you have testnet coins available in the provided private key.
- Adjust the fee and other parameters as needed.

---
