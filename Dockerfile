FROM node:20.11-alpine3.18 as build

WORKDIR /usr/src/ozone

COPY package.json yarn.lock .
RUN yarn
COPY . .
RUN yarn build
RUN rm -rf node_modules .next/cache
RUN cd service && yarn

# final stage

FROM node:20.11-alpine3.18

RUN apk add --update dumb-init
ENV TZ=Etc/UTC

WORKDIR /usr/src/ozone
COPY --from=build /usr/src/ozone /usr/src/ozone
RUN chown -R node:node .

ENTRYPOINT ["dumb-init", "--"]
EXPOSE 3000
ENV OZONE_PORT=3000
ENV NODE_ENV=production
USER node
CMD ["node", "./service"]

LABEL org.opencontainers.image.source=https://github.com/bluesky-social/ozone-ui
LABEL org.opencontainers.image.description="Ozone Moderation Service Web UI"
LABEL org.opencontainers.image.licenses=MIT
