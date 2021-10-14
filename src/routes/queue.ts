import { Express, Request } from 'express'
import { IPFSHTTPClient } from 'ipfs-http-client'
import jobQueue from '../worker'
import { dbConnection, mongoClient } from '../db'
import { checkDoesGitRepoExists, SupportedHosts } from '../git'
import { ObjectId } from 'mongodb'
import { buildRepoURL } from '../util'

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
        { rev: string; tag: string }
      >,
      res
    ) => {
      const ipfsClient: IPFSHTTPClient = app.get('ipfsClient')

      if (!ipfsClient.isOnline()) {
        res.status(400).json({ message: 'IPFS is not connected' })
        return
      }

      const { host, username, repo } = req.params
      const { tag, rev } = req.query

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

        console.log('dadsada', existsOnHost)

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
            isFork: existsOnHost.isFork,
            isNew: true,
          })

          res.status(201).json({ queue: { jobURL: `/v1/q/${job.attrs._id}` } })
        }
      } else {
        // here might be the updating of the repo if needed
        res.status(200).json({ id: mongoDocument._id })
      }
    }
  )
}

export function buildInfoRoute(app: Express) {
  app.get('/v1/q/:id', async (req, res) => {
    // 6165af690d393d9c2d9e1dd4
    const {
      data: { host, username, repo, tag, rev },
    } = await dbConnection
      .collection('jobs')
      .findOne({ _id: new ObjectId(req.params.id) })

    const realRepoURL = buildRepoURL({ host, username, repo })

    const mongoDocument = await dbConnection
      .collection('repos')
      .findOne({ repoUrl: realRepoURL, tag, rev })

    res.json(mongoDocument)
  })
}
// const { name, registry, version } = req.params
// console.log(req.params, `https://${registry}/api/v1/crates/${name}/${version}`)
