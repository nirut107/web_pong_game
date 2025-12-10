# Stage 1: Build the app
FROM node:20-alpine AS builder

ENV NODE_ENV=production
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV DISABLE_OPENCOLLECTIVE=true

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml* ./


RUN pnpm install 
RUN pnpm add -D terser vite
    

COPY tsconfig.json vite.config.ts ./
COPY index.html ./
COPY public ./public
COPY src ./src
COPY ./nginx/certs ./nginx/certs

RUN npx @tailwindcss/cli -i ./public/index.css -o ./public/output.css --watch
RUN pnpm build --debug

# Stage 2: Serve with Nginx (smaller base image)
FROM nginx:alpine-slim

COPY --from=builder /app/dist /usr/share/nginx/html
COPY public /usr/share/nginx/html/public
COPY ./nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY ./nginx/certs /certs


RUN chmod -R 755 /usr/share/nginx/html && \
    chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/log/nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown nginx:nginx /var/run/nginx.pid

EXPOSE 7777

USER nginx

CMD ["nginx", "-g", "daemon off;"]


# From project root
# docker build -t my-vite-app .
# docker run -p 8080:80 my-vite-app
# docker stop $(docker ps -aq) && docker rm $(docker ps -aq) && docker rmi $(docker images -q)



# docker compose up --build to_be_decomposed
# docker stop $(docker ps -q) && docker rm $(docker ps -aq) && docker rmi -f $(docker images -q)
