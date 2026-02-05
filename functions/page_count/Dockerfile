# ==== Builder Stage ====
FROM python:3.13-slim AS builder
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

RUN apt-get update && apt-get install --no-install-recommends -y \
    build-essential && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /var/tasks

COPY ./pyproject.toml ./uv.lock ./

RUN uv venv --relocatable && uv sync

# ==== Final Image ====
FROM python:3.13-slim AS final

# Install system packages required by Pandoc and LaTeX
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        pandoc \
        texlive-xetex \
        texlive-fonts-recommended \
        texlive-latex-extra \
        ca-certificates \
        curl && \
    rm -rf /var/lib/apt/lists/*

# Install AWS Lambda Runtime Interface Emulator for local testing
RUN curl -Lo /usr/local/bin/aws-lambda-rie https://github.com/aws/aws-lambda-runtime-interface-emulator/releases/latest/download/aws-lambda-rie && \
    chmod +x /usr/local/bin/aws-lambda-rie

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /var/tasks
COPY --from=builder /var/tasks/.venv /var/tasks/.venv
COPY ./main.py ./main.py

ENV PATH="/var/tasks/.venv/bin:${PATH}"

# Use RIE as entrypoint which wraps awslambdaric
ENTRYPOINT [ "/usr/local/bin/aws-lambda-rie", "/var/tasks/.venv/bin/python", "-m", "awslambdaric" ]
CMD [ "main.lambda_handler" ]
