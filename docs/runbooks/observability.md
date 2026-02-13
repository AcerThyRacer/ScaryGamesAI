# Observability Runbook (Phase 6)

This runbook covers backend/frontend Sentry and API performance telemetry with OpenTelemetry + CloudWatch.

## Environment Variables

Set in runtime (ECS task env/secrets):

- `SENTRY_DSN` – backend DSN for Node service
- `SENTRY_ENVIRONMENT` – `dev`/`staging`/`production`
- `APP_RELEASE` – release tag/commit SHA
- `SENTRY_TRACES_SAMPLE_RATE` – decimal, e.g. `0.1`
- `OTEL_ENABLED` – `true` to bootstrap Node OpenTelemetry SDK
- `OTEL_EXPORTER_OTLP_ENDPOINT` – optional OTLP HTTP endpoint
- `CLOUDWATCH_EMF_ENABLED` – `true` to emit EMF request metrics
- `CLOUDWATCH_METRIC_NAMESPACE` – default `ScaryGamesAI/API`

Frontend Sentry can be enabled per page via `<meta name="sentry-dsn" content="...">`.

## Deployment Checklist

1. Confirm release tag is set in `APP_RELEASE`.
2. Deploy API and verify `/api/health`.
3. Trigger synthetic error in non-prod and verify Sentry issue appears.
4. Verify CloudWatch dashboard metrics populate:
   - ALB response time
   - ALB 5xx
   - ECS CPU/memory
   - RDS CPU/connections
   - Redis CPU/memory

## Alert Routing

Configure alert policies in Sentry and CloudWatch:

- Sentry: new issue, regression, and crash-free threshold alerts.
- CloudWatch alarms:
  - high ALB 5xx
  - elevated target response latency
  - ECS CPU saturation
  - RDS CPU/connection pressure
  - Redis CPU/free-memory pressure

## Troubleshooting

- If Sentry is not receiving events:
  - verify DSN and environment values
  - verify outbound egress from ECS task to Sentry endpoint
- If OTEL traces are missing:
  - set `OTEL_ENABLED=true`
  - verify OTLP endpoint is reachable from private subnets
- If CloudWatch custom metrics missing:
  - ensure EMF logging is enabled and logs appear in `/ecs/sgai-<env>-api`
  - verify dashboard namespace matches `CLOUDWATCH_METRIC_NAMESPACE`
