import os
from fastapi import FastAPI
from pydantic import BaseModel
import base64
from PIL import Image
import io
import numpy as np
import time
import uvicorn
import torch
from torchvision.models import resnet50, ResNet50_Weights


app = FastAPI(title="ResNet50 Image Classification API")

class ImageRequest(BaseModel):
    data: str  # Base64 encoded image

os.environ['OMP_NUM_THREADS'] = '1'
os.environ['MKL_NUM_THREADS'] = '1'

preprocessor = ResNet50_Weights.IMAGENET1K_V1.transforms()
resnet_model = resnet50(weights=ResNet50_Weights.IMAGENET1K_V1)
resnet_model.eval()

@app.post("/infer")
async def infer(request: ImageRequest):
    t = time.perf_counter()
    decoded = base64.b64decode(request.data)
    inp = Image.open(io.BytesIO(decoded))
    inp = np.array(preprocessor(inp))
    inp = torch.from_numpy(np.array([inp]))
    
    with torch.no_grad():
        preds = resnet_model(inp)
    
    labels = []
    for idx in list(preds[0].sort()[1])[-1:-6:-1]:
        labels.append(ResNet50_Weights.IMAGENET1K_V1.meta["categories"][idx])
    
    processing_time = round(time.perf_counter() - t, 3)
    print(f"Server-side processing took: {processing_time}")
    return {"predictions": labels, "processing_time": processing_time}

if __name__ == '__main__':
    uvicorn.run("model_server_fastapi:app", host="0.0.0.0", port=9999, log_level="info")
