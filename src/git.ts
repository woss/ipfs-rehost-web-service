/* eslint-disable no-unused-vars */
/* eslint-disable no-case-declarations */
/* eslint-disable @typescript-eslint/no-var-requires */
import { yellow } from 'chalk'
import os from 'os'
import simpleGit from 'simple-git'
import { promisify } from 'util'
import { repoExists } from './integrations/github'

const exec = promisify(require('child_process').exec)
const exists = promisify(require('fs').exists)

const log = console.log

/**
 * Normalize Repository to be in a format `username_repo-name`
 * @param pathName
 * @returns
 */
export function normalizeUrlPathname(pathName: string) {
  return pathName.slice(1).replace(/\//gi, '_').replace('.git', '')
}

/**
 * Clone bare repo and return path
 * @param repo
 * @returns
 */
export async function gitCloneBare(options: {
  repo: string
  tag?: string
  rev?: string
  branch?: string
  unpack?: boolean
}) {
  const git = simpleGit()

  const { repo, unpack = false } = options

  const url = new URL(repo)
  const tmp = os.tmpdir()
  const normalizedName = `${normalizeUrlPathname(url.pathname)}.git`
  const repoPath = `${tmp}/${normalizedName}`

  const execOptions = {
    cwd: repoPath,
    stdio: [0, 1, 2],
    // stdio: 'inherit',
    // shell: true
  }

  if (await exists(repoPath)) {
    log(yellow('Removing the path', repoPath))
    await exec(`rm -rf ${repoPath}`, execOptions)
  }

  // console.log(await exec(`git clone --quiet --bare ${url.href} ${repoPath}`, { ...execOptions, cwd: tmp }))

  log(yellow('Cloning the repo'), url.href, repoPath)
  await git.clone(url.href, repoPath, ['--bare'])

  await git.cwd({ path: repoPath, root: true })
  await git.updateServerInfo()
  const { latest } = await git.log({ maxCount: 1 })

  if (unpack) {
    log(yellow('Unpacking ...'))
    await exec(`mv objects/pack/*.pack .`, execOptions)
    await exec(`cat *.pack | git unpack-objects`, execOptions)
    // await exec(`git unpack-objects < *.pack`, execOptions)
    await exec(`rm -f *.pack`, execOptions)
    await exec(`rm -f objects/pack/*.idx`, execOptions)
    log(yellow('Done unpacking.'))
  }

  return {
    repoPath,
    commit: latest,
  }
}

export enum SupportedHosts {
  GITHUB = 'github.com',
  GITLAB = 'gitlab.com',
}

/**
 * Check does git repo exists on the host, currently github.com
 * @param params
 * @returns
 */
export async function checkDoesGitRepoExists(params: {
  username: string
  repo: string
  host: SupportedHosts
}): Promise<{
  exists: boolean
  isFork?: boolean
}> {
  const { host, username, repo } = params
  try {
    switch (host) {
      case SupportedHosts.GITHUB:
        const data = await repoExists({ username, repo })
        if (data.isFork) {
          console.log(
            'Repo is a fork, cloning it twice in row will not generate same CID'
          )
        }

        return data

      default:
        console.error('DEFAULT CASE FOR THE HOST IS NOT AVAILABLE!!!')
        break
    }
  } catch (error) {
    console.error('Error response:')
    console.error(error.response.data) // ***
    console.error(error.response.status) // ***
    // console.error(error.response.headers); // ***
    return { exists: false }
  }
}
