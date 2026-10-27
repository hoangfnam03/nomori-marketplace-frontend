# Nomori Marketplace storefront: Angular with server-side rendering (Node + Express). Build context: the root of this repository.
# It is built together with the API by deploy/docker-compose.yml of the backend repository (see docs/deployment-guide.md there).
#
# Settings at run time (environment variables):
#   PORT         port to listen on                                  (default 4000)
#   API_ORIGIN   where the API is, e.g. http://api:8080             (default http://localhost:5214)
#   PUBLIC_URL   the address visitors use, e.g. https://demo.example.com (canonical links, social tags)

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx ng build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=4000
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 4000
USER node
CMD ["node", "dist/nomori-marketplace-frontend/server/server.mjs"]
