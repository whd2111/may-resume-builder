# ==== Builder Stage ====
FROM python:3.12-slim AS builder
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

RUN apt-get update && apt-get install --no-install-recommends -y \
    build-essential && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /var/tasks

COPY ./pyproject.toml ./uv.lock ./

RUN uv venv --relocatable && uv sync

# ==== Final Image ====
FROM python:3.12-slim AS final

ARG LOCAL_DEV=false

# Install system packages required by LibreOffice
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        libreoffice-writer \
        libreoffice-java-common \
        default-jre-headless \
        fonts-liberation \
        fonts-dejavu \
        ca-certificates \
        curl && \
    rm -rf /var/lib/apt/lists/*

# Install AWS Lambda Runtime Interface Emulator for local testing only
RUN if [ "$LOCAL_DEV" = "true" ]; then \
        curl -Lo /usr/local/bin/aws-lambda-rie \
        https://github.com/aws/aws-lambda-runtime-interface-emulator/releases/latest/download/aws-lambda-rie && \
        chmod +x /usr/local/bin/aws-lambda-rie; \
    fi

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN useradd --create-home --user-group appuser

WORKDIR /var/tasks
COPY --from=builder /var/tasks/.venv /var/tasks/.venv
COPY ./main.py ./main.py
COPY ./entrypoint.sh ./entrypoint.sh

RUN chmod +x ./entrypoint.sh && \
    chown -R appuser:appuser /var/tasks
USER appuser

ENV PATH="/var/tasks/.venv/bin:${PATH}"
ENV LOCAL_DEV=${LOCAL_DEV}

ENTRYPOINT [ "./entrypoint.sh" ]
CMD [ "main.handler" ]
