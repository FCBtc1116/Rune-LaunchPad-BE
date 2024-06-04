import { connectCosmos } from "../config";
const partitionKey = { kind: "Hash", paths: ["/partitionKey"] };

const client = connectCosmos();

/**
 * Create the database if it does not exist
 */
export async function createDatabase(databaseId: string) {
  const { database } = await client.databases.createIfNotExists({
    id: databaseId,
  });
  // console.log(`Created database:\n${database.id}\n`);
}

/**
 * Read the database definition
 */
export async function readDatabase(databaseId: string) {
  const { resource: databaseDefinition } = await client
    .database(databaseId)
    .read();
  // console.log(`Reading database:\n${databaseDefinition}\n`);
}

/**
 * Create the container if it does not exist
 */
export async function createContainer(databaseId: string, containerId: string) {
  const { container } = await client
    .database(databaseId)
    .containers.createIfNotExists({ id: containerId, partitionKey });
  // console.log(`Created container:\n${container.id}\n`);
}

/**
 * Read the container definition
 */
export async function readContainer(databaseId: string, containerId: string) {
  const { resource: containerDefinition } = await client
    .database(databaseId)
    .container(containerId)
    .read();
  // if (containerDefinition)
  // console.log(`Reading container:\n${containerDefinition}\n`);

  return containerDefinition;
}

/**
 * Scale a container
 * You can scale the throughput (RU/s) of your container up and down to meet the needs of the workload. Learn more: https://aka.ms/cosmos-request-units
 */
export async function scaleContainer(databaseId: string, containerId: string) {
  const { resource: containerDefinition } = await client
    .database(databaseId)
    .container(containerId)
    .read();

  try {
    const { resources: offers } = await client.offers.readAll().fetchAll();

    const newRups = 500;
    for (var offer of offers) {
      if (containerDefinition)
        if (containerDefinition._rid !== offer.offerResourceId) {
          continue;
        }
      if (offer.content) offer.content.offerThroughput = newRups;
      const offerToReplace = client.offer(offer.id);
      await offerToReplace.replace(offer);
      // console.log(`Updated offer to ${newRups} RU/s\n`);
      break;
    }
  } catch (err: any) {
    if (err.code == 400) {
      // console.log(`Cannot read container throuthput.\n`);
      // console.log(err.body.message);
    } else {
      throw err;
    }
  }
}

/**
 * Create family item if it does not exist
 */
export async function createItem(
  databaseId: string,
  containerId: string,
  itemBody: any
) {
  const { item } = await client
    .database(databaseId)
    .container(containerId)
    .items.upsert(itemBody);
  // console.log(`Created item with id:\n${itemBody.id}\n`);

  return item;
}

/**
 * Query the container use RuneName using SQL
 */
export async function queryEtchingByRuneName(
  databaseId: string,
  containerId: string,
  runeName: string
) {
  const resultArr = [];

  const querySpec = {
    query: "SELECT VALUE r FROM root r WHERE r.runeName = @runeName",
    parameters: [
      {
        name: "@runeName",
        value: runeName,
      },
    ],
  };

  const { resources: results } = await client
    .database(databaseId)
    .container(containerId)
    .items.query(querySpec)
    .fetchAll();

  for (const queryResult of results) {
    let resultString = JSON.stringify(queryResult);
    resultArr.push(resultString);
    // console.log(`\tQuery returned ${resultString}\n`);
  }

  return resultArr;
}

/**
 * Query the container use RuneName using SQL
 */
export async function queryEtchingByStatus(
  databaseId: string,
  containerId: string,
  status: number
) {
  const querySpec = {
    query: "SELECT VALUE r FROM root r WHERE r.status = @status",
    parameters: [
      {
        name: "@status",
        value: status,
      },
    ],
  };

  const { resources: results } = await client
    .database(databaseId)
    .container(containerId)
    .items.query(querySpec)
    .fetchAll();

  return results;
}

export async function WhitelistFilterList(
  databaseId: string,
  containerId: string,
  collectionId: any,
  sendAmount: number
) {
  // console.log(`Querying container:\n${databaseId} ${containerId}`);

  // console.log("queryWhitelistData option ==> ", collectionId);

  // query to return all children in a family
  // Including the partition key value of country in the WHERE filter results in a more efficient query
  const querySpec = {
    query: `SELECT VALUE r FROM root r WHERE r.collectionId=@collectionId AND r.status=@status OFFSET 0 LIMIT ${sendAmount}`,
    parameters: [
      {
        name: "@collectionId",
        value: collectionId,
      },
      {
        name: "@status",
        value: "ready",
      },
    ],
  };

  const { resources: results } = await client
    .database(databaseId)
    .container(containerId)
    .items.query(querySpec)
    .fetchAll();
  for (var queryResult of results) {
    let resultString = JSON.stringify(queryResult);
    // console.log(`\tQuery returned ${resultString}\n`);
  }

  // console.log("results ==> ", results);
  return results;
}

/**
 * Replace the item by ID.
 */
export async function replaceItem(
  databaseId: string,
  containerId: string,
  itemBody: any
) {
  // console.log(`Replacing item:\n${itemBody.id}\n`);

  const { item } = await client
    .database(databaseId)
    .container(containerId)
    .item(itemBody.id)
    .replace(itemBody);
}

/**
 * Replace the item by ID.
 */
export async function replaceRemainAmount(
  databaseId: string,
  containerId: string,
  itemBody: any
) {
  // console.log(`Replacing item:\n${itemBody.id}\n`);

  try {
    const { item } = await client
      .database(databaseId)
      .container(containerId)
      .item(itemBody.id)
      .replace(itemBody, {
        accessCondition: {
          type: "IfMatch",
          condition: itemBody._etag,
        },
      });
    return 1;
  } catch (error) {
    console.log(error);
    return -1;
  }
}

/**
 * Delete the item by ID.
 */
export async function deleteFamilyItem(
  databaseId: string,
  containerId: string,
  itemBody: any
) {
  await client
    .database(databaseId)
    .container(containerId)
    .item(itemBody.id, itemBody.partitionKey)
    .delete(itemBody);
  // console.log(`Deleted item:\n${itemBody.id}\n`);
}

/**
 * Cleanup the database and collection on completion
 */
export async function cleanup(databaseId: string) {
  await client.database(databaseId).delete();
}

/**
 * Exit the app with a prompt
 * @param {string} message - The message to display
 */
function exit(message: string) {
  // console.log(message);
  // console.log("Press any key to exit");
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on("data", process.exit.bind(process, 0));
}

/**
 * Query the container using SQL
 */
export async function queryWholeAcceptList(
  databaseId: string,
  containerId: string
) {
  // console.log(`Querying container:\n${databaseId} ${containerId}`);

  // query to return all children in a family
  // Including the partition key value of country in the WHERE filter results in a more efficient query
  const querySpec = {
    query: "SELECT VALUE r FROM root r WHERE r.approve=@approve",
    parameters: [
      {
        name: "@approve",
        value: true,
      },
    ],
  };

  const { resources: results } = await client
    .database(databaseId)
    .container(containerId)
    .items.query(querySpec)
    .fetchAll();
  for (var queryResult of results) {
    let resultString = JSON.stringify(queryResult);
    // // console.log(`\tQuery returned ${resultString}\n`);
  }

  return results;
}

export async function ClaimingFilterList(
  databaseId: string,
  containerId: string,
  collectionId: any,
  sendAmount: number
) {
  // // console.log(`Querying container:\n${databaseId} ${containerId}`)

  // // console.log('runeId ==> ', runeId);

  // query to return all children in a family
  // Including the partition key value of country in the WHERE filter results in a more efficient query
  const querySpec = {
    query: `SELECT VALUE r FROM root r WHERE r.collectionId=@collectionId AND r.status=@status OFFSET 0 LIMIT ${sendAmount}`,
    parameters: [
      {
        name: "@collectionId",
        value: collectionId,
      },
      {
        name: "@status",
        value: 1,
      },
    ],
  };

  const { resources: results } = await client
    .database(databaseId)
    .container(containerId)
    .items.query(querySpec)
    .fetchAll();
  for (var queryResult of results) {
    let resultString = JSON.stringify(queryResult);
    // // console.log(`\tQuery returned ${resultString}\n`);
  }

  // // console.log('results ==> ', results);
  return results;
}
