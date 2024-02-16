FROM node:20.11-alpine3.18

RUN apk add --update dumb-init

ENV TZ=Etc/UTC
WORKDIR /usr/src/ozone

COPY package.json yarn.lock .
RUN yarn
COPY . .
RUN yarn build
RUN chown -R node:node .next

ENTRYPOINT ["dumb-init", "--"]
EXPOSE 3000
USER node
CMD ["yarn", "start"]

LABEL org.opencontainers.image.source=https://github.com/bluesky-social/ozone-ui
LABEL org.opencontainers.image.description="Ozone Moderation Service Web UI"
LABEL org.opencontainers.image.licenses=MIT
