FROM node:22-alpine AS deps
WORKDIR /app
COPY mcp/package.json ./package.json
RUN npm install

FROM deps AS builder
COPY mcp/tsconfig.json ./tsconfig.json
COPY mcp/src ./src
COPY prisma ./prisma
RUN ./node_modules/.bin/prisma generate --schema=./prisma/schema.prisma
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./
COPY prisma ./prisma
EXPOSE 3333
CMD ["node", "dist/index.js"]
