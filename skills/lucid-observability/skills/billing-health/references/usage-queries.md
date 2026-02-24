# Usage SQL Queries

## LLM Usage by Org

Token consumption grouped by org, provider, and model:

```sql
SELECT org_id, provider_name, model_family, status_bucket,
  COUNT(*) AS request_count,
  SUM(total_tokens) AS total_tokens,
  SUM(prompt_tokens) AS prompt_tokens,
  SUM(completion_tokens) AS completion_tokens,
  MIN(created_at) AS first_event,
  MAX(created_at) AS last_event
FROM openmeter_event_ledger
WHERE created_at > now() - interval '24 hours'
  AND feature = 'chat_completion'
GROUP BY org_id, provider_name, model_family, status_bucket
ORDER BY total_tokens DESC NULLS LAST LIMIT 50
```

## Other Usage by Org

Non-LLM feature usage (tool calls, embeddings, etc.):

```sql
SELECT org_id, service, feature, status_bucket,
  COUNT(*) AS call_count,
  MIN(created_at) AS first_event,
  MAX(created_at) AS last_event
FROM openmeter_event_ledger
WHERE created_at > now() - interval '24 hours'
  AND feature != 'chat_completion'
GROUP BY org_id, service, feature, status_bucket
ORDER BY call_count DESC LIMIT 50
```

## Single Org Deep Dive

Add this filter to either query above to focus on one org:
```sql
AND org_id = '{org_uuid}'
```
