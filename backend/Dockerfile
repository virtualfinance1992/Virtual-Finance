# --- Stage 1: Base Image & Dependencies ---
FROM python:3.11-slim AS base

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=off \
    PIP_DISABLE_PIP_VERSION_CHECK=on \
    PIP_DEFAULT_TIMEOUT=100

WORKDIR /app

# Copy requirement files and install dependencies
COPY requirements.txt .
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libpq-dev \
    && pip install --upgrade pip \
    && pip install -r requirements.txt \
    && apt-get purge -y --auto-remove build-essential

# --- Stage 2: Application Code ---
FROM base AS final

# Copy the rest of the code
WORKDIR /app
COPY . .

# Collect static files
RUN python manage.py collectstatic --no-input

# Expose port 8000 for Gunicorn
EXPOSE 8000

# Command to run the app with Gunicorn
CMD ["gunicorn", "virtual_finance.wsgi:application", "--bind", "0.0.0.0:8000"]
