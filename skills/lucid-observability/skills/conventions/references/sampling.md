# Sampling Configuration

## Head Sampling (Per-Service)

Base sampling rates by environment:

| Environment | Rate | Description |
|-------------|------|-------------|
| production | 0.1 (10%) | Baseline — keeps costs manageable |
| staging | 1.0 (100%) | Full visibility for testing |
| development | 1.0 (100%) | Full visibility for debugging |
| test | 0.0 (0%) | No traces in test runs |

## Tail Sampling (At Collector)

Configure these rules at the collector level (Grafana Tempo, Honeycomb, etc.):

1. **Keep 100% of traces containing error spans** — never drop error traces
2. **Keep 100% of traces with latency > p99** — capture slow outliers
3. **Keep 100% of traces with span.status = ERROR** — capture all failures

## Override Mechanism

Set `OTEL_TRACES_SAMPLER_ARG` environment variable to override the head sampling ratio for a specific service instance.

Example: `OTEL_TRACES_SAMPLER_ARG=1.0` to capture all traces temporarily during debugging.

## Strategy

The combination of head + tail sampling means:
- **Head sampling** captures a baseline of normal traffic (10% in prod)
- **Tail sampling** ensures ALL errors and slow requests are captured regardless of head sampling rate
- This gives full error visibility while keeping storage costs at ~10% of full volume
