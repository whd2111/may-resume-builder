FROM python:3.11-slim

WORKDIR /app

# Install uv
RUN pip install uv

# Copy project files
COPY pyproject.toml .

# Sync dependencies with uv
RUN uv sync

# Copy application code
COPY app/ ./app/

EXPOSE 8080

# Run with uv in dev mode with debug logging and reload
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080", "--reload", "--log-level", "debug"]
