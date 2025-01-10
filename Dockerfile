# Use the official Deno image as the base image
FROM denoland/deno:2.1.4 as build

# Set the working directory
WORKDIR /app

# Copy the required files into the container
# You may want to change this depending on your project structure
COPY . .

# Specify the start command
# Change "your_start_file.ts" to the entry file of your application
RUN deno cache ./src/main.js
RUN deno run build
# CMD ["deno",  "run", "dev"]


FROM debian:bullseye-slim
ARG TIMEZONE=America/Curacao
ENV TZ $TIMEZONE

RUN apt-get update && apt-get install -y tzdata && \
    ln -fs /usr/share/zoneinfo/$TZ /etc/localtime && \
    dpkg-reconfigure -f noninteractive tzdata && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

EXPOSE 8000
WORKDIR /app
COPY --from=build /app/build/deno-app /app
CMD ["/app/deno-app"]
