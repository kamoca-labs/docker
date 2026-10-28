import fs from 'node:fs'
import path from 'node:path'
import { composeContent, composeRole, deny, field, readInput, services, targetPath, values } from '../lib.ts'

const input = readInput()
const file = targetPath(input)
const role = composeRole(file)
const yaml = composeContent(input)

function declaredByBase(): string[] {
  if (role !== 'dev' && role !== 'prod') return []
  try {
    return services(fs.readFileSync(path.join(path.dirname(file), 'compose.yaml'), 'utf8')).map((service) => service.key)
  } catch {
    return []
  }
}

const inherited = declaredByBase()
const unnamed = yaml === null ? [] : services(yaml)
  .filter((service) => !inherited.includes(service.key))
  .filter((service) => values(field(service, 'container_name'))[0] !== `\${COMPOSE_PROJECT_NAME}-${service.key}`)
  .map((service) => service.key)

if (unnamed.length) {
  deny('container-name', `container_name must be the project name plus the service: ${unnamed.map((key) => `${key} → \${COMPOSE_PROJECT_NAME}-${key}`).join(', ')}.`)
}
