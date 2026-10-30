import path from 'node:path'
import { deny, readInput, targetPath } from '../lib.ts'

const COMPOSE_FILE = /^(docker-)?compose(\.[\w-]+)?\.ya?ml$/
const COMPOSE_NAMES = ['compose.yaml', 'compose.dev.yaml', 'compose.prod.yaml']
const IMAGE_FILE = /^Dockerfile|\.dockerignore$/
const IMAGE_NAMES = ['Dockerfile', 'Dockerfile.dockerignore']

const input = readInput()
const relative = path.relative(input.cwd, targetPath(input))
const [folder, domain, ...rest] = relative.split(path.sep)
const name = path.basename(relative)
const inDomain = folder === 'docker' && domain !== undefined && rest.length === 1

if (!relative.startsWith('..') && COMPOSE_FILE.test(name)) {
  if (!COMPOSE_NAMES.includes(name)) {
    deny('docker-folder', `${name} is not a valid compose file name. Use ${COMPOSE_NAMES.join(', ').replace(/, ([^,]*)$/, ' and $1')}, in the project root.`)
  }
  if (relative !== name) {
    deny('docker-folder', `${relative}: the compose file belongs in the project root (${name}). Put the rest of Docker in docker/<domain>/.`)
  }
}

if (!relative.startsWith('..') && IMAGE_FILE.test(name)) {
  if (!IMAGE_NAMES.includes(name) && name !== '.dockerignore') {
    deny('docker-folder', `${name}: use one image for all environments. Each domain has only docker/<domain>/Dockerfile. The \`target:\` (dev or prod) in the compose file picks the environment.`)
  }
  if (!inDomain || !IMAGE_NAMES.includes(name)) {
    deny('docker-folder', `${relative}: put the Dockerfile and its ignore file in docker/<domain>/ (docker/backend/Dockerfile and docker/backend/Dockerfile.dockerignore).`)
  }
}
