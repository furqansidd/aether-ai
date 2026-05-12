"""
Check Supabase service role key and fix RLS.
Try using the Supabase Management API to add DELETE policy.
"""
import requests
import json

SUPABASE_URL = "https://nrwtimgvbkvlcllbbhka.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yd3RpbWd2Ymt2bGNsbGJiaGthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1OTEyMDMsImV4cCI6MjA5NDE2NzIwM30.8vSC8HAsWCWJr-6wG4EUZI6M1a9ojG4mHf_rTrNbaus"

# Check what policies exist by querying the pg_policies view
headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

# Try to query storage policies via PostgREST
r = requests.get(
    f"{SUPABASE_URL}/rest/v1/rpc",
    headers=headers
)
print(f"RPC endpoint status: {r.status_code}")

# Try direct storage API delete (matching Supabase's internal API format)
target_file = "1778611616145_products-1000.csv"
r2 = requests.delete(
    f"{SUPABASE_URL}/storage/v1/object/datasets/{target_file}",
    headers=headers
)
print(f"Direct object DELETE status: {r2.status_code}")
print(f"Direct object DELETE body: {r2.text[:500]}")

# Also try the batch delete endpoint
r3 = requests.delete(
    f"{SUPABASE_URL}/storage/v1/object/datasets",
    headers=headers,
    json={"prefixes": [target_file]}
)
print(f"Batch DELETE status: {r3.status_code}")
print(f"Batch DELETE body: {r3.text[:500]}")
