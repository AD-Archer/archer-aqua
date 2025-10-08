# Build frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /frontend

# Copy package files
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Build backend
FROM golang:1.23-alpine AS backend-builder

WORKDIR /backend

# Copy go mod files
COPY backend/go.mod backend/go.sum ./
RUN go mod download

# Copy backend source code
COPY backend/ .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/server

# Final stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /root/

# Copy the backend binary
COPY --from=backend-builder /backend/main .

# Copy frontend build output
COPY --from=frontend-builder /frontend/dist ./static

# Expose port
EXPOSE 8080

# Command to run
CMD ["./main"]