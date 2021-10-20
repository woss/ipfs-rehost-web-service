/* eslint-disable @typescript-eslint/no-var-requires */
require('dotenv').config()
import compression from 'compression'
import express, { Express } from 'express'
import slowDown from 'express-slow-down'
import { MongoClient } from 'mongodb'
import { setupMongoDB } from './db'
import { envs, verifyEnv } from './env'
import { createIPFSConnection } from './ipfs'
import { buildAddToQueueRoute, buildInfoRoute } from './routes/queue'
import { rehostRoutes } from './routes/rehost'
import { repositoryRoutes } from './routes/repos'
import './worker'

verifyEnv()

export let app: Express | null = null

export async function createApp() {
  if (app) return app

  const envList = envs()
  const protocol = envList.IPFS_API_PROTOCOL
  const host = envList.IPFS_HOSTNAME
  const apiPort = envList.IPFS_API_PORT

  // create express app
  app = express()

  app.use(compression())

  const speedLimiter = slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 10000, // allow 10000  requests per 15 minutes, then...
    delayMs: 500, // begin adding 500ms of delay per request above 100:
    // request # 101 is delayed by  500ms
    // request # 102 is delayed by 1000ms
    // request # 103 is delayed by 1500ms
    // etc.
  })

  //  apply to all requests
  app.use(speedLimiter)

  app.set('ipfs_protocol', protocol)
  app.set('ipfs_host', host)
  app.set('ipfs_api_port', apiPort)
  app.set('port', envList.REHOST_SERVICE_PORT || 3000)

  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  // Connect to the IPFS
  createIPFSConnection(app)
  await setupMongoDB(app)
  /**
   * Routes
   */
  buildAddToQueueRoute(app)
  buildInfoRoute(app)
  repositoryRoutes(app)
  rehostRoutes(app)

  return app
}

async function main() {
  const app = await createApp()

  app.listen(app.get('port'), () => {
    console.log(
      'App is running at http://localhost:%d in %s mode',
      app.get('port'),
      app.get('env')
    )

    console.log('Press CTRL-C to stop\n')
  })

  process.on('exit', function () {
    console.log('About to exit, waiting for remaining connections to complete')
    const db: MongoClient = app.get('mongoClient')
    db.close()
  })
}

main().catch(console.error)
