FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN chmod +x start.sh

EXPOSE 3000

ENTRYPOINT ["./start.sh"]
