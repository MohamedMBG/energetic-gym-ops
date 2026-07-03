# Frontend: TanStack Start (Vite) — lives at the repo root.
# ponytail: served with `vite dev`. This app's build target is Cloudflare/Nitro,
# not a plain static bundle, so a dev server is the simplest thing that reliably
# runs locally for a single client. Swap to a built runtime if this ever needs scale.
FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 5173

# Bind to 0.0.0.0 so the host browser can reach it; VITE_API_URL is injected by compose.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
