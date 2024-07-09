// Assuming this is another TypeScript file
const azureStorageDNS: string = process.env.AZURE_STORAGE_DNS || "";
import dotenv from "dotenv";
dotenv.config();

export default {
  azureStorageDNS,
};

try {
} catch (error) {
  console.error("Error loading environment variables:", error);
  process.exit(1);
}

export const config = {
  endpoint: process.env.COSMOS_DB_ENDPOINT || "default_endpoint_if_any",
  key: process.env.COSMOS_DB_KEY || "default_key_if_any",
  database: {
    id: "ToDoList2",
  },
  container: {
    id: "Items2",
  },
  items: {
    Andersen: {
      id: "Anderson.1",
      Country: "USA",
      partitionKey: "USA",
      lastName: "Andersen",
      parents: [
        {
          firstName: "Thomas",
        },
        {
          firstName: "Mary Kay",
        },
      ],
      children: [
        {
          firstName: "Henriette Thaulow",
          gender: "female",
          grade: 5,
          pets: [
            {
              givenName: "Fluffy",
            },
          ],
        },
      ],
      address: {
        state: "WA",
        county: "King",
        city: "Seattle",
      },
    },
    Wakefield: {
      id: "Wakefield.7",
      partitionKey: "Italy",
      Country: "Italy",
      parents: [
        {
          familyName: "Wakefield",
          firstName: "Robin",
        },
        {
          familyName: "Miller",
          firstName: "Ben",
        },
      ],
      children: [
        {
          familyName: "Merriam",
          firstName: "Jesse",
          gender: "female",
          grade: 8,
          pets: [
            {
              givenName: "Goofy",
            },
            {
              givenName: "Shadow",
            },
          ],
        },
        {
          familyName: "Miller",
          firstName: "Lisa",
          gender: "female",
          grade: 1,
        },
      ],
      address: {
        state: "NY",
        county: "Manhattan",
        city: "NY",
      },
      isRegistered: false,
    },
  },
};

export const TEST_MODE = true;

export const PORT = process.env.PORT || 9000;
export const JWT_SECRET = process.env.JWT_SECRET || "JWT_SECRET";

export const MEMPOOL_URL = TEST_MODE
  ? "https://mempool.space/testnet/api"
  : "https://mempool.space/api";

export const UNISAT_URL = TEST_MODE
  ? "https://open-api-testnet.unisat.io/v1"
  : "https://open-api.unisat.io/v1";

export const OPENAPI_URL = TEST_MODE
  ? "https://api-testnet.unisat.io/wallet-v4"
  : "https://api.unisat.io/wallet-v4";

export const UNISAT_TOKEN =
  "4660cc79b4941f3a5ecca80b33b8b5781408236b7f5537601c6f64230611ae58";

export const ADMIN_ADDRESS = TEST_MODE
  ? "tb1p6h0dk0d66gez2fu2qcpdmcrhaqez5slz60ergmngtgup9da5vsgst8pdnk"
  : "bc1pcfd44azcelfqdwy833l9492tq5kfqtxa3jhdk0phyl66aptzec6q0mj08d";
export const SERVICE_FEE_ADDRESS = TEST_MODE
  ? "tb1pm5xmwqstu2fhcf2566xur059d5jg80s80uq9qj6hjz46f8lzne0qusrr7x"
  : "bc1ppd09afhjt4uelc8shxu5qqct6tc84e2nxdwj4f77ew8k6p6kcg5s47cwrg";

export const WIF_KEY = TEST_MODE
  ? ""
  : (process.env.WIF_KEY as string);

export const SIGNATURE_SIZE = 126;

export enum WalletTypes {
  UNISAT = "Unisat",
  XVERSE = "Xverse",
  HIRO = "Hiro",
  OKX = "Okx",
}

export const TOKEN_PRICE = 100;
export const RUNE_RECEIVE_VALUE = 546;
