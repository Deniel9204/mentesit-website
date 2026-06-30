# syntax=docker/dockerfile:1

# ---- Stage 1: build the static site with Hugo Extended + Dart Sass ----------
# Pinned to the build host's arch (BUILDPLATFORM) so the (arch-independent)
# static output is produced once even for multi-arch image builds.
FROM --platform=$BUILDPLATFORM debian:bookworm-slim AS builder

ARG HUGO_VERSION=0.163.3
ARG DART_SASS_VERSION=1.101.0
ARG BUILDARCH

RUN apt-get update \
 && apt-get install -y --no-install-recommends curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

RUN set -eux; \
    case "${BUILDARCH}" in \
      amd64) HUGO_ARCH=linux-amd64;  SASS_ARCH=linux-x64   ;; \
      arm64) HUGO_ARCH=linux-arm64;  SASS_ARCH=linux-arm64 ;; \
      *) echo "unsupported build arch: ${BUILDARCH}" >&2; exit 1 ;; \
    esac; \
    curl -fsSL -o /tmp/hugo.tgz "https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_extended_${HUGO_VERSION}_${HUGO_ARCH}.tar.gz"; \
    tar -xzf /tmp/hugo.tgz -C /usr/local/bin hugo; \
    curl -fsSL -o /tmp/sass.tgz "https://github.com/sass/dart-sass/releases/download/${DART_SASS_VERSION}/dart-sass-${DART_SASS_VERSION}-${SASS_ARCH}.tar.gz"; \
    tar -xzf /tmp/sass.tgz -C /opt; \
    ln -s /opt/dart-sass/sass /usr/local/bin/sass; \
    rm -f /tmp/hugo.tgz /tmp/sass.tgz; \
    hugo version

WORKDIR /src
COPY . .
RUN hugo --gc --minify --cleanDestinationDir --environment production

# ---- Stage 2: serve with nginx ---------------------------------------------
FROM nginx:1.27-alpine
COPY deploy/nginx.docker.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /src/public /usr/share/nginx/html
EXPOSE 80
# nginx:alpine already defines a sensible CMD + a wget-based healthcheck target.
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
