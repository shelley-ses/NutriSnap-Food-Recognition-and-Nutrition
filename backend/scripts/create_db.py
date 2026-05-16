from dotenv import load_dotenv
import os
from urllib.parse import urlparse
import psycopg2
from psycopg2 import sql

load_dotenv()
url = os.getenv("DATABASE_URL")
if not url:
    print("DATABASE_URL not set in .env")
    raise SystemExit(1)

p = urlparse(url)
dbname = p.path.lstrip('/')
user = p.username
password = p.password
host = p.hostname or '127.0.0.1'
port = p.port or 5432

print(f"Connecting to Postgres...")
try:
    conn = psycopg2.connect(dbname='postgres', user=user, password=password, host=host, port=port)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (dbname,))
    if cur.fetchone():
        print("Database already exists:", dbname)
    else:
        cur.execute(sql.SQL("CREATE DATABASE {}") .format(sql.Identifier(dbname)))
        print("Created database", dbname)
    cur.close()
    conn.close()
except Exception as e:
    print("Error creating database:", e)
    raise
