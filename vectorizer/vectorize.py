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

embeddings = CloudflareWorkersAIEmbeddings(model_name="@cf/baai/bge-base-en-v1.5")
vst = CloudflareVectorize(embedding=embeddings)
# ONLY RUN ONCE
# vst.create_index(index_name="products-demo-store")

# MAKE A API Request, embedd and vectorize
# TODO - check other e-commerce repos for how they embedd products
with open("dummy_products.json", "r") as f:
    products = json.load(f)

texts = []
metadatas = []

# for p in products:
#     # Combine semantic fields for embedding
#     semantic_text = f"{p['name']}. {p['description']}. Effects: {', '.join(p['effects'])}. Flavor: {', '.join(p['flavor'])}"
#     texts.append(semantic_text)

#     # Keep only relevant metadata (short summary, numeric & categorical)
#     metadatas.append(
#         {
#             "id": p["id"],
#             "category": p["category"],
#             "type": p["type"],
#             "brand": p["brand"],
#             "price": p["price"],
#             "thc": p["thc"],
#             "cbd": p["cbd"],
#         }
#     )

print("texts", texts)
print("metadatas", metadatas)

# vst.add_texts(
#     texts=texts,
#     metadatas=metadatas,
#     index_name="products-demo-store",
# )

# print(dir(CloudflareVectorize))
# help(CloudflareVectorize)

# Prepare documents
# documents = [
#     Document(
#         page_content="Green Dream Sativa. Energizing effects.",
#         metadata={"category": "flower", "price": 45.0},
#     ),
#     Document(
#         page_content="Relaxing Indica. Great for sleep.",
#         metadata={"category": "flower", "price": 40.0},
#     ),
# ]
# ids = ["prod-001", "prod-002"]

# Add to vector DB
# vst.add_documents(index_name="products-demo-store", documents=documents, ids=ids)

# vst.add_documents(
#     [{"page_content": t, "metadata": m} for t, m in zip(texts, metadatas)],
#     {"ids": [p["id"] for p in products]},
# )

MODEL_WORKERSAI = "@cf/baai/bge-large-en-v1.5"
embedder = CloudflareWorkersAIEmbeddings(model_name=MODEL_WORKERSAI)
cfVect = CloudflareVectorize(embedding=embedder)

document_1 = Document(page_content="foo", metadata={"baz": "bar"})
document_2 = Document(page_content="bar", metadata={"foo": "baz"})
document_3 = Document(page_content="to be deleted")

documents1 = [document_1, document_2, document_3]
ids1 = ["1", "2", "3"]
# vectorize_index_name = f"test-langchain-cloudflare"

documents = [
    Document(
        page_content=f"{p['description']}",
        # page_content=f"{p['name']}. {p['description']}. Effects: {', '.join(p['effects'])}. Flavor: {', '.join(p['flavor'])}",
        metadata={
            "category": p["category"],
            # "type": p["type"],
            # "brand": p["brand"],
            # "price": p["price"],
            # "thc": p["thc"],
            # "cbd": p["cbd"],
        },
    )
    for p in products
]

# Use product IDs as unique vector IDs
ids = [p["id"] for p in products]

print("ids", ids)
print("ids 1", ids)
print("---------------------------------")
print("documents", documents)
print("documents 1", documents1)


vectorize_index_name = "products-demo-store"

# cfVect.create_index(index_name=vectorize_index_name, wait=True)

r = cfVect.add_documents(index_name=vectorize_index_name, documents=documents, ids=ids)


# print("embeddings", embeddings.embed_query("What is the meaning of life?"))

# requests.delete(
#     f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/vectorize/v2/indexes/my-cool-vectorstore2",
#     headers={
#         "Authorization": f"Bearer {API_TOKEN}",  # ← THIS IS THE KEY LINE
#         "Content-Type": "application/json",
#     },
# )

# response = requests.get(
#     f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/vectorize/v2/indexes",
#     headers={
#         "Authorization": f"Bearer {API_TOKEN}",  # ← THIS IS THE KEY LINE
#         "Content-Type": "application/json",
#     },
# )

response = requests.get(
    f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/vectorize/v2/indexes/{vectorize_index_name}/info",
    headers={
        "Authorization": f"Bearer {API_TOKEN}",  # ← THIS IS THE KEY LINE
        "Content-Type": "application/json",
    },
)

# curl "https://api.cloudflare.com/client/v4/accounts/a1d51caa9dfb04600e8aefd32367408e/vectorize/v2/indexes" \
# -H "Authorization: Bearer 2L8iOfQM7ugSPVBgz3cP0JgxFTyhYch5-1I46q6g"

if response.status_code != 200:
    raise ValueError(f"Token invalid—status {response.status_code}: {response.text}")

print("response", response.json())
