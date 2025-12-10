FROM node:20-alpine

# Install necessary build tools for native modules
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./

# Clean install dependencies
RUN npm ci || npm install

COPY . .

EXPOSE 8000

CMD ["npm", "start"]
