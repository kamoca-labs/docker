import { test } from 'node:test'
import { allowed, BASE, denied, sandbox } from './helpers.ts'

const RULE = 'service-build'

test('accepts a base file with a build that points to docker/<domain>/Dockerfile in every service', () => {
  allowed(sandbox().write(RULE, 'compose.yaml', BASE))
})

test('the dockerfile is relative to the context: both forms resolve to docker/<domain>/Dockerfile', () => {
  const build = (context: string, dockerfile: string) => `services:\n  node:\n    build:\n      context: ${context}\n      dockerfile: ${dockerfile}\n`
  allowed(sandbox().write(RULE, 'compose.yaml', build('.', 'docker/backend/Dockerfile')))
  allowed(sandbox().write(RULE, 'compose.yaml', build('docker/backend', 'Dockerfile')))
  denied(sandbox().write(RULE, 'compose.yaml', build('docker/backend', 'docker/backend/Dockerfile')), /node/)
  denied(sandbox().write(RULE, 'compose.yaml', build('.', 'Dockerfile')), /node/)
})

test('denies a base service that has only image:', () => {
  denied(sandbox().write(RULE, 'compose.yaml', `${BASE}  redis:\n    image: redis:8-alpine\n`), /redis/)
})

test('denies a build without dockerfile or with a dockerfile outside docker/<domain>/', () => {
  denied(sandbox().write(RULE, 'compose.yaml', BASE.replace(/ {4}build:\n {6}context: \.\n {6}dockerfile: .*\n/, '    build: .\n')), /node/)
  denied(sandbox().write(RULE, 'compose.yaml', BASE.replace('docker/backend/Dockerfile', 'Dockerfile')), /node/)
})

test('dev does not declare image:', () => {
  const dev = 'name: dev-x\nservices:\n  node:\n    build:\n      target: dev\n'
  allowed(sandbox().write(RULE, 'compose.dev.yaml', dev))
  denied(sandbox().write(RULE, 'compose.dev.yaml', `${dev}    image: node:24-alpine\n`), /image:/)
})

test('prod can declare image: with the registry and the tag', () => {
  const prod = 'name: x\nservices:\n  node:\n    image: ${REGISTRY}/${APP_NAME:-app}-node:${IMAGE_TAG:-latest}\n    build:\n      target: prod\n'
  allowed(sandbox().write(RULE, 'compose.prod.yaml', prod))
})

test('a file that is not a compose file or has no role passes', () => {
  allowed(sandbox().write(RULE, 'config.yaml', 'services: {}'))
  allowed(sandbox().write(RULE, 'docker-compose.yml', 'services:\n  app:\n    image: x\n'))
})
