FROM debian:bullseye-slim

ENV TZ=Etc/UTC
ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_VERSION=20
ENV NVM_DIR=/usr/share/nvm

WORKDIR /usr/src/ozone

COPY . .

RUN apt-get update && apt-get install --yes \
  dumb-init \
  ca-certificates \
  wget

RUN mkdir --parents $NVM_DIR && \
  wget \
    --output-document=/tmp/nvm-install.sh \
    https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh && \
  bash /tmp/nvm-install.sh

RUN \. "$NVM_DIR/nvm.sh" && \
  nvm install $NODE_VERSION && \
  nvm use $NODE_VERSION && \
  npm install --global yarn && \
  yarn && \
  yarn build


ENTRYPOINT ["dumb-init", "--"]

CMD ["bash", "-c", "source /usr/share/nvm/nvm.sh && yarn start"]
