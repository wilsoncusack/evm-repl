# Use the official Rust image as a base image
FROM rust:latest

# Install dependencies
RUN apt-get update && \
    apt-get install -y curl

# Download and install solc (Solidity compiler)
RUN curl -L https://github.com/ethereum/solidity/releases/download/v0.8.26/solc-static-linux -o /usr/local/bin/solc && \
    chmod +x /usr/local/bin/solc

# Set the working directory to the server package
WORKDIR /app/packages/server

# Copy the entire monorepo to preserve workspace references
COPY . /app

# Set environment variable for Rocket
ENV ROCKET_ADDRESS=0.0.0.0

# Build the Rust application from the server directory
RUN cd /app/packages/server && cargo build --release

# Expose the port the app runs on
EXPOSE 8000

# Run the compiled binary
CMD ["/app/packages/server/target/release/server"]