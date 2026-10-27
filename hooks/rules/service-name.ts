import { composeContent, deny, readInput, services } from '../lib.ts'

const GENERIC = new Set(['app', 'application', 'db', 'database', 'web', 'server', 'api', 'backend', 'frontend', 'front', 'back', 'cache', 'queue', 'proxy'])

const yaml = composeContent(readInput())
const generic = yaml === null ? [] : services(yaml).map((service) => service.key).filter((key) => GENERIC.has(key))

if (generic.length) {
  deny('service-name', `Service with a generic name: ${generic.join(', ')}. Use the technology name (postgres, mysql, redis, node, nuxt, react, nginx).`)
}
