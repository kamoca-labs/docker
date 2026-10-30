import path from 'node:path'
import { composeContent, composeRole, deny, field, readInput, services, targetPath, values } from '../lib.ts'

const ENV_FILES = { base: [], dev: ['.env', './.env'], prod: ['.env.prod', './.env.prod'] }

const input = readInput()
const name = path.basename(targetPath(input))
const role = composeRole(targetPath(input)) ?? 'dev'

if (/^\.env\..+/.test(name) && !['.env.example', '.env.prod'].includes(name)) {
  deny('single-env', `${name}: use one .env per environment: ./.env in dev and ./.env.prod in prod.`)
}

const yaml = composeContent(input)
const others = yaml === null ? [] : services(yaml)
  .flatMap((service) => values(field(service, 'env_file')))
  .map((envFile) => envFile.match(/(?:^|\n)path\s*:\s*["']?([^"'\n]+)/)?.[1] ?? envFile)
  .filter((envFile) => !ENV_FILES[role].includes(envFile))

if (others.length) {
  const expected = role === 'base' ? 'Remove it from the base file, because each environment reads its own' : `Use \`env_file: ${ENV_FILES[role][0]}\``
  deny('single-env', `env_file is not the ${role === 'prod' ? '.env.prod' : '.env'} of the environment: ${others.join(', ')}. ${expected}.`)
}
