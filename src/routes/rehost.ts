import { Express } from 'express'
import { findRehostedByCID } from '../db'
import { CID } from 'ipfs-http-client'

export async function rehostRoutes(app: Express) {
  /**
   * get only one repo
   */
  app.get('/v1/rehosted/:cid', async (req, res) => {
    const { cid } = req.params
    try {
      CID.parse(cid)
      const doc = await findRehostedByCID(cid)

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
