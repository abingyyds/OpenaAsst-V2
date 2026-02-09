FROM node:20-alpine AS build

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/types/package.json packages/types/
COPY packages/api/package.json packages/api/
COPY packages/frontend/package.json packages/frontend/

RUN pnpm install --frozen-lockfile

COPY packages/types/ packages/types/
COPY packages/api/ packages/api/
COPY packages/frontend/ packages/frontend/

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_URL

RUN pnpm build:types
RUN pnpm build:frontend
RUN pnpm build:api

FROM node:20-alpine AS runtime

WORKDIR /app

COPY --from=build /app/packages/api/dist/ packages/api/dist/
COPY --from=build /app/packages/api/package.json packages/api/
COPY --from=build /app/packages/frontend/dist/ packages/frontend/dist/
COPY --from=build /app/node_modules/ node_modules/
COPY --from=build /app/packages/api/node_modules/ packages/api/node_modules/

ENV NODE_ENV=production

EXPOSE 2620

CMD ["node", "packages/api/dist/index.js"]
