# ML Inference Autoscaling System

A Kubernetes-based machine learning inference system with automatic scaling capabilities, designed to handle variable workloads efficiently using HPA (Horizontal Pod Autoscaler) and comprehensive load testing.

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Load Testing Environment                      │
│  ┌─────────────────┐    ┌──────────────────┐    ┌──────────────────┐   │
│  │   workload.txt  │───▶│  Load Tester     │───▶│   Image Pool     │   │
│  │   (req/second)  │    │   Server         │    │   (base64)       │   │
│  └─────────────────┘    └──────────────────┘    └──────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                            HTTP API calls
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Kubernetes Cluster                              │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      Dispatcher Service                         │   │
│  │  ┌────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │   │
│  │  │    Worker 1    │  │    Worker 2     │  │    Worker 3     │   │   │
│  │  └────────────────┘  └─────────────────┘  └─────────────────┘   │   │
│  │  ┌────────────────────────────────────────────────────────────┐ │   │
│  │  │               Queue (Array)                                │ │   │
│  │  │           [base64_img1, base64_img2, ...]                  │ │   │
│  │  └────────────────────────────────────────────────────────────┘ │   │
│  │  ┌────────────────────────────────────────────────────────────┐ │   │
│  │  │         Cron Job (2 items/second)                          │ │   │
│  │  └────────────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                   │
│                            HTTP calls (2/sec)                          │
│                                    ▼                                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                 ML Inference Service                            │   │
│  │                 (Auto-scaling: 1-5 pods)                        │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐   │   │
│  │  │   Pod 1     │ │   Pod 2     │ │   Pod 3     │ │   ...    │   │   │
│  │  │(FastAPI+UV) │ │(FastAPI+UV) │ │(FastAPI+UV) │ │          │   │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └──────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                   │
│                          Results + Latency                             │
│                                    ▼                                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                Monitoring Stack                                 │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐   │   │
│  │  │ Prometheus  │ │  Grafana    │ │   Loki      │ │   HPA    │   │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └──────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

## 🎯 Key Components

### 1. Load Tester Server (External)

- **Location**: Outside Kubernetes cluster
- **Purpose**: Orchestrates load testing and collects performance metrics
- **Language**: Node.js/TypeScript
- **Key Features**:
  - Processes `workload.txt` to determine request patterns
  - Converts images to base64
  - Calls dispatcher's enqueue API
  - Stores latency measurements
  - Generates performance reports with plots

### 2. Dispatcher Service (Inside Kubernetes)

- **Architecture**: 3 workers + 1 server (cluster mode)
- **Purpose**: Request queuing and rate limiting
- **Language**: Node.js/TypeScript
- **Key Features**:
  - `/enqueue` API: Accepts base64 images and queues them
  - Internal queue (array-based)
  - Cron job: Processes 2 items/second from queue
  - Calls ML inference service
  - Reports latency back to load tester

### 3. ML Inference Service (Inside Kubernetes)

- **Purpose**: Machine learning model inference
- **Technology**: FastAPI + Uvicorn
- **Scaling**: HPA-based autoscaling (1-5 pods)
- **Triggers**: CPU utilization > 70%

### 4. Monitoring Stack

- **Prometheus**: Metrics collection
- **Grafana**: Visualization dashboard
- **Loki**: Log aggregation
- **HPA**: Horizontal Pod Autoscaler

## 🚀 Setup Instructions

### Prerequisites

- Docker Desktop
- Minikube
- kubectl
- Helm 3.x
- Node.js 18+
- Python 3.9+

### 1. Minikube Setup

```bash
# Start Minikube with sufficient resources
minikube start --memory=8192 --cpus=4

# Enable metrics-server for HPA
minikube addons enable metrics-server

# Update kubeconfig context
minikube update-context
```

### 2. Build and Load Docker Images

```bash
# Build dispatcher image
cd dispatcher
docker build -t dispatcher:latest .

# Build ML inference image
cd ../ml-inference
docker build -t ml-inference:latest .

# Load images into Minikube
minikube image load dispatcher:latest
minikube image load ml-inference:latest
```

### 3. Deploy Monitoring Stack

```bash
cd k8s/inference-metrics

# Add Helm repositories
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo add kedacore https://kedacore.github.io/charts
helm repo update

# Update dependencies
helm dependency update

# Install monitoring stack
helm install inference-metrics . --values values.yaml
```

### 4. Deploy Application Services

```bash
# Deploy dispatcher
kubectl apply -f k8s/dispatcher/

# Deploy ML inference service with HPA
kubectl apply -f k8s/inference-metrics/templates/deployment.yaml
kubectl apply -f k8s/inference-metrics/templates/service.yaml
kubectl apply -f k8s/inference-metrics/templates/hpa.yaml
```

### 5. Verify Deployment

```bash
# Check all pods are running
kubectl get pods

# Verify HPA is working
kubectl get hpa -o wide

# Check services
kubectl get svc
```

## 🧪 Load Testing Workflow

### 1. Prepare Test Data

**Create `workload.txt`:**

```
10,15,20,25,30,25,20,15,10,5
```

_Format: requests per second, comma-separated_

**Image Pool:**

- Place test images in `load_tester/images/`
- Images will be automatically converted to base64

### 2. Start Load Tester Server

```bash
cd load_tester
yarn install
yarn dev
```

### 3. Trigger Load Test

```bash
# Custom test with specific parameters
curl -X POST http://localhost:3003/runLoadTest \
  -H "Content-Type: application/json" \
  -d '{
    "maxImages": 1000
  }'
```

### 4. Monitor Autoscaling

```bash
# Watch HPA in real-time
watch kubectl get hpa

# Monitor pod scaling
watch kubectl get pods -l app=ml-inference

# Check CPU usage
kubectl top pods
```

### 5. Generate Performance Report

```bash
# Generate report with actual request count
curl -X POST http://localhost:3000/generateReport \
  -H "Content-Type: application/json" \
  -d '{"totalRequests": 1000}'
```

## 📊 Test Flow Details

### Step-by-Step Process

1. **Test Initialization**

   - Load tester reads `workload.txt`
   - Converts all images in `/images/` to base64
   - Prepares request schedule

2. **Request Generation**

   - For each second in workload pattern:
     - Send N requests to dispatcher's `/enqueue` API
     - Each request contains a base64 image

3. **Dispatcher Processing**

   - Queues incoming base64 images in array
   - Cron job processes 2 items/second
   - Calls ML inference service for each item
   - Measures latency for each request

4. **ML Inference**

   - Processes images using ML model
   - Returns classification results
   - CPU usage triggers autoscaling when busy

5. **Latency Reporting**

   - Dispatcher calls load tester's `/storeLatency` API
   - Latencies stored in cache array

6. **Report Generation**
   - Call `/generateReport` with actual request count
   - System generates:
     - Latency distribution plot
     - Success/failure statistics
     - Performance metrics

## 🔧 API Endpoints

### Load Tester APIs

```
POST /runLoadTest           # Start workload-based test
POST /storeLatency          # Store latency measurement
POST /generateReport        # Generate performance report
```

### Dispatcher APIs

```
POST /enqueue               # Queue image for processing
```

### ML Inference APIs

```
POST /infer               # Image classification
GET  /metrics               # Prometheus metrics
```

## 📈 Monitoring and Observability

### Accessing Dashboards

**Grafana Dashboard:**

```bash
kubectl port-forward svc/inference-metrics-grafana 3000:80
# Access: http://localhost:3000
# Credentials: admin/admin
```

**Prometheus:**

```bash
kubectl port-forward svc/inference-metrics-prometheus-server 9090:80
# Access: http://localhost:9090
```

### Key Metrics to Monitor

- **CPU Utilization**: Target > 70% triggers scaling
- **Request Latency**: End-to-end response times
- **Queue Length**: Dispatcher queue size
- **Pod Count**: Number of active inference pods
- **Success Rate**: Percentage of successful requests

## 🎛️ Configuration

### HPA Configuration

```yaml
# Current settings in hpa.yaml
minReplicas: 1
maxReplicas: 5
targetCPUUtilization: 70%
scaleUpBehavior: 30s stabilization
scaleDownBehavior: 60s stabilization
```

### Dispatcher Configuration

```typescript
// Worker configuration
workers: 3
server: 1 (cluster mode)
cronFrequency: 2 items/second
queueType: Array (in-memory)
```

### Load Tester Configuration

```typescript
// Default settings
imageFormats: [".JPEG", ".jpg", ".png"];
reportFormat: "PNG plot + JSON stats";
```

## 🐛 Troubleshooting

### Common Issues

**HPA showing 0% CPU:**

```bash
# Verify metrics-server is running
kubectl get pods -n kube-system | grep metrics-server

# Check resource requests are set
kubectl describe deployment ml-inference
```

**Pods not scaling:**

```bash
# Check HPA status
kubectl describe hpa ml-inference-hpa

# Verify CPU load
kubectl top pods
```

**Service connectivity issues:**

```bash
# Test dispatcher connectivity
kubectl port-forward svc/dispatcher 8080:8080
curl http://localhost:8080/

# Test from inside cluster
kubectl run debug --image=busybox -it --rm -- sh
wget -qO- http://dispatcher:8080/health
```

## 📋 Performance Benchmarks

### Expected Performance

- **Baseline**: 1 pod handles ~10 RPS
- **Scale-up trigger**: CPU > 70%
- **Scale-up time**: ~30 seconds
- **Scale-down time**: ~60 seconds
- **Max throughput**: ~50 RPS (5 pods)

### Test Scenarios

1. **Gradual Ramp**: 5→10→15→20→25 RPS
2. **Spike Test**: 0→50 RPS instantly
3. **Sustained Load**: 30 RPS for 10 minutes
4. **Peak Hours**: Variable load from workload.txt

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.
