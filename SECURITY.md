# Security Policy — Bargheto Handbook

## Scope

This public repository contains a full-stack employee handbook application and migration material. It is not a guarantee of a security-audited production deployment.

## Reporting security issues

Please **do not post credentials, employee personal details, exploit payloads, database dumps, or confidential screenshots in public Issues or Pull Requests**.

If GitHub private vulnerability reporting is enabled for this repository, use the repository's **Security → Report a vulnerability** route. Otherwise, contact the repository owner privately through an established communication channel before sharing sensitive details. No public email is specified here.

## Deployment cautions

- Review the authentication model and the trust boundary for `oai-authenticated-user-email` / other identity headers.
- Review the local-development owner fallback before moving behind proxies or exposing a public server.
- Restrict D1/R2 bindings and validate authorization of every API and uploaded object.
- Rotate any exposed access tokens and revoke sessions if a leak is suspected.
- Scrub `migration/data/`, release archives, logs, and media before sharing.
- Never commit `.env`, personal records, cookies, service account keys or production data dumps.

Security-related changes should be tested in a separate environment and reviewed before deployment.
