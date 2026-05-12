import time
import logging
from minio import Minio
from app.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

minio_client = None

def init_minio():
    """
    Initializes the MinIO client and ensures the required buckets exist.
    Follows S3 standard API usage.
    """
    global minio_client
    endpoint = settings.MINIO_ENDPOINT
    # Strip protocol for the Minio client constructor
    endpoint_stripped = endpoint.replace("http://", "").replace("https://", "")
    
    max_retries = 5
    for i in range(max_retries):
        try:
            logger.info(f"Initializing MinIO client at {endpoint_stripped} (Attempt {i+1})")
            minio_client = Minio(
                endpoint_stripped,
                access_key=settings.MINIO_ACCESS_KEY,
                secret_key=settings.MINIO_SECRET_KEY,
                secure=False
            )
            
            # Standard bucket naming from PRD plus a temp bucket for future artifacts.
            required_buckets = [settings.MINIO_BUCKET, settings.MINIO_TEMP_BUCKET]
            for bucket in required_buckets:
                if not minio_client.bucket_exists(bucket):
                    minio_client.make_bucket(bucket)
                    logger.info(f"Successfully created bucket: {bucket}")
                else:
                    logger.info(f"Bucket already exists: {bucket}")
            
            logger.info("MinIO initialization completed successfully.")
            return minio_client
        except Exception as e:
            logger.error(f"MinIO initialization failed: {e}")
            if i < max_retries - 1:
                time.sleep(2)
            else:
                logger.critical("MinIO initialization failed after maximum retries.")
                raise e

def get_minio_client() -> Minio:
    if minio_client is None:
        return init_minio()
    return minio_client
