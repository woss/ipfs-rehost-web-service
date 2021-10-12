import { Agenda, Job } from 'agenda'
import { setupMongoDB } from '../db'
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

    const documentExists = await mongoClient
      .collection('repos')
      .findOne({ repoUrl: realRepoURL })

    if (documentExists) {
      console.log(documentExists)
    } else {
      const { repoPath } = await gitCloneBare({
        repo: realRepoURL,
      })

      const returnObject = await uploadViaAddAll(repoPath)
      try {
        mongoClient.collection('repos').insertOne({
          cid: returnObject.cid,
          ipfsUrl: returnObject.url,
          size: returnObject.size,
          repoUrl: realRepoURL,
          rev,
          tag,
          isFork: isFork,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      } catch (error) {
        console.error(error)
      }
      return returnObject
    }
  })
}
