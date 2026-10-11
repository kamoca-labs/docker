import path from 'node:path'
import { composeContent, deny, field, readInput, services, targetPath, values } from '../lib.ts'

const input = readInput()
const name = path.basename(targetPath(input))

if (/^\.env\..+/.test(name) && name !== '.env.example') {
  deny('single-env', `${name}: um .env por ambiente, ./.env no dev e deploy/.env no prod.`)
}

const yaml = composeContent(input)
const others = yaml === null ? [] : services(yaml)
  .flatMap((service) => values(field(service, 'env_file')))
  .map((envFile) => envFile.match(/(?:^|\n)path\s*:\s*["']?([^"'\n]+)/)?.[1] ?? envFile)
  .filter((envFile) => !['.env', './.env'].includes(envFile))

if (others.length) {
  deny('single-env', `env_file fora do .env do ambiente: ${others.join(', ')}. Use \`env_file: .env\`, o que está ao lado do compose.`)
}
