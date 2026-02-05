#!/bin/sh

if [ "$LOCAL_DEV" = "true" ]; then
    # Use RIE for local testing
    exec /usr/local/bin/aws-lambda-rie /var/tasks/.venv/bin/python -m awslambdaric "$@"
else
    # Production: run awslambdaric directly (Lambda provides the runtime API)
    exec /var/tasks/.venv/bin/python -m awslambdaric "$@"
fi
