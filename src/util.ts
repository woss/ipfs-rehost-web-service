import { SupportedHosts } from './git'

export function buildRepoURL({
  host,
  username,
  repo,
}: {
  host: SupportedHosts
  username: string
  repo: string
}) {
  return `https://${host}/${username}/${repo}`
}
