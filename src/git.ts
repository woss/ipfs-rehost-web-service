/* eslint-disable no-unused-vars */
/* eslint-disable no-case-declarations */
/* eslint-disable @typescript-eslint/no-var-requires */
import { yellow } from 'chalk'
import os from 'os'
import { isNil } from 'ramda'
import simpleGit from 'simple-git'
import { promisify } from 'util'
import { infoAboutRepo, IntegrationInfoReturn } from './integrations/github'

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

  const { repo, unpack = false, tag } = options

  const url = new URL(repo)
  const tmp = os.tmpdir()
  const normalizedName = `${normalizeUrlPathname(url.pathname)}.git`
  const repoPath = `${tmp}/rehost/${normalizedName}`

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
  if (!isNil(tag)) {
    await git.fetch('origin', `refs/tags/${tag}`)
  }

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
  }
}

/**
 * Clone bare repo and return path
 * @param repo
 * @returns
 */
export async function gitClone(options: {
  repo: string
  tag?: string
  rev?: string
  branch?: string
}) {
  const git = simpleGit()

  const { repo, tag, rev } = options

  const url = new URL(repo)
  const tmp = os.tmpdir()
  const normalizedName = `${normalizeUrlPathname(url.pathname)}`
  const repoPath = `${tmp}/rehost/${normalizedName}`

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
  await git.clone(url.href, repoPath)

  await git.cwd({ path: repoPath, root: true })
  await git.updateServerInfo()

  if (!isNil(rev)) {
    console.log(`Checking out the revision ${rev}`)
    await git.checkout(rev)
  } else if (!isNil(tag)) {
    console.log(`Checking out the tag ${tag}`)
    await git.checkout(tag)
  }

  return {
    repoPath,
  }
}

export enum SupportedHosts {
  GITHUB = 'github.com',
  GITLAB = 'gitlab.com',
}

/**
 * Take the params and get the information about the repository from the host
 *```md
 * * IF the repository tag is specified it will return the commit for that tag
 * * If the tag is not specified  it will return latest tag with its commit if that tag exists
 * * If the tag doesn't exist it will return latest commit from the default branch
 *```
 * @param params
 * @returns
 */
export async function repoInformation(params: {
  username: string
  repo: string
  host: SupportedHosts
  tag: string
  revision?: string
}): Promise<IntegrationInfoReturn> {
  const { host, username, repo, tag } = params
  try {
    switch (host) {
      case SupportedHosts.GITHUB:
        const data = await infoAboutRepo({ username, repo, tag })
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
    console.error(error)
    throw new Error(error)
  }
}
