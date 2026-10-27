import { composeContent, deny, field, isDeploy, readInput, services, targetPath, values } from '../lib.ts'

const USER = /^\$\{UID:-\d+\}:\$\{GID:-\d+\}$/
const READ_ONLY_OR_MEMORY = /:ro$|(^|\n)read_only\s*:\s*true\b|type\s*:\s*["']?tmpfs/

const input = readInput()
const yaml = isDeploy(targetPath(input)) ? null : composeContent(input)
const withoutUser = yaml === null ? [] : services(yaml)
  .filter((service) => values(field(service, 'volumes')).some((volume) => !READ_ONLY_OR_MEMORY.test(volume)))
  .filter((service) => !USER.test(values(field(service, 'user'))[0] ?? ''))
  .map((service) => service.key)

if (withoutUser.length) {
  deny('dev-user', `Dev service that mounts a local folder with write access runs without the host user: ${withoutUser.join(', ')}. Use \`user: "\${UID:-1000}:\${GID:-1000}"\` and generate UID and GID in the .env with \`id -u\` and \`id -g\`.`)
}
