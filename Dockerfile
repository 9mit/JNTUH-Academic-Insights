# ==========================================
# Stage 1: Build the React + Vite Frontend
# ==========================================
FROM node:18-alpine AS frontend-builder
WORKDIR /app

# Copy package configurations
COPY package*.json ./

# Install Node dependencies
RUN npm install

# Copy all files and build the static frontend
COPY . .
RUN npm run build

# ==========================================
# Stage 2: Serve with Python + FastAPI
# ==========================================
FROM python:3.11-slim

# Install basic system tools
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set up non-root user for security
RUN useradd -m -u 1000 user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH
WORKDIR $HOME/app

# Copy requirements & install dependencies
COPY --chown=user requirements.txt $HOME/app/requirements.txt
RUN pip install --no-cache-dir --upgrade -r $HOME/app/requirements.txt

# Copy all source files
COPY --chown=user . $HOME/app/

# Copy the built React 'dist' directory from Stage 1
COPY --chown=user --from=frontend-builder /app/dist $HOME/app/dist

# Switch to the non-root user
USER user

# Default port, allow override via $PORT
ENV PORT=8000
EXPOSE $PORT

# Command to run FastAPI server using the injected PORT
CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT}"]
