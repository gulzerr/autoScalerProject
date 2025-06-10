from fastapi import APIRouter, Response
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST

# Define Prometheus metrics
INFER_REQUESTS = Counter(
    "inference_requests_total", "Total number of inference requests"
)
INFER_EXCEPTIONS = Counter(
    "inference_exceptions_total", "Total number of inference exceptions"
)
INFER_LATENCY = Histogram(
    "inference_latency_seconds", "Inference request latency in seconds"
)

router = APIRouter()

@router.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)