import { test } from 'node:test'
import { allowed, denied, sandbox } from './helpers.ts'

const RULE = 'docker-folder'

test('accepts the three compose files in the root', () => {
  for (const name of ['compose.yaml', 'compose.dev.yaml', 'compose.prod.yaml']) allowed(sandbox().write(RULE, name, 'name: x'))
})

test('denies a compose file outside the root, including the old deploy/ layout', () => {
  denied(sandbox().write(RULE, 'docker/compose.yaml', 'name: x'), /project root/)
  denied(sandbox().write(RULE, 'deploy/compose.yaml', 'name: x'), /project root/)
})

test('denies a compose file with a non-standard name or with .yml', () => {
  for (const name of ['compose.yml', 'docker-compose.yml', 'docker-compose.prod.yml', 'compose.staging.yaml']) {
    denied(sandbox().write(RULE, name, 'name: x'), /compose\.yaml, compose\.dev\.yaml and compose\.prod\.yaml/)
  }
})

test('accepts a Dockerfile and its ignore file inside docker/<domain>/', () => {
  allowed(sandbox().write(RULE, 'docker/backend/Dockerfile', 'FROM node:24-alpine'))
  allowed(sandbox().write(RULE, 'docker/backend/Dockerfile.dockerignore', '.git'))
})

test('denies a Dockerfile outside docker/<domain>/', () => {
  for (const file of ['Dockerfile', 'deploy/Dockerfile', 'docker/Dockerfile', 'docker/backend/src/Dockerfile']) {
    denied(sandbox().write(RULE, file, 'FROM x'), /docker\/<domain>\//)
  }
})

test('denies a Dockerfile per environment, because the image is single', () => {
  for (const name of ['Dockerfile.dev', 'Dockerfile.prod', 'Dockerfile.production']) {
    denied(sandbox().write(RULE, `docker/backend/${name}`, 'FROM x'), /single image/)
  }
})

test('denies a loose .dockerignore, because the ignore file stays next to the Dockerfile', () => {
  denied(sandbox().write(RULE, '.dockerignore', '.git'), /Dockerfile\.dockerignore/)
  denied(sandbox().write(RULE, 'docker/backend/.dockerignore', '.git'), /Dockerfile\.dockerignore/)
})

test('a file that is not about Docker passes, like the README of the docker/ folder', () => {
  allowed(sandbox().write(RULE, 'docker/README.md', '# Docker'))
  allowed(sandbox().write(RULE, 'src/product.ts', ''))
})
