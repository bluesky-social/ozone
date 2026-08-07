# CI Dependency Audit Policy

Date: 2026-07-07

## Decision

Ozone now runs a recursive Yarn dependency audit in CI for both the root app and
the independently installed `service` package. The job captures full recursive
audit output as artifacts, then blocks the workflow only on high-or-worse
findings.

The repository also pins the current Node and Yarn toolchain for this audit
path:

- Node.js: `26.4.0`
- Yarn: `4.17.0`

Yarn is configured with a three-day npm package release-age gate. Newly
published package versions are not eligible for installation until they are at
least three days old unless they are explicitly preapproved.

## Rationale

The baseline audit showed high-severity vulnerabilities in both lockfiles, so a
new CI check would have been permanently red without dependency remediation.
Those high findings were remediated before the gate was added.

The full recursive report remains valuable even when it includes lower-severity
or deprecation findings. Uploading it as an artifact preserves before/after
analysis data without making every moderate deprecation a merge blocker.

The release-age gate reduces the chance that routine installs immediately pick
up a compromised npm release. The three-day window matches the period when npm
packages can still be unpublished and gives maintainers, scanners, and the
community time to flag suspicious releases.

`npmPreapprovedPackages` is intentionally empty. If a known vulnerability fix
requires installing a package version younger than the gate, the exception
should be narrow, reviewed in the PR, and removed once the release ages past the
gate. For one-off local remediation work, `yarn add --no-time-gate` or
`yarn up --no-time-gate` can be used with the same review rationale.

`cypress@15.18.1` and `@atproto/ozone@0.2.13` were not used because Yarn
reported those exact releases as quarantined. The branch uses the newest
non-quarantined versions that clear the high-severity gate:

- `cypress@15.17.0`
- `@atproto/ozone@0.2.12`

## Consequences

- Pull requests now fail when root or service dependencies contain recursive
  high-severity audit findings.
- Routine installs avoid npm package versions published in the last three days.
- CI artifacts retain full audit output for later analysis.
- Urgent dependency-security fixes can still proceed through a narrow
  `npmPreapprovedPackages` exception or a reviewed one-command time-gate bypass.
- The service package now declares its own Node/Yarn contract and `react-dom`
  peer dependency because it is installed independently during Docker builds.
- Remaining root full-audit findings are tracked as follow-up migration work:
  `rehype-autolink-headings`' `@ungap/structured-clone` deprecation and the
  Recharts v3 migration.
