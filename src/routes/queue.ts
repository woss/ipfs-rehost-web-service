import { Express } from 'express'
import { IPFSHTTPClient } from 'ipfs-http-client'
import jobQueue from '../worker'
import { dbConnection, mongoClient } from '../db'
import { checkDoesGitRepoExists } from '../git'
import { ObjectID, ObjectId } from '.pnpm/bson@4.5.3/node_modules/bson'
import { buildRepoURL } from '../util'

export function buildAddToQueueRoute(app: Express) {
  /**
   * query param - url encoded URL of th repository
   */
  app.get('/v1/q/add/:host/:username/:repo', async (req, res) => {
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
      .findOne({ repoUrl: realRepoURL, tag, rev })

    if (!mongoDocument) {
      const existsOnHost = await checkDoesGitRepoExists({
        host,
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
          isFork: existsOnHost.fork,
          isNew: true,
        })

        res.status(201).json({ queue: { jobURL: `/v1/q/${job.attrs._id}` } })
      }
    } else {
      // here might be the updating of the repo if needed
      res.status(200).json({ document: mongoDocument })
    }
  })
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
