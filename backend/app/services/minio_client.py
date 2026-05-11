import time
from minio import Minio
from app.config import settings

minio_client = None

def init_minio():
    global minio_client
    endpoint = settings.MINIO_ENDPOINT
    endpoint_stripped = endpoint.replace("http://", "").replace("https://", "")
    
    max_retries = 10
    for i in range(max_retries):
        try:
            minio_client = Minio(
                endpoint_stripped,
                access_key=settings.MINIO_ACCESS_KEY,
                secret_key=settings.MINIO_SECRET_KEY,
                secure=False
            )
            
            # Ensure buckets exist
            buckets = ["culcloud-files", "culcloud-temp"]
            for bucket in buckets:
                if not minio_client.bucket_exists(bucket):
                    minio_client.make_bucket(bucket)
                    print(f"Bucket {bucket} created.")
            
            print("MinIO initialized successfully.")
            return minio_client
        except Exception as e:
            print(f"Failed to initialize MinIO (attempt {i+1}/{max_retries}): {e}")
            if i < max_retries - 1:
                time.sleep(2)
            else:
                raise e

def get_minio_client() -> Minio:
    return minio_client
