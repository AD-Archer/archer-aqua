what’s needed for full API usage
Real auth: Implement proper credential storage/verification in the Go server (password hashing, login endpoint, issuing a token) and have the frontend store/use that token. Until then, think of the current auth as “demo mode.”
Hook up data reads/writes: Replace useWaterTracking’s local reads/writes with the backend helper functions (or at least prime local state from fetchDailySummaryFromBackend/fetchHydrationStatsFromBackend and mirror writes through logHydrationToBackend).
Handle offline fallback: Once you rely on the server, decide how to degrade gracefully if requests fail (queue and retry, or keep the local-cache-first behavior but reconcile).
