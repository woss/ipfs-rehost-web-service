import { Agenda, Job } from 'agenda'
import { insertEmbedded, insertRepo, repoExists } from '../db'
import { gitCloneBare } from '../git'
import { uploadViaAddAll } from '../ipfs'
export interface RehostRepoParams {
  host: string
  username: string
  repo: string
  tag?: string
  rev?: string
  branch?: string
  isFork?: boolean
  update: boolean
}
export default async function configure(agenda: Agenda) {
  agenda.define('rehostRepo', async (job: Job<RehostRepoParams>) => {

    try {
      const {
        data: { host, repo, username, rev, tag, isFork, update, branch },
      } = job.attrs

      const realRepoURL = `https://${host}/${username}/${repo}`

      const documentExists = await repoExists(realRepoURL)

      if (documentExists && update) {
        console.log(documentExists)
        const { repoPath, commit } = await gitCloneBare({
          repo: realRepoURL,
          rev,
          tag,
          branch
        })

      } else {
        const { repoPath, commit } = await gitCloneBare({
          repo: realRepoURL,
          rev,
          tag,
          branch
        })

        console.time('uploadViaAddAll')
        const returnObject = await uploadViaAddAll(repoPath)
        console.timeEnd('uploadViaAddAll')

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


        return returnObject
      }
    } catch (error) {
      console.error(error)
    }
  })
}
