# Builder
FROM node:22-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .    

RUN npm run build

USER node


# Runner    
FROM node:22-slim AS runner

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist



# Container configuration 
USER node

EXPOSE 3000



CMD ["node", "dist/src/index.js"]


