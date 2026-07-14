#!/bin/sh
# Runs once, only on first container start (empty data volume).
# Creates a separate database per microservice, matching microservices
# best-practice (each service owns its own database).
set -e

for DB in users_db catalog_db payment_db booking_db; do
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    SELECT 'CREATE DATABASE $DB'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB')\gexec
EOSQL
done
