import { blue, green } from 'chalk'
import { Express } from 'express'
import type { AddAllOptions } from 'ipfs-core-types/src/root'
import { create, globSource, IPFSHTTPClient } from 'ipfs-http-client'
import { envs } from './env'

const log = console.log

export let ipfsClient: IPFSHTTPClient | null = null

export const ipfsOptions: AddAllOptions = {
  cidVersion: 1,
  wrapWithDirectory: true, // this is important when adding with the httpClient. it behaves differently than the cli where cli will wrap it in the name of the dir, this doesn't do that
  // hashAlg: "blake2b-256",
  progress: (bytes: number, path: string) => {
    console.log(path, bytes)
  },
  pin: false,
}

export function createIPFSConnection(app?: Express) {
  if (ipfsClient) {
    return ipfsClient
  }
  const { IPFS_API_PORT, IPFS_API_IP } = envs()
  ipfsClient = create({
    host: IPFS_API_IP,
    port: parseInt(IPFS_API_PORT, 10),
  })

  if (app) {
    app.set('ipfsClient', ipfsClient)
  }

  log(blue('IPFS connected'))
  return ipfsClient
}

interface AddedFiles {
  cid: string
  path: string
  size: number
}
/**
 * Upload to IPFS via ipfs.addAll
 * @param path
 */
export async function uploadViaAddAll(path: string) {
  const ipfsClient: IPFSHTTPClient = createIPFSConnection()
  const { IPFS_HOSTNAME } = envs()

  const addedFiles: AddedFiles[] = []

  console.log('Upload to IPFS started ...')

  for await (const file of ipfsClient.addAll(
    globSource(path, '**/*'),
    ipfsOptions
  )) {
    addedFiles.push({
      cid: file.cid.toString(),
      path: file.path,
      size: file.size,
    })
  }
  const lastCid = addedFiles[addedFiles.length - 1]

  const returnObject = {
    cid: lastCid.cid.toString(),
    path: lastCid.path,
    size: lastCid.size,
    url: `https://${IPFS_HOSTNAME}/ipfs/${lastCid.cid}`,
  }
  log(green('Done 🎉\n'))
  return returnObject
}
