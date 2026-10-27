import { composeContent, deny, entries, field, lines, readInput, services, values } from '../lib.ts'

const LOCAL = /^(\.{1,2}(\/|$)|\/|~|\$\{)/

function isLocalFolder(volume: string): boolean {
  if (/(^|\n)type\s*:/.test(volume)) return /(^|\n)type\s*:\s*["']?(bind|tmpfs)\b/.test(volume)
  return LOCAL.test(volume) && volume.replace(/\$\{[^}]*\}/g, 'X').includes(':')
}

const yaml = composeContent(readInput())

if (yaml !== null) {
  const declared = entries(lines(yaml)).find((entry) => entry.key === 'volumes')
  if (declared && (declared.body.length || !['', '{}'].includes(declared.value))) {
    deny('bind-volumes', 'Named volume declared at the top level of the compose file. Point every volume to a local folder (example: `./.data/postgres:/var/lib/postgresql/data`).')
  }
  const named = services(yaml).flatMap((service) =>
    values(field(service, 'volumes')).filter((volume) => !isLocalFolder(volume)).map((volume) => `${service.key}: ${volume.split('\n')[0]}`))
  if (named.length) {
    deny('bind-volumes', `Volume that does not point to a local folder: ${named.join(', ')}. Use \`./<folder>:<target>\` (example: \`\${DATA_DIR:-./.data}/postgres:/var/lib/postgresql/data\`).`)
  }
}
