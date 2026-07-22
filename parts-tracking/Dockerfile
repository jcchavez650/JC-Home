# Optional container image — lets you run the app the same way anywhere,
# and enables the Railway flow described in trip-planner/README.md.
FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

COPY . .

# Store the SQLite file on a mounted volume so data survives restarts.
ENV PARTS_DB=/data/parts.db
ENV PORT=8080
EXPOSE 8080

# init_db() runs on import, so the schema is applied on first boot.
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT} app:app"]
