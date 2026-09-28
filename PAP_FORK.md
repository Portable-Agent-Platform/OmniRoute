# Portable Agent Platform OmniRoute Fork

This repository is the maintained OmniRoute distribution used by Portable Agent Platform (PAP).

## Branch contract

- `pap/main` — PAP stable branch. Images deployed by PAP must originate here.
- `pap/*` — short-lived PAP feature/hardening branches merged through pull requests.
- `release/v3.8.51` and other inherited upstream branches are reference branches, not PAP production channels.
- Upstream source: `https://github.com/diegosouzapw/OmniRoute`.

The VPS source worktree should use:

```text
origin   https://github.com/Portable-Agent-Platform/OmniRoute.git
upstream https://github.com/diegosouzapw/OmniRoute.git
```

## Upstream policy

PAP stays close to upstream. Pull upstream changes intentionally, review conflicts against PAP patches, run PAP CI and container smoke tests, then merge into `pap/main`. Never auto-deploy an upstream branch or tag directly to production.

When upstream implements an equivalent PAP fix correctly, prefer deleting our patch over maintaining duplicate behavior.

## PAP patch registry

Current PAP-specific contracts include:

1. NVIDIA bearer credential canonicalization: trim transport whitespace and an accidentally pasted `Bearer ` prefix in memory before validation/runtime use. Stored encrypted rows are not rewritten.
2. NVIDIA live-model discovery uses the same canonical credential shape as inference.
3. NVIDIA vendor-qualified model IDs are regression-tested so an upstream ID such as `nvidia/nemotron-3-super-120b-a12b` is preserved exactly after PAP provider routing.
4. PAP CI gates `pap/main` with core typecheck and PAP/NVIDIA regression tests.
5. PAP Container builds `runner-base` for `linux/amd64` and publishes immutable GHCR image digests from `pap/main`.

## Release and deployment contract

Canonical image repository:

```text
ghcr.io/portable-agent-platform/omniroute
```

Moving tags such as `pap-main` are for discovery only. Production must always use an immutable digest:

```text
ghcr.io/portable-agent-platform/omniroute@sha256:<digest>
```

Before promotion:

1. PAP CI must be green.
2. PAP Container build/runtime smoke must be green.
3. The image must pass the isolated VPS OmniRoute canary against a disposable data snapshot.
4. NVIDIA authentication/model tests must pass when NVIDIA is part of the release scope.
5. Five-account NVIDIA routing must pass the PAP round-robin conformance check before Hermes is wired to those routes.

Production promotion/rollback is controlled by `OMNIROUTE_IMAGE` in the PAP VPS environment and `apps/omniroute/compose.yml` in the main platform repository.

## Security rules

- Never commit provider credentials, decrypted keys, session tokens, or `.env` contents.
- Never log credential values or key substrings in diagnostics.
- Do not weaken native onboarding/authentication to simplify testing.
- Do not mount the live OmniRoute data directory read-write into candidate containers.
- Do not expose canary containers through host ports or Caddy.
- Preserve digest pinning and rollback snapshots for production changes.

## PAP ownership

PAP may add provider routing, observability, reporting hooks, agent integrations, quota/cost controls, conformance testing, and other platform features as required. Keep these additions modular so upstream synchronization remains practical.
