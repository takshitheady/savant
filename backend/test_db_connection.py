"""
Test database connection to diagnose the issue
"""
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("SUPABASE_DB_URL")
print(f"Testing connection to: {db_url[:50]}...")

try:
    # Parse the connection string
    conn = psycopg2.connect(db_url)
    print("✅ Connection successful!")

    # Test a simple query
    cursor = conn.cursor()
    cursor.execute("SELECT version();")
    version = cursor.fetchone()
    print(f"✅ PostgreSQL version: {version[0][:50]}...")

    # Test creating a simple table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS test_table (
            id SERIAL PRIMARY KEY,
            test_data TEXT
        );
    """)
    print("✅ Can create tables")

    # Clean up
    cursor.execute("DROP TABLE IF EXISTS test_table;")
    conn.commit()
    print("✅ All tests passed!")

    cursor.close()
    conn.close()

except Exception as e:
    print(f"❌ Connection failed: {type(e).__name__}")
    print(f"Error: {str(e)}")
