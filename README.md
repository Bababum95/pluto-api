# Pluto API

[![CI](https://github.com/Bababum95/pluto-api/actions/workflows/ci.yml/badge.svg)](https://github.com/Bababum95/pluto-api/actions/workflows/ci.yml)
[![codecov](https://codecov.io/github/Bababum95/pluto-api/graph/badge.svg?token=7WJ5PVP04F)](https://codecov.io/github/Bababum95/pluto-api)

NestJS backend API for Pluto: authentication, users, accounts, transactions, currencies and exchange rates.

## Stack

- **Runtime:** Node.js 20+
- **Framework:** NestJS 11
- **DB:** MongoDB (Mongoose)
- **Auth:** JWT + Passport (local, jwt)
- **Docs:** Swagger (OpenAPI)
- **i18n:** nestjs-i18n
- **Validation:** class-validator, class-transformer

## Modules

| Module        | Description                              |
| ------------- | ---------------------------------------- |
| `auth`        | Registration, login, JWT guard           |
| `user`        | User profile                             |
| `currency`    | Currency reference data                  |
| `rate`        | Exchange rates (including external API)  |
| `category`    | Transaction categories                   |
| `account`     | User accounts                            |
| `transaction` | Transactions between accounts/currencies |
| `settings`    | Application settings                     |

## Requirements

- Node.js 20+
- pnpm 9+
- MongoDB
- Environment variables (see `.env.example` or description below)

## Installation

```bash
pnpm install
```

## Environment variables

Minimum to run:

- `MONGODB_URI` — MongoDB connection string
- `MONGODB_DB_NAME` — Database name (default: `pluto`)
- `JWT_SECRET` — Secret for JWT signing

Other variables as needed (external APIs, port, etc.).

## Running the app

```bash
# development
pnpm run start

# watch mode
pnpm run dev

# production
pnpm run build
pnpm run start:prod
```

## Testing

```bash
# unit tests
pnpm run test

# with coverage (report for Codecov)
pnpm run test:cov

# e2e
pnpm run test:e2e
```

## Linting

```bash
pnpm run lint
```

## Additional scripts

- `pnpm run update:rates` — Update exchange rates (script `src/scripts/update-rates.ts`).

## API documentation

When running in dev, Swagger UI is available at (if enabled in the app):

- `http://localhost:3000/api` (or the port from your config)

## CI / Codecov

- GitHub Actions (`.github/workflows/ci.yml`) runs tests and collects coverage.
- Reports are uploaded to [Codecov](https://codecov.io) when `CODECOV_TOKEN` is set in repository secrets.

If your repository is different (not `bababum95/pluto`), update the badge URLs at the top of this README with your owner and repo name.

## License

MIT
