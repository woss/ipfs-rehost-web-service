import { dbName } from './db'
import { isTrue } from './util'

export function verifyEnv() {
  const {
    REHOST_SERVICE_PORT,
    IPFS_API_IP,
    IPFS_PIN,
    IPFS_HOSTNAME,
    IPFS_API_PORT,
    IPFS_API_PROTOCOL,
    MONGODB_USERNAME,
    MONGODB_PASSWORD,
    GITHUB_ACCESS_TOKEN,
  } = process.env

  if (
    !REHOST_SERVICE_PORT ||
    !IPFS_API_PORT ||
    !IPFS_PIN ||
    !IPFS_API_PROTOCOL ||
    !IPFS_API_IP ||
    !IPFS_HOSTNAME ||
    !MONGODB_USERNAME ||
    !MONGODB_PASSWORD ||
    !GITHUB_ACCESS_TOKEN
  ) {
    throw new Error('Env is missing stuff')
  }
}

export function envs() {
  const {
    REHOST_SERVICE_PORT,
    IPFS_API_IP,
    IPFS_PIN,
    IPFS_HOSTNAME,
    IPFS_API_PORT,
    IPFS_API_PROTOCOL,
    MONGODB_HOST = 'localhost',
    MONGODB_PORT = 27017,
    MONGODB_USERNAME,
    MONGODB_PASSWORD,
    GITHUB_ACCESS_TOKEN,
  } = process.env

  return {
    REHOST_SERVICE_PORT: parseInt(REHOST_SERVICE_PORT, 10),
    IPFS_API_PORT: parseInt(IPFS_API_PORT, 10),
    IPFS_API_PROTOCOL,
    IPFS_API_IP,
    IPFS_PIN: isTrue(IPFS_PIN),
    IPFS_HOSTNAME,
    MONGODB_USERNAME,
    MONGODB_PASSWORD,
    GITHUB_ACCESS_TOKEN,
    MONGODB_CONNSTRING: `mongodb://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_HOST}:${MONGODB_PORT}`,
    MONGODB_CONNSTRING_WITH_DB: `mongodb://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_HOST}:${MONGODB_PORT}/${dbName}?authSource=admin`,
  }
}
