import fs from 'node:fs'
import path from 'node:path'
import { contentAfter, deny, readInput, targetPath } from '../lib.ts'

const REQUIRED = ['**/.env', '.env.prod', '.git', '**/data', '**/certs']

const input = readInput()
const file = targetPath(input)
const name = path.basename(file)

const ignore = name.endsWith('.dockerignore') ? contentAfter(input) : null

if (ignore !== null) {
  const entries = ignore.split('\n').map((line) => line.trim().replace(/^\/|\/$/g, ''))
  const missing = REQUIRED.filter((entry) => !entries.includes(entry))
  if (missing.length) {
    deny('dockerignore', `${name} is missing ${missing.join(', ')}: the build would copy secrets or data into the image.`)
  }
}

if (/^Dockerfile/.test(name) && !name.endsWith('.dockerignore') && !fs.existsSync(`${file}.dockerignore`)) {
  deny('dockerignore', `${name} has no .dockerignore. First create ${name}.dockerignore next to it, with ${REQUIRED.join(', ')}.`)
}
