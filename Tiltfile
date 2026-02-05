# Tilt configuration for local development
# This file sets up the API, Supabase services, and frontend for local development

# === SUPABASE SERVICES ===
# Run Supabase stack via docker-compose plugin
docker_compose('supabase/docker-compose.yml')

# === API SERVICE ===
# Run API in Docker container
docker_compose('api/docker-compose.yml')

# === FUNCTIONS ===
# Run the page_count function in Docker container
docker_compose('functions/docker-compose.yml')

# === FRONTEND SERVICE ===
# Run the Vite dev server as a local resource for fast iteration
local_resource(
    "frontend",
    serve_dir="./frontend",
    serve_cmd="npm run dev",
    labels=["frontend"],
    deps=["npm install"],
)
local_resource(
    "npm install",
    dir="./frontend",
    cmd="npm install",
    auto_init=True,
    labels=["frontend", "tasks"],
)