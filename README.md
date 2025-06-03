# Image Classification with ResNet50

This project implements a client-server architecture for image classification using ResNet50 pre-trained on ImageNet.

## Project Structure

- `model_server_fastapi.py`: FastAPI server that hosts the ResNet50 model
- `client_fastapi.py`: Client that sends images to the server for classification
- `berlin.jpg`: Sample image for testing
- `model_server.py`: Original aiohttp implementation (for reference)
- `client.py`: Original client implementation (for reference)

## Requirements

Install the required packages:

```bash
pip install fastapi uvicorn torch torchvision pillow numpy opencv-python requests
```

## Running the Application

1. Start the server:

```bash
python model_server_fastapi.py
```

2. In a separate terminal, run the client:

```bash
python client_fastapi.py
```

## API Documentation

Once the server is running, you can access the auto-generated API documentation at:
- Swagger UI: http://localhost:8001/docs
- ReDoc: http://localhost:8001/redoc

## Performance Considerations

The server is configured to use limited CPU resources (1 thread) to simulate deployment constraints. Both client and server code include timing measurements to evaluate performance.
