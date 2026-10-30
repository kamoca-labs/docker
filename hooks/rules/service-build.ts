import path from 'node:path'
import { composeContent, composeRole, deny, type Entry, entries, field, readInput, services, targetPath } from '../lib.ts'

const DOCKERFILE = /^docker\/[\w.-]+\/Dockerfile$/

const input = readInput()
const role = composeRole(targetPath(input))
const yaml = role === 'base' || role === 'dev' ? composeContent(input) : null
const all = yaml === null ? [] : services(yaml)

function resolvedDockerfile(service: Entry): string {
  const build = entries(field(service, 'build')?.body ?? [])
  const valueOf = (key: string) => build.find((entry) => entry.key === key)?.value.replace(/^["']|["']$/g, '')
  const dockerfile = valueOf('dockerfile')
  return dockerfile ? path.posix.join(valueOf('context') || '.', dockerfile) : ''
}

const withoutBuild = role === 'base' ? all.filter((service) => !DOCKERFILE.test(resolvedDockerfile(service))).map((service) => service.key) : []

if (withoutBuild.length) {
  deny('service-build', `Give every service in the base file a build that resolves to docker/<domain>/Dockerfile. This includes third-party services (one FROM only). The dockerfile path is relative to the context. Use \`context: .\` with \`dockerfile: docker/<domain>/Dockerfile\`, or \`context: docker/<domain>\` with \`dockerfile: Dockerfile\`. Services without a valid build: ${withoutBuild.join(', ')}.`)
}

const withImage = role === 'dev' ? all.filter((service) => field(service, 'image')).map((service) => service.key) : []

if (withImage.length) {
  deny('service-build', `Remove image: from these dev services: ${withImage.join(', ')}. The image comes from the base build, with \`target: dev\`.`)
}
