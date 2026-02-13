# EC2 Fallback Runbook (Disaster Recovery)

This runbook provides a production fallback path from ECS Fargate to EC2 if ECS control-plane, task scheduling, or service limits prevent restoration within the RTO.

## Preconditions

- AMI with Docker installed and hardened baseline.
- IAM instance profile allowing pull from ECR and read from Secrets Manager.
- Security groups aligned with [`infra/aws/terraform/main.tf`](infra/aws/terraform/main.tf).
- DNS zone in Route53 with weighted or failover records.

## 1) Launch EC2 replacement group

1. Use the latest hardened AMI.
2. Attach SG that allows inbound from ALB and outbound to RDS/Redis.
3. Attach IAM instance profile with ECR + Secrets access.
4. Bootstrap user-data to start the app container.

Example startup command:

```bash
docker run -d --name scarygamesai \
  -p 9999:9999 \
  -e NODE_ENV=production \
  -e PORT=9999 \
  -e DB_PROVIDER=postgres \
  -e DATABASE_URL="${DATABASE_URL}" \
  -e REDIS_URL="${REDIS_URL}" \
  -e JWT_SECRET="${JWT_SECRET}" \
  <account>.dkr.ecr.<region>.amazonaws.com/scarygamesai:<release-tag>
```

## 2) Wire ALB target group

1. Create or reuse an EC2 target group.
2. Register recovery instances.
3. Verify health check path `/api/health` is healthy.
4. Shift listener rule from ECS target group to EC2 target group.

## 3) Validate app integrity

- Run smoke checks:
  - `/api/health`
  - `/api/v1/subscriptions/leaderboard`
  - `/api/v2/auth/login` (non-prod test identity)
- Confirm DB writes and Redis operations are functioning.
- Confirm CloudWatch logs are ingesting.

## 4) DNS/edge routing

- If CloudFront origin points to ALB, no DNS change required after ALB listener switch.
- If direct origin failover is needed:
  1. update Route53 failover record to EC2 ALB/ELB endpoint
  2. invalidate CloudFront `/*`

## 5) Recovery back to ECS

1. Restore ECS service capacity and health.
2. Shift ALB listener back to ECS target group.
3. Observe for 30 minutes.
4. Drain and terminate EC2 fallback instances.
5. Record incident timeline and corrective actions.

## Rollback criteria

Abort EC2 fallback and revert to previous traffic target if any of the following occur:

- sustained 5xx > 2% for 5 minutes
- p95 latency > 2x baseline for 10 minutes
- authentication/session failures > 1%
- migration or data corruption alerts
