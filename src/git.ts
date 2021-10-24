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

export interface IGitCloneOptions {
  repo: string
  tag?: string
  rev?: string
  branch?: string
}
export interface IGitCloneBareOptions extends IGitCloneOptions {
  unpack?: boolean
}

export interface IGitCloneReturn {
  repoPath: string
  repoPathWithoutGit: string
}

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
export async function gitCloneBare(
  options: IGitCloneBareOptions
): Promise<IGitCloneReturn> {
  console.log('gitCloneBare got options', options)

  const { repo, unpack = false, branch, rev, tag } = options

  const url = new URL(repo)
  const tmp = os.tmpdir()
  const normalizedName = `${normalizeUrlPathname(url.pathname)}.git`
  const repoPath = `${tmp}/rehost/${normalizedName}`

  const execOptions = {
    cwd: repoPath,
  }

  if (await exists(repoPath)) {
    log(yellow('Removing the path', repoPath))
    await exec(`rm -rf ${repoPath}`, execOptions)
  }

  // for some reason the failed jobs cannot create the empty dir
  if (!(await exists(repoPath))) {
    await exec(`mkdir -p ${repoPath}`)
  }

  log(yellow('Cloning the bare repo'), url.href, repoPath)
  await exec(`git clone --quiet --bare ${url.href} ${repoPath}`, {
    ...execOptions,
    cwd: tmp,
  })

  await exec(`git update-server-info`, execOptions)
  // console.log((await exec(`git rev-parse 20888c3`, execOptions)).stdout)

  if (!isNil(rev)) {
    console.log(`Reseting to the revision ${rev}`)
    /**
     * this is the one  way i figured how to make a commit a HEAD!
     * other one is `git update-ref refs/heads/rehosted 20888c33cd0f6f897703198199f33369cba8639a` but that will not end up in the detached state. maybe that is what we need .... hmmm .....
     */
    await exec(`echo ${rev} > HEAD`, execOptions)
  } else if (!isNil(tag)) {
    console.log(`Checking out the tag ${tag}`)
    await exec(`git symbolic-ref HEAD refs/tags/${tag.trim()}`, execOptions)
  } else if (!isNil(branch)) {
    console.log(`Checking out the branch ${branch}`)
    await exec(`git symbolic-ref HEAD refs/heads/${branch.trim()}`, execOptions)
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
    repoPathWithoutGit: repoPath,
    repoPath: repoPath,
  }
}

/**
 * Clone repo and return path
 * @param repo
 * @returns
 */
export async function gitClone(
  options: IGitCloneOptions
): Promise<IGitCloneReturn> {
  console.error('NOT NOW, use other one')
  const git = simpleGit()

  const { repo, tag, rev, branch } = options

  const url = new URL(repo)
  const tmp = os.tmpdir()
  const normalizedName = `${normalizeUrlPathname(url.pathname)}`
  const repoPath = `${tmp}/rehost/${normalizedName}`

  const execOptions = {
    cwd: repoPath,
    stdio: [0, 1, 2],
    // stdio: 'inherit',
    // shell: true,
  }

  if (await exists(repoPath)) {
    log(yellow('Removing the path', repoPath))
    await exec(`rm -rf ${repoPath}`, execOptions)
  }

  // console.log(await exec(`git clone --quiet --bare ${url.href} ${repoPath}`, { ...execOptions, cwd: tmp }))
  // for some reason the failed jobs cannot create the empty dir
  if (!(await exists(repoPath))) {
    await exec(`mkdir -p ${repoPath}`)
  }

  log(yellow('Cloning the repo'), url.href, repoPath, tag, rev)
  await git.clone(url.href, repoPath)

  await git.cwd({ path: repoPath, root: true })

  if (!isNil(rev)) {
    // await git.reset(ResetMode.HARD, [rev])
    await exec(`git reset --hard ${rev.trim()}`, execOptions)
  } else if (!isNil(tag)) {
    console.log(`Checking out the tag ${tag}`)
    await git.checkout(tag)
  } else if (!isNil(branch)) {
    console.log(`Checking out the branch ${branch}`)
    await git.checkout(branch)
  }

  return {
    repoPathWithoutGit: repoPath,
    repoPath: `${repoPath}/.git`,
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
