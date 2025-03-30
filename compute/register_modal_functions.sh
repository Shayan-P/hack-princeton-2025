#!/bin/bash

set -e

command="deploy"

# Check if argument is provided
if [ -z "$1" ]; then
    echo "No argument provided, defaulting to 'deploy'"
else
    command=$1
fi

# Validate argument
if [ "$command" != "run" ] && [ "$command" != "serve" ] && [ "$command" != "deploy" ]; then
    echo "Error: Argument must be 'run', 'serve', or 'deploy'"
    exit 1
fi

# Find all directories ending with 'service' and deploy their register_modal_functions.py
for service_dir in *_service; do
    if [ -d "$service_dir" ]; then
        echo "Processing $service_dir..."
        cd "$service_dir"
        poetry install
        if [ -f "register_modal_functions.py" ]; then
            poetry run modal $command register_modal_functions.py
        else
            echo "No register_modal_functions.py found in $service_dir"
        fi
        cd ..
    fi
done
