import json
import os
from dotenv import load_dotenv
from langchain_openai import OpenAIEmbeddings
from langchain_cloudflare import CloudflareVectorize
from langchain.schema import Document
from tqdm import tqdm
import requests

load_dotenv()

ACCOUNT_ID = os.getenv("CLOUDFLARE_ACCOUNT_ID")
API_TOKEN = os.getenv("CLOUDFLARE_VECTORIZE_API_TOKEN")  # ← THIS ONE!

# curl "https://api.cloudflare.com/client/v4/accounts/a1d51caa9dfb04600e8aefd32367408e/vectorize/v2/indexes" \
# -H "Authorization: Bearer 2L8iOfQM7ugSPVBgz3cP0JgxFTyhYch5-1I46q6g"

response = requests.get(
    f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/vectorize/v2/indexes",
    headers={
        "Authorization": f"Bearer {API_TOKEN}",  # ← THIS IS THE KEY LINE
        "Content-Type": "application/json",
    },
)

if response.status_code != 200:
    raise ValueError(f"Token invalid—status {response.status_code}: {response.text}")

print("response", response.json())
