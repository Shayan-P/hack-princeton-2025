#!/bin/bash
poetry run uvicorn main:app --host 0.0.0.0 --port 4000 --reload
