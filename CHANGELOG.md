# Changelog

Notes reconstructed from repository history and final manifest versions. Dates identify the recorded version changes, not earlier published releases. The temporary 0.3.0/0.4.0 values in the architecture branch were explicitly corrected to 0.2.0 before merge; they are not separate releases here.

## Unreleased

### Breaking changes

- Every service is named after its role, infrastructure included: `database`, `cache`, `queue`, `proxy`, `mail`, `storage`. The folder follows the service (`docker/database`, `docker/proxy`). A change of stack (MySQL to Postgres, nginx to Caddy) keeps the service, the container and the hosts in the URLs. The `FROM` of the Dockerfile says which technology runs. Use the technology name only when the user asks for it. The hook `service-name` now denies only an abbreviation of a role (`db`, `front`, `back`).
- Every comment in a file that the plugin writes is in English, whatever the language of the conversation.

## 0.4.0 (2026-11-07)

### Breaking changes

- A service with code is named after its role (`backend`, `frontend`, `api`), not after the technology. A change of stack keeps the service, the container (`app-backend`) and the hosts in the URLs. Use the technology name only when the user asks for it. Infrastructure keeps the technology name (`postgres`, `redis`, `nginx`). The hook `service-name` now accepts `app`, `api`, `web`, `backend` and `frontend`, and still denies `db`, `database`, `cache`, `queue` and `proxy`.

## 0.3.0 (2026-11-05)

### Breaking changes

- Only four skills are visible to Claude: `docker`, `create`, `tune` and `ci`. The listing of docker drops from 11 descriptions (3,921 characters) to 4 (1,149 characters), as `SKILLS-ARCHITECTURE.md` in the craft repo plans. `node scripts/skill-budget.ts` prints the count.
- The sub-skills are reference files. Claude reads them with `Read`, so `docker:<name>` no longer loads with the `Skill` tool. Update integrations that use the old names:
  - `docker:rules` → `skills/docker/references/rules.md`
  - `docker:development` → `skills/docker/references/development.md`
  - `docker:production` → `skills/docker/references/production.md`
  - `docker:https` → `skills/docker/references/https.md`
  - `docker:measure` → `skills/docker/references/measure.md`
  - `docker:versions` → `skills/docker/references/versions.md`
  - `docker:hot-reload` → `skills/docker/references/hot-reload.md`

### Improvements

- The descriptions of the entry skills have 300 characters or less. Each one puts the main use first, then "Use when ...".
- The structure test guards the layout. Only the entry skills are visible, each description has 300 characters or less and no colon with a space, the hub lists every reference, every reference is linked from a `SKILL.md` and links no other file, and no file names a moved skill.

## 0.2.0 — 2026-10-30

### Breaking changes

- Replace the old `./deploy` layout with root-level base/dev/prod compose files and service-specific files under `docker/<domain>/`.
- Use one multi-stage Dockerfile per service for development and production. The new folder/build hooks replace the old deploy-folder rule.
- Replace `docker:prod-image` with `docker:production` and add dedicated `docker:development` guidance. Update integrations using the old skill name.

### New features

- `/docker:ci` selects a build/deploy strategy from the available registry, runner and server capabilities, supporting GitHub Actions and GitLab CI.
- Registry builds use a reusable bake script and registry-backed layer cache for distinct service images.
- Generated deployment guidance includes automatic/manual execution, rollback and cleanup.

### Fixes

- Deployment templates remove orphan containers so deleted services do not continue running after deployment.
- Project-name guidance avoids application `APP_NAME` collisions by using a literal compose project name when needed.

### Improvements

- The shared compose base describes the complete architecture, replicas and healthchecks; development overlays add hot reload instead of omitting production services.
- Keep environment differences explicit with `.env` and `.env.prod`, shared replica configuration and service-local data folders.
- Distribute English documentation and hook messages, an icon and MIT license information in the standalone repository.
- Correct the maintenance-guide link to point at its relevant section.

Evidence: [architecture](https://github.com/kamoca-labs/docker/commit/7cee661), [cache and orphan cleanup](https://github.com/kamoca-labs/docker/commit/2862ab2), [base architecture and naming](https://github.com/kamoca-labs/docker/commit/9477d2c), [environment skills](https://github.com/kamoca-labs/docker/commit/bd30f84), [version correction](https://github.com/kamoca-labs/docker/commit/9ac371d), [documentation link](https://github.com/kamoca-labs/docker/commit/d15fdf2).

## 0.1.0 — 2026-10-11

### New features

- Introduce create/tune routing for standardized development and production environments.
- Configure development hot reload, host UID/GID, local bind-mounted data, environment defaults and consistent project/service/container naming.
- Provide version lookup, HTTPS with HTTP/2 and HTTP/3, lean production image guidance and measured optimization.
- Add ten hooks to enforce compose, environment, volume, network and Dockerignore conventions.

Historical layout: this version used `./deploy` for production; migrate to the 0.2.0 layout for current guidance.

Evidence: [initial plugin](https://github.com/kamoca-labs/docker/commit/298f267).
