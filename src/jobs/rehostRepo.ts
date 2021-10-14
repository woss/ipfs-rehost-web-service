import { Agenda, Job } from 'agenda'
import { setTimeout } from 'timers/promises'
import { insertRepo, repoExists, setupMongoDB } from '../db'
import { gitCloneBare } from '../git'
import { uploadViaAddAll } from '../ipfs'
export interface RehostRepoParams {
  host: string
  username: string
  repo: string
  tag?: string
  rev?: string
  isFork?: boolean
  isNew: boolean
}
export default async function configure(agenda: Agenda) {
  agenda.define('rehostRepo', async (job: Job<RehostRepoParams>) => {
    const mongoClient = await setupMongoDB()

    const {
      data: { host, repo, username, rev, tag, isFork },
    } = job.attrs

    const realRepoURL = `https://${host}/${username}/${repo}`

    const documentExists = await repoExists(realRepoURL)

    if (documentExists) {
      console.log(documentExists)
    } else {
      const { repoPath, commit } = await gitCloneBare({
        repo: realRepoURL,
      })

      console.time('uploadViaAddAll')
      const returnObject = await uploadViaAddAll(repoPath)
      console.timeEnd('uploadViaAddAll')

      try {
        await insertRepo({
          repo: {
            userName: username,
            host: host,
            name: repo,
          },
          isFork,
          repoUrl: realRepoURL,
          rehosted: [
            {
              cid: returnObject.cid,
              ipfsUrl: returnObject.url,
              size: returnObject.size,
              rev: commit.hash,
              tag,
            },
          ],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      } catch (error) {
        console.error(error)
      }
      await setTimeout(3000)
      return returnObject
    }
  })
}
