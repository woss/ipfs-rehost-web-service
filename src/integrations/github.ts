import axios from 'axios'
import { envs } from '../env'

const graphqlURL = 'https://api.github.com/graphql'
const headers = {
  authorization: `Bearer ${envs().GITHUB_ACCESS_TOKEN}`,
}

export interface BasicRepoInfo {
  username: string
  repo: string
  branch?: string
}

/**
 * Return the latest commit for default branch using the Graphql
 * @param params
 * @returns
 */
export async function latestCommitForDefaultBranch(params: BasicRepoInfo) {
  const { repo, username } = params
  const query = `
  query {
    repository(owner: "${username.trim()}", name: "${repo.trim()}") {
      defaultBranchRef {
        name
        target {
          ... on Commit {
            history(first: 1) {
              totalCount
              edges {
                node {
                  ... on Commit {
                    hash: oid
                    committedDate
                    commitUrl
                    messageBody
                    messageHeadline
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  `
  const result = await axios.post(
    graphqlURL,
    { query },
    {
      headers,
    }
  )
  return result.data
}

export async function repoExists(params: BasicRepoInfo) {
  const { repo, username } = params
  const query = `
    query {
      repository(owner: "${username.trim()}", name: "${repo.trim()}") {
      isFork
      }
  }
  `
  const { data } = await axios.post<
    { query: string },
    {
      data: {
        data: {
          repository: { isFork: boolean }
        }
        errors?: {
          type: string
        }
      }
    }
  >(
    graphqlURL,
    { query },
    {
      headers,
    }
  )

  if (data.errors && data.errors.type === 'NOT_FOUND') {
    return { exists: false }
  } else {
    return { exists: true, isFork: data.data.repository.isFork }
  }
}
