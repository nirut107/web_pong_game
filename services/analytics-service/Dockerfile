FROM node:18-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

CMD ["node", "src/index.js"]
