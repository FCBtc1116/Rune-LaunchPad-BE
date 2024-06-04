import { CosmosClient } from "@azure/cosmos";
import { config } from "./config";

export const connectCosmos = () => {
  const endpoint = config.endpoint;
  const key = config.key;

  const options = {
    endpoint: endpoint,
    key: key,
    userAgentSuffix: "CosmosDBJavascriptQuickstart",
  };

  const client = new CosmosClient(options);
  return client;
};
