import { composeContent, deny, field, readInput, services, values } from '../lib.ts'

const yaml = composeContent(readInput())
const unnamed = yaml === null ? [] : services(yaml)
  .filter((service) => values(field(service, 'container_name'))[0] !== `\${COMPOSE_PROJECT_NAME}-${service.key}`)
  .map((service) => service.key)

if (unnamed.length) {
  deny('container-name', `container_name deve ser o name do projeto + o serviço: ${unnamed.map((key) => `${key} → \${COMPOSE_PROJECT_NAME}-${key}`).join(', ')}.`)
}
