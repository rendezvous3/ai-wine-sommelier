import json
import os
from dotenv import load_dotenv
from langchain_cloudflare.chat_models import ChatCloudflareWorkersAI
from langchain_cloudflare.embeddings import CloudflareWorkersAIEmbeddings
from langchain_cloudflare.vectorstores import CloudflareVectorize
from langchain_core.documents import Document
from tqdm import tqdm
import requests

load_dotenv()

ACCOUNT_ID = os.getenv("CF_ACCOUNT_ID")
API_TOKEN = os.getenv("CF_VECTORIZE_API_TOKEN")

# MAKE A API Request, for now using dummy JSON to embedd and vectorize
# TODO - check other e-commerce repos for how they embedd products
with open("dummy_products.json", "r") as f:
    products = json.load(f)

MODEL_WORKERSAI = "@cf/baai/bge-large-en-v1.5"
embedder = CloudflareWorkersAIEmbeddings(model_name=MODEL_WORKERSAI)
cfVect = CloudflareVectorize(embedding=embedder)

documents = [
    Document(
        page_content=f"{p['name']}. {p['description']}. Effects: {', '.join(p['effects'])}. Flavor: {', '.join(p['flavor'])}",
        metadata={
            # "id": p["id"],
            "name": p["name"],
            "category": p["category"],
            "type": p["type"],
            "brand": p["brand"],
            "effects": ", ".join(p["effects"]),
            "flavor": ", ".join(p["flavor"]),
        },
    )
    for p in products
]

# Use product IDs as unique vector IDs
ids = [p["id"] for p in products]

print("Examples for embeddings")
print("ids", ids)
print("---------------------------------")
print("documents", documents)

vectorize_index_name = "products-demo-1"
# vectorize_index_name = "test-langchain-cloudflare"
# vectorize_index_name = "products-demo-2"

# ONLY RUN ONCE INITIALLY to create the Vector DB Table
# cfVect.create_index(index_name=vectorize_index_name, wait=True)

r = cfVect.add_documents(index_name=vectorize_index_name, documents=documents, ids=ids)

# Delete the specific index
# requests.delete(
#     f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/vectorize/v2/indexes/{vectorize_index_name}",
#     headers={
#         "Authorization": f"Bearer {API_TOKEN}",  # ← THIS IS THE KEY LINE
#         "Content-Type": "application/json",
#     },
# )

# Fetch all indeces, Vector DB table info
response = requests.get(
    f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/vectorize/v2/indexes",
    headers={
        "Authorization": f"Bearer {API_TOKEN}",  # ← THIS IS THE KEY LINE
        "Content-Type": "application/json",
    },
)

# Fetch the specific index, Vector DB table info
# response = requests.get(
#     f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/vectorize/v2/indexes/{vectorize_index_name}/info",
#     headers={
#         "Authorization": f"Bearer {API_TOKEN}",  # ← THIS IS THE KEY LINE
#         "Content-Type": "application/json",
#     },
# )

# curl "https://api.cloudflare.com/client/v4/accounts/a1d51caa9dfb04600e8aefd32367408e/vectorize/v2/indexes" \
# -H "Authorization: Bearer 2L8iOfQM7ugSPVBgz3cP0JgxFTyhYch5-1I46q6g"

if response.status_code != 200:
    raise ValueError(f"Token invalid—status {response.status_code}: {response.text}")

print("response", response.json())
