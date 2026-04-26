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

# Set up user permissions for Hugging Face Spaces (runs as UID 1000)
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

# Expose default Hugging Face Space port
EXPOSE 7860

# Command to run FastAPI server
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "7860"]
