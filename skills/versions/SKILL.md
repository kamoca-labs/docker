---
name: versions
description: Choice of image versions. Covers the lookup of the newest tag on Docker Hub, the tag policy, exceptions and the traps of a major version change (Postgres 18). Used by docker:create and docker:tune when they choose or update an image.
user-invocable: false
---

# Image versions

Use the newest stable version of each technology. The memory of the model is always outdated, so look up the tag before you write it. Write the tag in the `FROM` of `docker/<domain>/Dockerfile`, not in an `image:` of the compose file:

```bash
curl -s "https://hub.docker.com/v2/repositories/library/postgres/tags?page_size=100&ordering=last_updated" \
  | python3 -c 'import json,sys; print(*[t["name"] for t in json.load(sys.stdin)["results"]])'
```

- **Tag by major (or major.minor)** with the lean variant: `postgres:18-alpine`, `php:8.5-fpm-alpine`, `redis:8-alpine`, `nginx:1-alpine`. The security patches then arrive on the next pull, and the major version does not change by itself.
- **Node**: the newest LTS (an even version already promoted to LTS), not Current.
- **When the project does not support the newest version** (the constraint is in `composer.json` or `package.json`, or an extension or framework has no release for it yet), use the newest supported version. State in the plan what blocks the update.
- **Postgres 18 changed the data directory.** Mount `./docker/postgres/data/dev:/var/lib/postgresql`, not `.../data`. With the old path, the container refuses to start.

## Changing the major version in a project that has data

The data folder of one major version does not work with the next one. Always get the approval of the user first:

1. Run `pg_dumpall` (or `mysqldump --all-databases`) in the old container, to a file in `docker/postgres/data/`.
2. Start the new version in a new folder (`docker/postgres/data/dev-18`), restore the dump and check the counts of the main tables.
3. Point the compose file to the new folder. Delete the old folder only after the user confirms.
