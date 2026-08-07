# Kubernetes Deployment

Kustomize-based Kubernetes manifests with environment overlays.

## Structure

```
k8s/
├── base/                    # Shared manifests
│   ├── kustomization.yaml
│   ├── namespace.yaml
│   ├── configmap.yaml       # Non-secret env vars
│   ├── secret.yaml          # Secrets (replace before deploying)
│   ├── deployment.yaml      # Express API (2 replicas, probes, resources)
│   ├── service.yaml         # ClusterIP service
│   ├── ingress.yaml         # Nginx Ingress
│   ├── hpa.yaml             # Horizontal Pod Autoscaler
│   └── mongodb.yaml         # MongoDB StatefulSet + PVC
└── overlays/
    ├── dev/                 # 1 replica, debug logging, relaxed resources
    ├── staging/             # 2 replicas, tracing enabled
    └── prod/                # 3 replicas, TLS, pod spread, aggressive HPA
```

## Quick Start

```bash
# Preview rendered manifests
kubectl kustomize k8s/overlays/dev

# Deploy to dev
kubectl apply -k k8s/overlays/dev

# Deploy to staging
kubectl apply -k k8s/overlays/staging

# Deploy to production
kubectl apply -k k8s/overlays/prod
```

## Prerequisites

- Kubernetes cluster (1.25+)
- `kubectl` configured
- Nginx Ingress Controller installed
- (Prod) cert-manager for TLS certificates

## Before Deploying

1. **Update secrets** in `k8s/base/secret.yaml` with real values:
   - `MONGODB_URI` — your MongoDB connection string (or use the bundled StatefulSet)
   - `JWT_SECRET` / `JWT_REFRESH_SECRET` — generate with `openssl rand -hex 64`
   - SMTP, AWS, Firebase credentials as needed

2. **Update ingress hosts** in the overlay patches to match your domain.

3. **Build and push the Docker image:**

   ```bash
   docker build -f docker/Dockerfile -t your-registry/express-api:latest .
   docker push your-registry/express-api:latest
   ```

4. **Update the image** in the deployment (or use `kustomize edit set image`):
   ```bash
   cd k8s/overlays/prod
   kustomize edit set image express-api=your-registry/express-api:v1.0.0
   ```

## Environment Differences

| Setting       | Dev     | Staging | Prod           |
| ------------- | ------- | ------- | -------------- |
| Replicas      | 1       | 2       | 3              |
| HPA max       | 3       | 10      | 20             |
| CPU request   | 50m     | 100m    | 250m           |
| Memory limit  | 256Mi   | 512Mi   | 1Gi            |
| LOG_LEVEL     | debug   | info    | warn           |
| Tracing       | enabled | enabled | disabled       |
| TLS           | no      | no      | yes (cert-mgr) |
| Pod spread    | no      | no      | yes            |
| Roll strategy | default | default | 0 unavailable  |

## MongoDB

The base manifests include a single-replica MongoDB StatefulSet with a 10Gi PVC. This is suitable for dev/staging. For production, use:

- **MongoDB Atlas** — update `MONGODB_URI` in the secret
- **MongoDB Operator** — deploy a replica set via the MongoDB Community Operator
- **External MongoDB** — any managed MongoDB service

To skip the bundled MongoDB, remove `mongodb.yaml` from `k8s/base/kustomization.yaml`.

## Health Probes

- **Liveness:** `GET /health` — restarts pod if 3 consecutive failures
- **Readiness:** `GET /health` — removes pod from service endpoints until healthy
- Initial delay: 15s (liveness), 5s (readiness)

## Monitoring

If Prometheus is installed in your cluster, the `/metrics` endpoint is exposed and can be scraped. Add a `ServiceMonitor` or `PodMonitor` for automatic discovery.
