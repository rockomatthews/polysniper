FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY apps/trader/package.json apps/trader/package.json
COPY packages/core/package.json packages/core/package.json

RUN npm install

COPY apps/trader apps/trader
COPY packages/core packages/core
COPY tsconfig.base.json tsconfig.base.json

RUN npm run build --workspace=packages/core
RUN npm run build --workspace=apps/trader

CMD ["node", "apps/trader/dist/index.js"]
