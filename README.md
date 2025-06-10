# Scalable ML Inference with Kubernetes

This project implements a scalable machine learning inference system using ResNet50 for image classification. The system is designed to automatically scale based on load using Kubernetes and includes comprehensive monitoring and logging capabilities.

## Architecture Overview

- **ML Inference Service**: FastAPI-based server that hosts the ResNet50 model for image classification
- **Kubernetes Autoscaling**: Automatic scaling of inference pods based on CPU usage using KEDA
- **Load Testing**: Node.js-based load testing tool to simulate high traffic
- **Monitoring**: Prometheus for metrics collection and Grafana for visualization
- **Logging**: Loki for centralized log collection and analysis
- **Package Management**: Helm charts for easy deployment and configuration

## Project Structure

```
.
├── ml-inference/               # ML inference service
│   ├── Dockerfile             # Container definition for the inference service
│   ├── requirements.txt       # Python dependencies
│   └── src/
│       ├── model_server_fastapi.py  # FastAPI server with ResNet50 model
│       └── metrics.py         # Prometheus metrics integration
├── k8s/                       # Kubernetes configuration
│   └── inference-metrics/     # Helm chart for deployment
│       ├── Chart.yaml         # Chart definition and dependencies
│       ├── values.yaml        # Configuration values
│       └── templates/         # Kubernetes resource templates
│           ├── deployment.yaml    # Pod deployment configuration
│           ├── service.yaml       # Service definition
│           └── scaledobject.yaml  # KEDA autoscaling configuration
└── load_tester/               # Load testing tools
    ├── package.json           # Node.js dependencies
    └── artillery-config.yaml  # Artillery load testing configuration
```

## Requirements

### For Local Development

- Python 3.10+
- Node.js 16+
- Docker
- kubectl
- Helm 3

### For Kubernetes Deployment

- Kubernetes cluster (minikube, kind, or cloud provider)
- KEDA installed on the cluster
- Helm 3

## Setup and Installation

### 1. Build and Run the ML Inference Service Locally

```bash
# Navigate to the ml-inference directory
cd ml-inference

# Install Python dependencies
pip install -r requirements.txt

# Run the FastAPI server
python src/model_server_fastapi.py
```

The server will be available at http://localhost:9999 with API documentation at http://localhost:9999/docs

### 2. Build and Push the Docker Image

```bash
# Build the Docker image
docker build -t your-registry/ml-inference:latest ./ml-inference

# Push to your container registry
docker push your-registry/ml-inference:latest
```

### 3. Deploy to Kubernetes using Helm

```bash
# Add required Helm repositories
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo add kedacore https://kedacore.github.io/charts
helm repo update

# Deploy the application
helm install inference-metrics ./k8s/inference-metrics
```

### 4. Run Load Tests

```bash
# Navigate to the load_tester directory
cd load_tester

# Install Node.js dependencies
npm install

# Run Artillery load tests
npx artillery run artillery-config.yaml
```

## Monitoring and Observability

### Prometheus Metrics

The ML inference service exposes the following metrics at `/metrics`:

- `inference_requests_total`: Total number of inference requests
- `inference_exceptions_total`: Total number of inference exceptions
- `inference_latency_seconds`: Histogram of inference request latency

### Accessing Dashboards

After deployment, access the dashboards:

- **Grafana**: For visualization of metrics

  ```bash
  kubectl port-forward svc/inference-metrics-grafana 3000:80
  ```

  Access at http://localhost:3000 (default credentials: admin/prom-operator)

- **Prometheus**: For raw metrics and queries
  ```bash
  kubectl port-forward svc/inference-metrics-prometheus-server 9090:80
  ```
  Access at http://localhost:9090

## Autoscaling Configuration

The system uses KEDA for autoscaling based on Prometheus metrics. The configuration in `scaledobject.yaml` defines:

- Minimum replicas: 1
- Maximum replicas: 5
- Scaling metric: CPU usage (threshold: 50%)
- Polling interval: 15 seconds

## Performance Considerations

- The ML inference service is configured to use limited CPU resources (1 thread) to simulate deployment constraints
- Both client and server code include timing measurements to evaluate performance
- The ResNet50 model is pre-loaded at startup to minimize inference latency

## Troubleshooting

### Common Issues

1. **Pod scaling not working**:

   - Verify KEDA is properly installed
   - Check Prometheus metrics are being collected
   - Examine KEDA logs: `kubectl logs -n keda -l app=keda-operator`

2. **High inference latency**:

   - Check resource allocation for pods
   - Verify node capacity in the cluster
   - Consider using GPU-accelerated nodes for inference

3. **Monitoring not showing data**:
   - Ensure Prometheus can scrape the `/metrics` endpoint
   - Check service annotations for Prometheus discovery
   - Verify Grafana datasource configuration

## Future Improvements

- Add GPU support for faster inference
- Implement model versioning and A/B testing
- Add distributed tracing with Jaeger or Zipkin
- Implement canary deployments for safe model updates
- Add authentication and authorization for the API
