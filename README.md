# ipfs-git-rehost-web-service

**⚒️PoC and HEAVY work in progress**

Web service for re-hosting the git repositories using the IPFS.

# Production

It's fairly stable, but run it on production at your own risk.

See [Building and running the project](#building-and-running-the-project) for more info

# Development and running locally

You will need:

- PNPM
- nodejs
- Docker
- IPFS node
- [GitHub personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
- editor (VsCode, nvim, ...)

How to start

```sh
# copy the env sample file
cp env.sample .env

# install deps
pnpm i

# make sure you check .env and replace the variables with your own.

# start server and worker. Server starts on the port 3000
pnpm start

# lint and fix stuff
pnpm lint:fix
```

### Building and running the project

#### Building a Docker image

With `docker-compose` it's easy. Run `docker-compose build rehost` and you will have the image build with all production deps installed.

#### Running the service with docker

The MongoDB is bundeled with, but you can use any mongodb service, just configure the `MONGODB_HOST` and `MONGODB_PORT` in your `.env` file and you are ready to go.

You can run the docker image from the https://hub.docker.com/r/woss/rehost-service

# API endpoints

Be aware that this is the PoC (ProofOfConcept) and the API is made to serve the purpose. It is NOT optimized or RESTfull.

All errors are in the format:

```ts
interface ErrorResponse {
  error: true
  message: string
}
```

## QUEUE API

### ADD REPO TO RE-HOST QUEUE

This is your first stop to start re-hosting the repository. This `GET` endpoint will create the worker job and will return 3 different responses based on the state of the execution.

This is done intentionally like this since we want to be able to quickly re-host the repo in the browser. Basically you should remove the `https://` and add the `http://localhost:3000/v1/q/` or your own `https://my-rehost/v1/q/` prefix.

There are few query params that can be passed, one is important and determines the update of the repo. `update=true` query param means that the service will look for new commits to default branch ( only ) and re-host that commit. Previous re-host is NOT deleted.

**REQUEST**

GET `/v1/q/add/:host/:username/:repo`

Signature for the url params are:

```ts
enum SupportedHosts {
  GITHUB = 'github.com',
  GITLAB = 'gitlab.com',
}

interface AddQueuePArams {
  host: SupportedHosts
  username: string
  repo: string
}
```

Signature for the query params are:

```ts
interface AddQueueQueryParams {
  // unused ATM
  rev?: string
  // unused ATM
  tag?: string
  // this can be true or 1. the types are handeled properly
  update?: string
}
```

Example:

`http://localhost:3000/v1/q/add/github.com/woss/ipfs-git-rehost-web-service`

**RESPONSEs**

These are the possible responses:

1. if IPFS node is not connected, error is returned with `STATUS_CODE=400`
2. Repository check based on the `host`. If it doesn't exist error is returned with `STATUS_CODE=404`
3. Job added, repo doesn't exist and it's not an update `STATUS_CODE=201`
4. Job added, repo exists and it's an update `STATUS_CODE=201`
5. Job not added, repo exists and it's an update `STATUS_CODE=200`
6. Job not added, repo exists and it's not an update `STATUS_CODE=200`

In case of the `STATUS_CODE=201` and `STATUS_CODE=200` the response will contain the api URL with the `jobID` which can be followed later to see actual repo information.

> This is done intentionally!! Please don't raise issues for this.

Signatures are:

Case #3

```js
{
  apiURL: `/v1/q/${job.attrs._id}`,
  willUpdate: false,
}
```

Case #4

```js
{
  apiURL: `/v1/repo/${mongoDocument._id}`,
  willUpdate: true,
}
```

Case #5

```js
{
  apiURL: `/v1/repo/${mongoDocument._id}`,
  willUpdate: true,
}
```

Case #6

```js
{
  apiURL: `/v1/repo/${mongoDocument._id}`,
  willUpdate: false,
}
```

### GET INFO ON THE JOB

This endpoint will either show that the job is still running, error with `STATUS_CODE=404` if not found or it will return full re-host document.

Example: `http://localhost:3000/v1/q/61682c90449fa8b7625be6b4`

## REPOS API

### ALL THE REPOS

Paginated list of all the repos with all the re-host versions.

The hardcoded limit is `10` returned repos and no way to change it via the query param.

> This is done intentionally since the `rehosted` key can be quite big.

**REQUEST**

GET `/v1/repos`

**RESPONSE**

The successful response has as signature:

```ts
interface RehostedEmbedded {
  cid: string
  ipfsUrl: string
  rev: string
  tag: string
  size: number
}
interface RepositoryInfo {
  name: string
  userName: string
  host: string
}

interface Repository {
  _id: ObjectId
  repo: RepositoryInfo
  repoUrl: string
  rehosted: RehostedEmbedded[]
  isFork: boolean
  createdAt: number
  updatedAt: number
}

interface Response {
  docs: Repository[]
  total: number
  pages: number
}
```

Example: `http://localhost:3000/v1/repos`

### SINGLE REPO

Get the information on single repository retrieved by the `_id` field where the `:id` is the `_id` field from the `repos` endpoint.
**REQUEST**

GET `/v1/repo/:id`

**RESPONSE**

```ts
interface RehostedEmbedded {
  cid: string
  ipfsUrl: string
  rev: string
  tag: string
  size: number
}

interface RepositoryInfo {
  name: string
  userName: string
  host: string
}

interface Repository {
  _id: ObjectId
  repo: RepositoryInfo
  repoUrl: string
  rehosted: RehostedEmbedded[]
  isFork: boolean
  createdAt: number
  updatedAt: number
}
interface Response extends Repository {}
```

Example: `http://localhost:3000/v1/repo/61682fb7cbf2fcd9ec3d63a8`

## RE-HOST API

Every re-hosted repository has a CID which is indexed unique identifier. On the DB level these records are part of the repository document and this endpoint returns only the one that matches the given CID.

Note that the CID must be valid, otherwise the request will fail with the generic CID error.

**REQUEST**

GET `/v1/rehosted/:cid`

**RESPONSE**

```ts
interface RehostedEmbedded {
  cid: string
  ipfsUrl: string
  rev: string
  tag: string
  size: number
}
interface Response extends RehostedEmbedded {}
```
