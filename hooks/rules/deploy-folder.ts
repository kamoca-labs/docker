import path from 'node:path'
import { deny, isDeploy, readInput, targetPath } from '../lib.ts'

const DOCKER_FILE = /^((docker-)?compose|Dockerfile)|\.dockerignore$/

const file = targetPath(readInput())
const name = path.basename(file)

if (DOCKER_FILE.test(name) && /prod/i.test(name) && !isDeploy(file)) {
  deny('deploy-folder', `${name}: all prod files belong in ./deploy (deploy/compose.yaml, deploy/Dockerfile, deploy/Dockerfile.dockerignore).`)
}
