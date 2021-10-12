import { ObjectId } from 'mongodb'
import { CID } from 'ipfs-http-client'
import { Express, Request } from 'express'
import { dbConnection } from '../db'
export function listAllRepos(app: Express) {
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
  app.get('/v1/repo/:cid', async (req, res) => {
    const { cid } = req.params
    try {
      CID.parse(cid)
      const doc = await dbConnection.collection('repos').findOne({ cid })
      res.json(doc)
    } catch (error) {
      console.log(error.message)
      res.status(400).json({ error: true, message: error.message })
    }
  })
}
