import { composeContent, deny, readInput, services } from '../lib.ts'

// A service with code is named after its role (backend, api, app), so the container keeps its name when the stack changes.
// Infrastructure is named after the technology, because a role such as "database" does not say which one.
const GENERIC_INFRA = new Set(['db', 'database', 'cache', 'queue', 'proxy', 'broker', 'storage', 'mail'])

const yaml = composeContent(readInput())
const generic = yaml === null ? [] : services(yaml).map((service) => service.key).filter((key) => GENERIC_INFRA.has(key))

if (generic.length) {
  deny('service-name', `Infrastructure service with a generic name: ${generic.join(', ')}. Use the technology name (postgres, mysql, redis, rabbitmq, nginx, minio, mailpit). A service with code uses its role (backend, frontend, api).`)
}
