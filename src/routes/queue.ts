/* eslint-disable @typescript-eslint/ban-types */
import { Express, Request } from 'express'
import { IPFSHTTPClient } from 'ipfs-http-client'
import { ObjectId } from 'mongodb'
import { find, isNil, propEq } from 'ramda'
import { dbConnection, MongoRepositoryDocument } from '../db'
import { repoInformation, SupportedHosts } from '../git'
import { buildRepoURL, isTrue } from '../util'
import jobQueue from '../worker'
export function buildAddToQueueRoute(app: Express) {
  /**
   * query param - url encoded URL of th repository
   */
  app.get(
    '/v1/q/add/:host/:username/:repo',
    async (
      req: Request<
        { host: SupportedHosts; username: string; repo: string },
        {},
        {},
        { rev: string; tag: string; update: string; branch: string }
      >,
      res
    ) => {
      const ipfsClient: IPFSHTTPClient = app.get('ipfsClient')
      try {
        if (!ipfsClient.isOnline()) {
          throw new Error('IPFS is not connected')
        }

        const { host, username, repo } = req.params
        const {
          tag: requestedTag,
          update,
          branch: requestedBranch,
          rev: requestedRevision,
        } = req.query

        // if (!isNil(rev)) {
        //   throw new Error(
        //     'Re-hosting by revision/commit is not currently supported. Use tag instead'
        //   )
        // }
        if (!isNil(requestedBranch)) {
          throw new Error(
            'Re-hsting by branch is not currently supported. Use tag instead'
          )
        }

        const realRepoURL = buildRepoURL({ host, username, repo })

        const mongoDocument = (await dbConnection
          .collection('repos')
          .findOne({ repoUrl: realRepoURL })) as MongoRepositoryDocument

        // this will fail and be caught if the rpo doesn't exist, or when providing a tag, that tag doesn't exist
        const { isFork, tag, latestCommit } = await repoInformation({
          host: host,
          username,
          repo,
          tag: requestedTag,
        })

        const actualRevision = !isNil(requestedRevision)
          ? requestedRevision
          : latestCommit.commit

        const actualTag = !isNil(requestedTag) ? requestedTag : tag

        const actualBranch = !isNil(requestedBranch)
          ? requestedBranch
          : latestCommit.branch

        if (mongoDocument) {
          const isHashRehosted = find(propEq('rev', actualRevision))(
            mongoDocument.rehosted
          )

          const shouldUpdate =
            isNil(isHashRehosted) ||
            (!isNil(update) && isTrue(update) && !isNil(isHashRehosted))

          // 'we have it and should update it
          if (shouldUpdate) {
            const job = await jobQueue.now('rehostRepo', {
              host,
              username,
              repo,
              tag: actualTag,
              rev: actualRevision,
              branch: actualBranch,
              isFork,
              update: true,
              committedDate: latestCommit.committedDate,
            })
            res.status(201).json({
              apiURL: `/v1/q/${job.attrs._id}`,
              willUpdate: true,
            })
          } else {
            console.log('we have it and no need to update')
            res.status(200).json({
              apiURL: `/v1/repo/${mongoDocument._id}`,
              willUpdate: false,
            })
          }
        } else {
          console.log('we do not have it')
          const job = await jobQueue.now('rehostRepo', {
            host,
            username,
            repo,
            tag: actualTag,
            rev: actualRevision,
            branch: actualBranch,
            isFork,
            update: false,
            committedDate: latestCommit.committedDate,
          })
          res.status(201).json({
            apiURL: `/v1/q/${job.attrs._id}`,
            willUpdate: true,
          })
        }
        return
      } catch (error) {
        res.status(400).json({
          error: true,
          message: error.message,
        })
      }
    }
  )
}
/**
 * If the Job is successful return the document
 * @param app
 */
export function buildInfoRoute(app: Express) {
  app.get('/v1/q/:id', async (req, res) => {
    try {
      const { id } = req.params
      const doc = await dbConnection
        .collection('jobs')
        .findOne({ _id: new ObjectId(id) })

      if (isNil(doc)) {
        throw new Error('Job not found')
      }

      if (isNil(doc.lastFinishedAt)) {
        res.status(200).json({ message: 'Job is still running' })
      } else {
        const {
          data: { host, username, repo, tag, rev },
        } = doc

        const realRepoURL = buildRepoURL({ host, username, repo })

        const mongoDocument = await dbConnection
          .collection('repos')
          .findOne({ repoUrl: realRepoURL, tag, rev })

        res.json(mongoDocument)
      }
    } catch (error) {
      console.error(error)
      res.status(404).json({ error: true, message: error.message })
    }
  })
}
// const { name, registry, version } = req.params
// console.log(req.params, `https://${registry}/api/v1/crates/${name}/${version}`)
