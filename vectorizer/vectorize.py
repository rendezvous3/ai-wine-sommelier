import json
import os
from dotenv import load_dotenv
from langchain_cloudflare.chat_models import ChatCloudflareWorkersAI
from langchain_cloudflare.embeddings import CloudflareWorkersAIEmbeddings
from langchain_cloudflare.vectorstores import CloudflareVectorize
from tqdm import tqdm
import requests

load_dotenv()

ACCOUNT_ID = os.getenv("CF_ACCOUNT_ID")
API_TOKEN = os.getenv("CF_VECTORIZE_API_TOKEN")

# curl "https://api.cloudflare.com/client/v4/accounts/a1d51caa9dfb04600e8aefd32367408e/vectorize/v2/indexes" \
# -H "Authorization: Bearer 2L8iOfQM7ugSPVBgz3cP0JgxFTyhYch5-1I46q6g"

response = requests.get(
    f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/vectorize/v2/indexes",
    headers={
        "Authorization": f"Bearer {API_TOKEN}",  # ← THIS IS THE KEY LINE
        "Content-Type": "application/json",
    },
)

print("response", response.json())

# MAKE A API Request, embedd and vectorize

# embeddings = CloudflareWorkersAIEmbeddings(model_name="@cf/baai/bge-base-en-v1.5")
# embeddings.embed_query("What is the meaning of life?")

# print("embeddings", embeddings.embed_query("What is the meaning of life?"))

# vst = CloudflareVectorize(embedding=embeddings)
# vst.create_index(index_name="my-cool-vectorstore")

# response = requests.get(
#     f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/vectorize/v2/indexes",
#     headers={
#         "Authorization": f"Bearer {API_TOKEN}",  # ← THIS IS THE KEY LINE
#         "Content-Type": "application/json",
#     },
# )

# print("response", response.json())

if response.status_code != 200:
    raise ValueError(f"Token invalid—status {response.status_code}: {response.text}")
