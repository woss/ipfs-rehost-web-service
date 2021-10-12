require('dotenv').config()
import { verifyEnv } from './env'
verifyEnv()

import Agenda from 'agenda'
import { envs } from './env'
import configureRehostRepo from './jobs/rehostRepo'

const jobQueue = new Agenda({
  db: {
    address: envs().MONGODB_CONNSTRING_WITH_DB,
    collection: 'jobs',
  },
})

configureRehostRepo(jobQueue)

jobQueue.start()

export default jobQueue
