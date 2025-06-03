import requests
import cv2
import base64
import json
import time

image = cv2.imread("../data/berlin.jpg")
image = cv2.resize(image, dsize=(256, 256), interpolation=cv2.INTER_CUBIC)
encoded = base64.b64encode(cv2.imencode(".jpeg",image)[1].tobytes()).decode("utf-8")

t = time.perf_counter()
response = requests.post("http://localhost:8001/infer", data=json.dumps({"data": encoded}))
print(response.text, round(time.perf_counter() - t, 3))