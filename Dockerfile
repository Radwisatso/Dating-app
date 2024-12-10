FROM oven/bun:debian

WORKDIR /app

COPY package.json .

RUN bun install

COPY . .

RUN bunx prisma generate

CMD [ "bun", "start" ]