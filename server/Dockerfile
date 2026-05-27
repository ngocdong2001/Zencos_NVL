FROM node:20-bookworm-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
	&& rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
COPY seed-admin.mjs ./seed-admin.mjs
RUN npm run prisma:generate

EXPOSE 4000
CMD ["npx", "tsx", "src/index.ts"]
