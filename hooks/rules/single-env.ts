import path from 'node:path'
import { composeContent, deny, field, readInput, services, targetPath, values } from '../lib.ts'

const input = readInput()
const name = path.basename(targetPath(input))

if (/^\.env\..+/.test(name) && name !== '.env.example') {
  deny('single-env', `${name}: use one .env per environment: ./.env in dev and deploy/.env in prod.`)
}

const yaml = composeContent(input)
const others = yaml === null ? [] : services(yaml)
  .flatMap((service) => values(field(service, 'env_file')))
  .map((envFile) => envFile.match(/(?:^|\n)path\s*:\s*["']?([^"'\n]+)/)?.[1] ?? envFile)
  .filter((envFile) => !['.env', './.env'].includes(envFile))

if (others.length) {
  deny('single-env', `env_file is not the .env of the environment: ${others.join(', ')}. Use \`env_file: .env\`, the one next to the compose file.`)
}
