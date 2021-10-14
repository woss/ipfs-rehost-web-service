/* eslint-disable @typescript-eslint/ban-types */
import { Express, Request } from 'express'
import { IPFSHTTPClient } from 'ipfs-http-client'
import { ObjectId } from 'mongodb'
import { find, isNil, propEq } from 'ramda'
import { dbConnection } from '../db'
import { checkDoesGitRepoExists, SupportedHosts } from '../git'
import { latestCommitForDefaultBranch } from '../integrations/github'
import { buildRepoURL } from '../util'
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

      if (!ipfsClient.isOnline()) {
        res.status(400).json({ message: 'IPFS is not connected' })
        return
      }

      const { host, username, repo } = req.params
      const { tag, rev, update, branch } = req.query

      const realRepoURL = buildRepoURL({ host, username, repo })

      const mongoDocument = await dbConnection
        .collection('repos')
        .findOne({ repoUrl: realRepoURL })

      if (!mongoDocument) {
        const existsOnHost = await checkDoesGitRepoExists({
          host: host,
          username,
          repo,
        })

        if (!existsOnHost.exists) {
          res.status(400).json({
            error: true,
            message:
              'Repository not found. Check the repo name or user. Repo name cannot end with .git',
          })
        } else {
          const job = await jobQueue.now('rehostRepo', {
            host,
            username,
            repo,
            tag,
            rev,
            branch,
            isFork: existsOnHost.isFork,
            update: false,
          })

          res.status(201).json({ queue: { jobURL: `/v1/q/${job.attrs._id}` } })
        }
      } else {
        if (!isNil(update) && (update === 'true' || update === '1')) {
          const latestCommitResponse = await latestCommitForDefaultBranch({
            repo,
            username,
          })
          const latestCommit =
            latestCommitResponse.data.repository.defaultBranchRef.target.history
              .edges[0].node.hash
          const isHashRehosted = find(propEq('rev', latestCommit))(
            mongoDocument.rehosted
          )
          if (isNil(isHashRehosted)) {
            const job = await jobQueue.now('rehostRepo', {
              host,
              username,
              repo,
              tag,
              rev,
              branch,
              update: true,
            })
            res.status(201).json({
              queue: { jobURL: `/v1/q/${job.attrs._id}`, willUpdate: true },
            })
          } else {
            res.status(200).json({
              queue: {
                apiURL: `/v1/repo/${mongoDocument._id}`,
                willUpdate: false,
              },
            })
          }
        } else {
          res.status(200).json({
            queue: {
              apiURL: `/v1/repo/${mongoDocument._id}`,
              willUpdate: false,
            },
          })
        }
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
