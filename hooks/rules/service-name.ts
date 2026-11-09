import { composeContent, deny, readInput, services } from '../lib.ts'

// Every service is named after its role (backend, database, cache, proxy), so a change of stack keeps the service, the container and the hosts in the URLs.
// An abbreviation hides the role, so the hook asks for the full word.
const ABBREVIATIONS = new Set(['db', 'front', 'back', 'fe', 'be', 'mq', 'smtp'])

const yaml = composeContent(readInput())
const short = yaml === null ? [] : services(yaml).map((service) => service.key).filter((key) => ABBREVIATIONS.has(key))

if (short.length) {
  deny('service-name', `Service with an abbreviated name: ${short.join(', ')}. Use the full role (backend, frontend, database, cache, queue, proxy, mail).`)
}
