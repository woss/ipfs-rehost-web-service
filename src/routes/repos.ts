import { Express, Request } from 'express'
import { dbConnection, findRehostedByCID, findRepo } from '../db'

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
      var perPage = 10

      var total = await dbConnection.collection('repos').countDocuments()

      var pages = Math.ceil(total / perPage)

      var pageNumber = page == null || page <= 0 ? 1 : page

      var startFrom = (pageNumber - 1) * perPage
      const docs = await dbConnection
        .collection('repos')
        .find({})
        .sort({ id: -1 })
        .skip(startFrom)
        .limit(perPage)
        .toArray()
      res.json({ docs, total, pages })
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
}
