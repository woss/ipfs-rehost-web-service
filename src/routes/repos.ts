/* eslint-disable @typescript-eslint/ban-types */
import { Express, Request } from 'express'
import { dbConnection, findLatestRehostForRepo, findRepo } from '../db'

/**
 * Setup /v1/repo routes
 * @param app
 */
export function repositoryRoutes(app: Express) {
  /**
   * Get all the repos
   */
  app.get(
    '/v1/repos',
    async (req: Request<{}, {}, {}, { page: number }>, res) => {
      const { page } = req.query
      const perPage = 10

      const total = await dbConnection.collection('repos').countDocuments()

      const pages = Math.ceil(total / perPage)

      const pageNumber = page == null || page <= 0 ? 1 : page

      const startFrom = (pageNumber - 1) * perPage
      const docs = await dbConnection
        .collection('repos')
        .find({})
        .sort({ id: -1 })
        .skip(startFrom)
        .limit(perPage)
        .toArray()
      res.status(200).json({ docs, total, pages })
    }
  )
  /**
   * get only one repo
   */
  app.get('/v1/repo/:id', async (req, res) => {
    const { id } = req.params
    try {
      const doc = await findRepo(id)

      if (!doc) {
        throw new Error('Repository not found')
      } else {
        res.json(doc)
      }
    } catch (error) {
      console.log(error.message)
      res.status(404).json({ error: true, message: error.message })
    }
  })
  /**
   * get only one repo
   */
  app.get('/v1/repo/:id/latest_rehost', async (req, res) => {
    const { id } = req.params
    try {
      const doc = await findLatestRehostForRepo(id)

      if (!doc) {
        throw new Error('Repository not found')
      } else {
        res.json(doc)
      }
    } catch (error) {
      console.log(error.message)
      res.status(404).json({ error: true, message: error.message })
    }
  })
}
