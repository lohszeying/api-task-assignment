FROM node:24-alpine AS base
WORKDIR /app
RUN chown -R node:node /app
USER node

FROM base AS deps
COPY --chown=node:node package*.json ./
COPY --chown=node:node prisma ./prisma
RUN npm install

FROM deps AS development
ENV NODE_ENV=development
COPY --chown=node:node tsconfig.json ./
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node src ./src
CMD ["npm", "run", "dev"]

FROM deps AS build
COPY --chown=node:node tsconfig.json ./
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node src ./src
RUN npm run build

FROM base AS production
ENV NODE_ENV=production

COPY --chown=node:node package*.json ./
RUN npm install --omit=dev

COPY --from=build /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/server.js"]
