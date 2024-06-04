import { CosmosClient } from '@azure/cosmos'

const endpoint: string = process.env.COSMOS_DB_ENDPOINT || ''
const key: string = process.env.COSMOS_DB_KEY || ''
const client = new CosmosClient({ endpoint, key })

const databaseId: string = 'REQUEST'
const acceptContainerId: string = 'Accept' // Make sure this is the correct container ID

const database = client.database(databaseId)
const acceptContainer = database.container(acceptContainerId)

export { acceptContainer } // Make sure this matches the exported name