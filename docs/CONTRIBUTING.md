# Contributing

## Prerequisites

- Node.js 20+
- MongoDB connection string in `server/.env`
- Groq API key in `server/.env` for AI features

## Local setup

```bash
cd server
cp .env.example .env
npm install

cd ../client
npm install
npm run dev
```

Start the API from `server/` with `node server.js`. The client proxies API calls to
`http://localhost:5001` by default.

## Git identity

GitHub only links commits to an account when the author email matches a verified/no-reply address.
Set the repository identity before committing:

```bash
git config user.name "Rohit Chintalapudi"
git config user.email "216713165+RohitChintalapudi@users.noreply.github.com"
```

Do not use the old `rohitgaming0024@users.noreply.github.com` address; it is not linked to the
current GitHub account and its commits are ignored by the contribution graph. Verify the setup with:

```bash
node scripts/check-git-identity.mjs
```

## Checks

```bash
cd server && npm test
cd client && npm run lint
cd client && npm run build
```

Use short, imperative commit messages such as `fix: persist GitHub status` or
`test: cover manifest matching rules`.
