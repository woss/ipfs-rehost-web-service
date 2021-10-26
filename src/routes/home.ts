/* eslint-disable @typescript-eslint/ban-types */
import { Express, Request } from 'express'

/**
 * Setup /v1/repo routes
 * @param app
 */
export function homeRoute(app: Express) {
  /**
   * Get all the repos
   */
  app.get(
    '/',
    async (req: Request<{}, {}, {}, { page: number }>, res) => {
      res.json({ apiVersion: '/v1/' })
    }
  )

}
