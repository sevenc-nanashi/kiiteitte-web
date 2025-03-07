FROM oven/bun:1

RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production

COPY package.json /app/package.json
COPY tsconfig.json /app/tsconfig.json

RUN bun install

COPY static /app/static
COPY dist /app/dist
COPY src /app/src

CMD ["bun", "start"]

