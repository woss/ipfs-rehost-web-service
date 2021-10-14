/* eslint-disable @typescript-eslint/no-var-requires */
require('dotenv').config()
import Agenda from 'agenda'
import { envs, verifyEnv } from './env'
import configureRehostRepo from './jobs/rehostRepo'
verifyEnv()

const jobQueue = new Agenda({
  db: {
    address: envs().MONGODB_CONNSTRING_WITH_DB,
    collection: 'jobs',
  },
})

configureRehostRepo(jobQueue)

jobQueue.start()

export default jobQueue
