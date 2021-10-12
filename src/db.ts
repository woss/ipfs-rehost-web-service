import { Express } from 'express'
import { MongoClient, Db } from 'mongodb'
import { envs } from './env'
import { blue } from 'chalk'

export const dbName = 'ipfs-rehost'
export let mongoClient: MongoClient = null
export let dbConnection: Db = null

const log = console.log

export async function setupMongoDB(app?: Express) {
  if (mongoClient && dbConnection) {
    return dbConnection
  }

  mongoClient = new MongoClient(envs().MONGODB_CONNSTRING)
  await mongoClient.connect()
  if (app) app.set('mongoClient', mongoClient)

  log(blue('DB connected'))

  dbConnection = mongoClient.db(dbName)
  dbConnection.collection('repos').createIndex('cid', {
    unique: true,
  })

  return dbConnection
}
