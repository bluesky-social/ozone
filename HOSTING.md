## Self-hosting Ozone

Self-hosting Ozone enables you to participate as a labeler in Bluesky's system for stackable moderation. The Ozone service consists of a web UI, a backend, and a Postgres database.

### Preparation for self-hosting Ozone

## Create a Bluesky labeler service account

> [!IMPORTANT]
> Before setting up your Ozone service you should create a _new_ account on the network, separate from your main account. This is the account that subscribers to your labeler will interact with: accounts for labelers appear different in Bluesky than normal accounts.

You can create a new service account for your labeler at [bsky.app](https://bsky.app/).

## Launch a server

Launch a server on any cloud provider, [OVHcloud](https://us.ovhcloud.com/vps/), [Digital Ocean](https://digitalocean.com/), and [Vultr](https://vultr.com/) are popular choices.

Ensure that you can ssh to your server and have root access.

**Server Requirements**

- Public IPv4 address
- Public DNS name
- Public inbound internet access permitted on port 80/tcp and 443/tcp

**Server Recommendations**
| | |
| ---------------- | ------------ |
| Operating System | Ubuntu 22.04 |
| Memory | 2+ GB RAM |
| CPU | 2+ Cores |
| Storage | 40+ GB SSD |
| Architectures | amd64, arm64 |

> [!TIP]
> It is a good security practice to restrict inbound ssh access (port 22/tcp) to your own computer's public IP address. You can check your current public IP address using [ifconfig.me](https://ifconfig.me/).

### Open your cloud firewall for HTTP and HTTPS

One of the most common sources of misconfiguration is not opening firewall ports correctly. Please be sure to double check this step.

In your cloud provider's console, the following ports should be open to inbound access from the public internet.

- 80/tcp (Used only for TLS certification verification)
- 443/tcp (Used for all application requests)

> [!TIP]
> There is no need to set up TLS or redirect requests from port 80 to 443 because the Caddy web server, included in the Docker compose file, will handle this for you.

### Configure DNS for your domain

From your DNS provider's control panel, set up a domain with records pointing to your server.

| Name                | Type | Value         | TTL |
| ------------------- | ---- | ------------- | --- |
| `ozone.example.com` | `A`  | `12.34.56.78` | 600 |

**Note:**

- Replace `ozone.example.com` with your domain name.
- Replace `12.34.56.78` with your server's IP address.
- Some providers may use the `@` symbol to represent the root of your domain.
- The TTL can be anything but 600 (10 minutes) is reasonable

> [!TIP]
> Since you have your own domain, you may consider using it to setup a [custom handle](https://bsky.social/about/blog/4-28-2023-domain-handle-tutorial) for the new labeler account you created in step 1. This helps users verify who operates your labeler, and makes it more difficult to impersonate your labeler. It also just looks nice!

### Check that DNS is working as expected

Use a service like [DNS Checker](https://dnschecker.org/) to verify that you can resolve your new DNS hostnames.

Check the following:

- `ozone.example.com` (record type `A`)

This should return your server's public IP.

### Installing on Ubuntu 22.04

> [!TIP]
> Ozone will run on other Linux distributions but will require different commands.

#### Open ports on your Linux firewall

If your server is running a Linux firewall managed with `ufw`, you will need to open these ports:

```bash
$ sudo ufw allow 80/tcp
$ sudo ufw allow 443/tcp
```

#### Install Docker

On your server, install Docker CE (Community Edition), using the the following instructions. For other operating systems you may reference the [official Docker install guides](https://docs.docker.com/engine/install/).

**Note:** All of the following commands should be run on your server via ssh.

##### Uninstall old versions

```bash
sudo apt-get remove docker docker-engine docker.io containerd runc
```

##### Set up the repository

```bash
sudo apt-get update
sudo apt-get install \
    ca-certificates \
    curl \
    jq \
    gnupg
```

```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
```

```bash
echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

##### Install Docker Engine

```bash
sudo apt-get update
```

```bash
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

##### Verify Docker Engine installation

```bash
sudo docker run hello-world
```

#### Set up the Ozone directory

```bash
sudo mkdir /ozone
sudo mkdir /ozone/postgres
sudo mkdir --parents /ozone/caddy/data
sudo mkdir --parents /ozone/caddy/etc/caddy
```

#### Create the Caddyfile

Be sure to replace `ozone.example.com` with your own domain.

```bash
cat <<CADDYFILE | sudo tee /ozone/caddy/etc/caddy/Caddyfile
ozone.example.com {
  tls ozone@example.com
  reverse_proxy http://localhost:3000
}
CADDYFILE
```

#### Create the Postgres env configuration file

Configure Postgres with superuser credentials created at startup, and initial database name. Note that these credentials may be used to configure Ozone's `OZONE_DB_POSTGRES_URL` in the following step, or you may opt to setup a separate Postgres app user for running the Ozone service.

```bash
POSTGRES_PASSWORD="$(openssl rand --hex 16)"

cat <<POSTGRES_CONFIG | sudo tee /ozone/postgres.env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=ozone
POSTGRES_CONFIG
```

#### Create the Ozone env configuration file

You should fill in the first 6 values, but leave the rest untouched unless you have good reason to change it.

See the Ozone environment variables section at the end of this README for explanations of each value

Your Ozone instance will need a secp256k1 private key used to sign labels provided as a hex string. You can securely generate this key using `openssl` with the following command:

**Note:**

- Replace `ozone.example.com` with your domain name.

```bash
OZONE_HOSTNAME="ozone.example.com"
OZONE_SERVICE_ACCOUNT_HANDLE="mylabeler.bsky.social"
OZONE_SERVER_DID="$(curl --fail --silent --show-error "https://api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${OZONE_SERVICE_ACCOUNT_HANDLE}" | jq --raw-output .did)"
OZONE_ADMIN_PASSWORD="$(openssl rand --hex 16)"
OZONE_SIGNING_KEY_HEX="$(openssl ecparam --name secp256k1 --genkey --noout --outform DER | tail --bytes=+8 | head --bytes=32 | xxd --plain --cols 32)"
POSTGRES_PASSWORD="..." # Use password from postgres env setup

cat <<OZONE_CONFIG | sudo tee /ozone/ozone.env
OZONE_SERVER_DID=${OZONE_SERVER_DID}
OZONE_PUBLIC_URL=https://${OZONE_HOSTNAME}
OZONE_ADMIN_DIDS=${OZONE_SERVER_DID}
OZONE_ADMIN_PASSWORD=${OZONE_ADMIN_PASSWORD}
OZONE_SIGNING_KEY_HEX=${OZONE_SIGNING_KEY_HEX}
OZONE_DB_POSTGRES_URL=postgresql://postgres:${POSTGRES_PASSWORD}@localhost:5432/ozone
OZONE_DB_MIGRATE=1
OZONE_DID_PLC_URL=https://plc.directory
OZONE_APPVIEW_URL=https://api.bsky.app
OZONE_APPVIEW_DID=did:web:api.bsky.app
LOG_ENABLED=1
OZONE_CONFIG
```

#### Start the Ozone containers

##### Download the Docker compose file

Download the `compose.yaml` to run your Ozone instance, which includes the following containers:

- `ozone` Node Ozone server—both UI and backend—running on http://localhost:3000
- `postgres` Postgres database used by the Ozone backend
- `caddy` HTTP reverse proxy handling TLS and proxying requests to Ozone
- `watchtower` Daemon responsible for auto-updating containers to keep the server secure and current

```bash
curl https://raw.githubusercontent.com/bluesky-social/ozone/main/service/compose.yaml | sudo tee /ozone/compose.yaml
```

##### Create the systemd service

```bash
cat <<SYSTEMD_UNIT_FILE | sudo tee /etc/systemd/system/ozone.service
[Unit]
Description=Bluesky Ozone Service
Documentation=https://github.com/bluesky-social/ozone
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/ozone
ExecStart=/usr/bin/docker compose --file /ozone/compose.yaml up --detach
ExecStop=/usr/bin/docker compose --file /ozone/compose.yaml down

[Install]
WantedBy=default.target
SYSTEMD_UNIT_FILE
```

##### Start the service

**Reload the systemd daemon to create the new service:**

```bash
sudo systemctl daemon-reload
```

**Enable the systemd service:**

```bash
sudo systemctl enable ozone
```

**Start the ozone systemd service:**

```bash
sudo systemctl start ozone
```

**Ensure that containers are running**

There should be a caddy, ozone, postgres, and watchtower container running.

```bash
sudo systemctl status ozone
```

```bash
sudo docker ps
```

### Verify that Ozone is online

You can check if your server is online and healthy by requesting the healthcheck endpoint, and by visiting the UI in browser at https://ozone.example.com/.

```bash
curl https://ozone.example.com/xrpc/_health
{"version":"0.2.2-beta.2"}
```

### Announcing Ozone to the network

Once you've successfully started running your service, there is a final step to make the rest of the network aware of it, so that users can find your labeler in the Bluesky app and so that Bluesky can consume the labels that you publish. This step can be completed from within the Ozone UI.

1.  Navigate to your Ozone UI at https://ozone.example.com.
2.  Login to Ozone using the service account that you created in the first step of this guide.
3.  The Ozone UI will lead you through the following steps to announce your service to the network.
    - The first step associates https://ozone.example.com with your service account's identity on the network. In technical terms this involves adding a service and a verification method to your account's DID document. This step is required to use your Ozone service.
    - The second step publishes a record in your service account's repository. This allows the Bluesky application to understand that your service account represents a labeler. This step is optional: each time you login as your service account, you'll be prompted to complete it.

### Manually updating Ozone

If you use use Docker `compose.yaml` file in this repo, Ozone will automatically update at midnight UTC when new releases are available. To manually update to the latest version use the following commands.

**Pull the latest Ozone container image:**

```bash
sudo docker pull ghcr.io/bluesky-social/ozone:latest
```

**Restart Ozone with the new container image:**

```bash
sudo systemctl restart ozone
```

## Ozone environment variables

You will need to customize various settings configured through the Ozone environment variables. See the below table to find the variables you'll need to set.

| Environment Variable    | Value                         | Should modify? | Notes                                                                      |
| ----------------------- | ----------------------------- | -------------- | -------------------------------------------------------------------------- |
| `OZONE_SERVER_DID`      | `did:plc:39dak...`            | ✅             | The DID of your Ozone service account, distinct from your personal account |
| `OZONE_PUBLIC_URL`      | `https://ozone.example.com`   | ✅             | Pubicly accessible URL to your Ozone service                               |
| `OZONE_ADMIN_DIDS`      | `did:plc:39...,did:plc:f7...` | ✅             | Comma-separated list of DIDs granted access to login to your Ozone service |
| `OZONE_ADMIN_PASSWORD`  | `3ee68...`                    | ✅             | Admin password which can be used as an API key to take certain actions     |
| `OZONE_SIGNING_KEY_HEX` | `e049f...`                    | ✅             | Hex representation of a private key, primarily used to sign labels         |
| `OZONE_DB_POSTGRES_URL` | `postgresql://pg:password...` | ✅             | The postgresql:// URL containing credentials for Ozone's database          |
| `OZONE_DB_MIGRATE`      | `1`                           | ❌             | Perform DB migrations at startup if necessary                              |
| `OZONE_DID_PLC_URL`     | `https://plc.directory`       | ❌             | Determines which URL to use for PLC identity lookups                       |
| `OZONE_APPVIEW_URL`     | `https://api.bsky.app`        | ❌             | Used to communicate with the appview and receive content from Bluesky      |
| `OZONE_APPVIEW_DID`     | `did:web:api.bsky.app`        | ❌             | Used to communicate with the appview and receive content from Bluesky      |
| `LOG_ENABLED`           | `1`                           | ❌             | Set to 0 if you would not like JSON log output from the Ozone              |

There are additional environment variables that can be tweaked depending on how you're running your service, particularly if another service on the network allows delegates some control to your Ozone instance, e.g. to prompt them to purge certain content.

Feel free to explore those [here](https://github.com/bluesky-social/atproto/blob/main/packages/ozone/src/config/env.ts). However, we will not be providing support for more advanced configurations at this time.
