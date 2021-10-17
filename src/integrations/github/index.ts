import fetch from 'cross-fetch'
import { ClientError, GraphQLClient } from 'graphql-request'
import { isEmpty, isNil } from 'ramda'
import { envs } from '../../env'
import { getSdk } from '../../generated/nodes'

const graphqlURL = 'https://api.github.com/graphql'
const headers = {
  authorization: `Bearer ${envs().GITHUB_ACCESS_TOKEN}`,
}

export function initClient(): GraphQLClient {
  const client = new GraphQLClient(graphqlURL, {
    headers,
    fetch,
  })
  return client
}

export interface BasicRepoInfo {
  username: string
  repo: string
  branch?: string
  tag?: string
}

export interface IntegrationInfoReturn {
  isFork: boolean
  tag: string | null
  commit: string
  committedDate: string
}
export async function infoAboutRepo(
  params: BasicRepoInfo
): Promise<IntegrationInfoReturn> {
  const { repo, username, tag = '' } = params
  try {
    const sdk = getSdk(initClient())
    const res = await sdk.RepoBasicInfoWithTag({
      name: repo,
      owner: username,
      tag,
    })
    const {
      repository: {
        tags: { nodes: tags },
        isFork,
        latestCommit: { target: latestCommit },
      },
    } = res

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lastCommit = latestCommit as any

    if (isEmpty(tags)) {
      console.log(`This repo does not have tag ${tag}`)

      return {
        isFork,
        tag: null,
        commit: lastCommit.history.edges[0].node.hash,
        committedDate: lastCommit.history.edges[0].node.committedDate,
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tagGQL = tags[0].target as any

      return {
        isFork,
        tag: tagGQL.name,
        commit: tagGQL.commit.oid,
        committedDate: tagGQL.commit.committedDate,
      }
    }
  } catch (error) {
    const e = error as ClientError
    if (!isNil(e.response?.errors[0])) {
      throw new Error(e.response.errors[0].message)
    } else {
      throw new Error(e.message)
    }
  }
}
