# Stage 1: build the React client
FROM node:22-slim AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci --no-fund --no-audit
COPY client/ ./
RUN npm run build

# Stage 2: production server
FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /app
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev --no-fund --no-audit
COPY server/ ./server/
COPY --from=client-build /app/client/dist ./client/dist

EXPOSE 3001
CMD ["node", "server/index.js"]
