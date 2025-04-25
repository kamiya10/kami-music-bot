FROM node:20-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /usr/src/bot

COPY package*.json ./

RUN npm ci

COPY . .

ENV NODE_ENV=production

RUN npm run build

CMD ["node", "./dist/index.js"]