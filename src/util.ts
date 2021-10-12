export function buildRepoURL({
  host,
  username,
  repo,
}: {
  host: string
  username: string
  repo: string
}) {
  return `https://${host}/${username}/${repo}`
}
