# Backend: Express + Drizzle + postgres-js. Single stage, keep it simple.
FROM node:20-alpine
WORKDIR /app

# Install deps (incl. drizzle-kit devDep, needed to create tables at startup).
COPY package.json package-lock.json ./
RUN npm ci

# Build TypeScript -> dist
COPY . .
RUN npm run build

EXPOSE 3001

# On start: create/update tables from schema, then run the server.
# --force auto-accepts so it never waits for a human at the client's machine.
CMD ["sh", "-c", "npx drizzle-kit push --force && node dist/index.js"]
