import requests
import cv2
import base64
import time
import asyncio
import os

async def main():
    current_dir = os.path.dirname(os.path.abspath(__file__)) 
    image_path = os.path.join(current_dir, "../data/berlin.jpg")

    if not os.path.exists(image_path):
        print(f"Error: File not found at {image_path}")
        return

    image = cv2.imread(image_path)
    if image is None:
        print(f"Error: Failed to load image from {image_path}")
        return

    image = cv2.resize(image, dsize=(256, 256), interpolation=cv2.INTER_CUBIC)
    encoded = base64.b64encode(cv2.imencode(".jpeg", image)[1].tobytes()).decode("utf-8")
    
    payload = {"data": encoded}
    
    t = time.perf_counter()
    response = requests.post("http://localhost:9999/infer", json=payload)
    total_time = round(time.perf_counter() - t, 3)
    
    print(f"Response: {response.json()}")
    print(f"Total request time: {total_time} seconds")

if __name__ == "__main__":
    asyncio.run(main())