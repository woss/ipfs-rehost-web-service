import { Agenda, Job } from 'agenda'
import { find, isNil, propEq } from 'ramda'
import { insertEmbedded, insertRepo, repoExists } from '../db'
import { gitCloneBare, SupportedHosts } from '../git'
import { uploadViaAddAll } from '../ipfs'
export interface RehostRepoParams {
  host: SupportedHosts
  username: string
  repo: string
  tag?: string
  rev?: string
  branch?: string
  isFork?: boolean
  update: boolean
  committedDate: string
}
export default async function configure(agenda: Agenda) {
  agenda.define('rehostRepo', async (job: Job<RehostRepoParams>) => {
    try {
      const {
        data: {
          host,
          repo,
          username,
          rev,
          tag,
          isFork,
          update,
          branch,
          committedDate,
        },
      } = job.attrs

      const realRepoURL = `https://${host}/${username}/${repo}`

      const mongoDocument = await repoExists(realRepoURL)

      if (mongoDocument) {
        const isHashRehosted = find(propEq('rev', rev))(mongoDocument.rehosted)

        const shouldUpdate =
          isNil(isHashRehosted) ||
          (!isNil(update) && update && !isNil(isHashRehosted))
        // 'we have it and should update it
        if (shouldUpdate) {
          const { repoPath } = await gitCloneBare({
            repo: realRepoURL,
            rev,
            tag,
            branch,
          })

          const returnObject = await uploadViaAddAll(repoPath)

          await insertEmbedded(mongoDocument._id, {
            cid: returnObject.cid,
            ipfsUrl: returnObject.url,
            size: returnObject.size,
            rev,
            tag,
            committedDate,
          })
          return returnObject
        }
      } else {
        const { repoPath } = await gitCloneBare({
          repo: realRepoURL,
          rev,
          tag,
          branch,
        })

        const returnObject = await uploadViaAddAll(repoPath)

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
              rev,
              tag,
              committedDate,
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
