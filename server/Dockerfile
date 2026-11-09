FROM node:20-alpine

WORKDIR /app
COPY package.json ./
COPY server.mjs ./
COPY public ./public

# data lives here — mount a volume on this path
RUN mkdir -p /app/data
ENV DATA_DIR=/app/data
ENV PORT=8080

EXPOSE 8080
CMD ["node", "server.mjs"]
