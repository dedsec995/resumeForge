# Use Python 3.11 slim image as base
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies including LaTeX (only essential packages)
RUN apt-get update && apt-get install -y \
    texlive-latex-base \
    texlive-fonts-recommended \
    texlive-fonts-extra \
    texlive-latex-extra \
    texlive-lang-english \
    texlive-xetex \
    texlive-publishers \
    texlive-science \
    texlive-pictures \
    texlive-plain-generic \
    texlive-bibtex-extra \
    texlive-binaries \
    texlive-extra-utils \
    texlive-font-utils \
    texlive-formats-extra \
    texlive-humanities \
    texlive-luatex \
    texlive-metapost \
    texlive-music \
    texlive-pstricks \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create output directory
RUN mkdir -p output

# Create non-root user for security
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8002

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8002/ || exit 1

# Run the application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8002"] 