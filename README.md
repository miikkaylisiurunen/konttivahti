# Konttivahti

Konttivahti is a self-hosted Docker image monitoring service. It automatically discovers running containers from your Docker host, checks whether newer versions are available, presents the results in a dashboard, and can notify you when updates are available.

![](assets/ui.png)

## Features

- Auto-detects running containers from the Docker socket.
- Notification integration via [Shoutrrr](https://github.com/containrrr/shoutrrr).
- Supports ignoring containers via a configurable container label.
- Runs as a single Dockerized service.

## Usage

### 1. Create `docker-compose.yml`

```yaml
services:
  konttivahti:
    image: ghcr.io/miikkaylisiurunen/konttivahti
    container_name: konttivahti
    restart: unless-stopped
    ports:
      - '3000:3000'
    volumes:
      - ./data:/data
      - /var/run/docker.sock:/var/run/docker.sock:ro
```

If you prefer not to mount the Docker socket directly, you can use a Docker socket proxy. Here's an example that uses the [tecnativa/docker-socket-proxy](https://github.com/tecnativa/docker-socket-proxy) image to expose only the minimal permissions needed for Konttivahti:

```yaml
services:
  konttivahti:
    image: ghcr.io/miikkaylisiurunen/konttivahti
    container_name: konttivahti
    restart: unless-stopped
    ports:
      - '3000:3000'
    volumes:
      - ./data:/data
    environment:
      DOCKER_HOST: tcp://docker-socket-proxy:2375
    depends_on:
      - docker-socket-proxy

  docker-socket-proxy:
    image: tecnativa/docker-socket-proxy
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    environment:
      CONTAINERS: 1
      IMAGES: 1
```

### 2. Start the service

```bash
docker compose up -d
```

### 3. Complete first-time setup

Open `http://localhost:3000` and create the admin account.

## Scanning for updates

Konttivahti will automatically scan for updates on a schedule defined by the `SCAN_SCHEDULE` environment variable (default: every 6 hours). This schedule should not be too frequent to avoid hitting registry rate limits. The app will auto-discover new running containers immediately, but updates are only checked during scheduled scans.

## Configuration

### Scan schedule

Environment variable: `SCAN_SCHEDULE`  
Default: `0 */6 * * *`

Controls how often Konttivahti scans tracked containers for available image updates. The value must be a standard cron expression. The default runs every six hours, which is a sensible balance for most environments. Running scans too frequently can increase load on image registries and may hit rate limits, especially when monitoring many containers.

### Docker host

Environment variable: `DOCKER_HOST`  
Default: unset

Sets the Docker API endpoint. Leave it unset to use the default mounted Docker socket at `/var/run/docker.sock`, or set it to a TCP endpoint such as `tcp://docker-socket-proxy:2375` when using a Docker socket proxy.

### Ignoring containers

Environment variable: `IGNORE_CONTAINER_LABEL`  
Default: `konttivahti.ignore`

Defines the label key Konttivahti checks to determine whether a container should be excluded from discovery results and update scanning. This is useful for infrastructure or helper containers you do not want tracked. Any truthy value on this label will mark the container as ignored.

To ignore specific containers from scans and status display, add the label defined by `IGNORE_CONTAINER_LABEL` to the container with a truthy value. For example:

```yaml
services:
  nginx:
    image: nginx
    labels:
      konttivahti.ignore: 'true'
```

### Session lifetime

Environment variable: `SESSION_TIMEOUT_MS`  
Default: `604800000`

Sets how long an authenticated user session remains valid, in milliseconds. The default is 7 days. Expiry is sliding rather than fixed, so active use extends the session lifetime.
