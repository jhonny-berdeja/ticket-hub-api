# Deploying `ticket-hub-api` on microk8s

Minimal manifest set: `Namespace` + `Secret` (template) + `Deployment` +
`Service`. Assumes `ticket-hub-db` (Deployment, Service, and the
`ticket-hub-db-credentials` Secret) is already running in the `ticket-hub`
namespace — this repo doesn't own that.

## 1. Enable the local image registry (once per cluster)

```bash
microk8s enable registry
```

## 2. Build and push the image

```bash
docker build -t localhost:32000/ticket-hub-api:latest .
docker push localhost:32000/ticket-hub-api:latest
```

## 3. Create the namespace (no-op if it already exists)

```bash
microk8s kubectl apply -f .kubernetes/namespace.yaml
```

## 4. Create the API's JWT secret

```bash
cp .kubernetes/secret.example.yaml .kubernetes/secret.yaml
# edit .kubernetes/secret.yaml: replace the JWT_SECRET placeholder with a
# real value, e.g. `openssl rand -base64 48`
microk8s kubectl apply -f .kubernetes/secret.yaml
```

`secret.yaml` is gitignored — never commit it.

## 5. Deploy

```bash
microk8s kubectl apply -f .kubernetes/deployment.yaml -f .kubernetes/service.yaml
```

## 6. Verify

Follow the "Manual verification" checklist in the repo's `README.md`
(Pods up, `POST /users`/`POST /auth/login` smoke test, schema untouched).

## Redeploying after a code change

```bash
docker build -t localhost:32000/ticket-hub-api:latest .
docker push localhost:32000/ticket-hub-api:latest
microk8s kubectl rollout restart deployment/ticket-hub-api -n ticket-hub
```
