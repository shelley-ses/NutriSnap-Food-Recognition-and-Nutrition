import os
import sys
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()

from app.database import engine
from sqlalchemy import text

print("Connecting to database to drop meals table...")
try:
    with engine.begin() as conn:
        conn.execute(text("DROP TABLE IF EXISTS meals CASCADE"))
    print("Table 'meals' dropped successfully!")
except Exception as e:
    print("Error dropping table:", e)
    sys.exit(1)
