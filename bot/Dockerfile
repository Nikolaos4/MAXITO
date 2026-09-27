FROM node:24-slim

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

COPY . .

ENV NODE_EXTRA_CA_CERTS=/app/certs/russian_trusted_ca_bundle.pem

CMD ["pnpm", "start"]
