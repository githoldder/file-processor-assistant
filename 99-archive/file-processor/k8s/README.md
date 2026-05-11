Kubernetes Deployment Artifacts
===============================

Overview
- This folder contains Kubernetes manifests used to deploy and test the File Processing All-in-One Helper in a cluster.
- Includes manifests for namespace setup, config, persistent storage, Redis, Postgres, Gotenberg, API gateway, Nginx, and Celery workers.

Folder contents (high level)
- 00-namespace.yaml
- 01-configmap.yaml
- 02-pvc.yaml
- 03-redis.yaml
- 04-postgres.yaml
- 05-gotenberg.yaml
- 06-api.yaml
- 07-nginx.yaml
- 08-celery.yaml
- CLUSTER_INFO.md
- QUICKSTART.md
- TROUBLESHOOTING.md

Usage guidelines
- Prerequisites: a Kubernetes cluster with kubectl configured, and access rights to apply manifests.
- Apply manifests in a dependency-safe order (namespace, config, storage, services, workers).
- Use QUICKSTART.md as a quick reference for bringing up the environment.
- For troubleshooting, consult TROUBLESHOOTING.md and CLUSTER_INFO.md for cluster details.

Notes
- Manifests are tailored for a typical test/staging cluster; adapt to production as needed.
- Do not apply in a live production cluster without proper safeguards and change management.
