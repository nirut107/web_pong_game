FROM node:18-alpine


WORKDIR /app

COPY ./srcs/ .

RUN npm install

EXPOSE 9999

CMD [ "node", "pong42Server" ]
