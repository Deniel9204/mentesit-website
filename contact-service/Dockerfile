# syntax=docker/dockerfile:1

# ---- Build (cross-compiles via Go; runs on the native build platform) -------
FROM --platform=$BUILDPLATFORM golang:1.26-alpine AS build
ARG TARGETOS
ARG TARGETARCH
WORKDIR /src
COPY go.mod ./
COPY *.go ./
RUN CGO_ENABLED=0 GOOS=${TARGETOS:-linux} GOARCH=${TARGETARCH:-amd64} \
    go build -trimpath -ldflags="-s -w" -o /contact .

# ---- Minimal runtime --------------------------------------------------------
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /contact /contact
EXPOSE 8081
# Bind all interfaces inside the container so the web container can reach it.
ENV CONTACT_ADDR=0.0.0.0:8081
ENTRYPOINT ["/contact"]
