import { Express } from 'express'
import { MongoClient, Db, ObjectId } from 'mongodb'
import { envs } from './env'
import { blue } from 'chalk'
import R from 'ramda'
export const dbName = 'ipfs-rehost'
export let mongoClient: MongoClient = null
export let dbConnection: Db = null

const log = console.log

export async function setupMongoDB(app?: Express): Promise<MongoClient> {
  if (mongoClient) {
    return mongoClient
  }

  mongoClient = new MongoClient(envs().MONGODB_CONNSTRING)
  await mongoClient.connect()
  if (app) app.set('mongoClient', mongoClient)

  log(blue('DB connected'))

  dbConnection = mongoClient.db(dbName)
  dbConnection.collection('repos').createIndex('rehosted.cid', {
    unique: true,
  })

  return mongoClient
}
/**
 * Return the Mongodb instance
 * @returns
 */
export async function getDB(): Promise<Db> {
  if (dbConnection) {
    return dbConnection
  }

  mongoClient = await setupMongoDB()

  dbConnection = mongoClient.db(dbName)
  dbConnection.collection('repos').createIndex('cid', {
    unique: true,
  })

  return dbConnection
}

export interface RehostedEmbedded {
  cid: string
  ipfsUrl: string
  rev: string
  tag: string
  size: number
}
export interface RepositoryInfo {
  name: string
  userName: string
  host: string
}
export interface MongoRepositoryDocument extends Repository {
  _id: ObjectId
}
export interface Repository {
  repo: RepositoryInfo
  repoUrl: string
  rehosted: RehostedEmbedded[]
  isFork: boolean
  createdAt: number
  updatedAt: number
}

/**
 * Create the document and return it
 * @param data
 * @returns
 */
export async function insertRepo(data: Repository) {
  const db = await getDB()
  const { createdAt, isFork, rehosted, repo, repoUrl, updatedAt } = data
  return await db.collection('repos').insertOne({
    repo,
    repoUrl,
    rehosted,
    isFork,
    createdAt,
    updatedAt,
  })
}

/**
 * Append new rehosted data
 * @param id Document ID
 * @param data Rehosted repo data
 */
export async function insertEmbedded(id: string, data: RehostedEmbedded) { }

/**
 * Check does repository exists by its URL
 * @param url
 * @returns
 */
export async function repoExists(url: string) {
  const db = await getDB()
  return await db.collection('repos').findOne({ repoUrl: url })
}

export interface MongoRehostedDocument extends RehostedEmbedded {
  _id: ObjectId
}
/**
 * Find and return re-hosted repository
 * @param url
 * @returns
 */
export async function findRehostedByCID(
  cid: string
): Promise<MongoRehostedDocument> {
  const db = await getDB()
  const doc = await db
    .collection('repos')
    .findOne<MongoRepositoryDocument>({ 'rehosted.cid': cid })

  if (R.isNil(doc)) {
    throw new Error('This repository is not re-hosted')
  }
  // find the doc in the result. this is a hacky way to get it since i forgot how to use mongo :(
  return R.find(R.propEq('cid', cid))(doc.rehosted) as MongoRehostedDocument
}

/**
 * Find and return re-hosted repository
 * @param url
 * @returns
 */
export async function findRepo(id: string): Promise<MongoRepositoryDocument> {
  const db = await getDB()
  const doc = await db
    .collection('repos')
    .findOne<MongoRepositoryDocument>({ _id: new ObjectId(id) })

  if (R.isNil(doc)) {
    throw new Error('This repository is not re-hosted')
  }
  return doc
}
