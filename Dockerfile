# Use the official Deno image as the base image
FROM denoland/deno:2.1.4 as build

# Set the working directory
WORKDIR /app

# Copy dependency files first for better caching
COPY deno.json deno.lock ./

# Cache dependencies
RUN deno install

# Copy source code
COPY src/ ./src/

# Cache and compile the application
RUN deno cache ./src/main.js
RUN deno compile -A --output ./build/deno-app ./src/main.js

# Production stage - minimal image
FROM gcr.io/distroless/cc-debian12:nonroot
# Set timezone environment variable
ARG TIMEZONE=America/Curacao
ENV TZ=$TIMEZONE

# Use non-root user (distroless provides this)
USER nonroot

# Expose service port
EXPOSE 8000

# Set working directory
WORKDIR /app

# Copy compiled binary from build stage
COPY --from=build --chown=nonroot:nonroot /app/build/deno-app /app/deno-app

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ["/app/deno-app", "curl", "-f", "http://localhost:8000/health/live"] || exit 1

# Run the application
ENTRYPOINT ["/app/deno-app"]
