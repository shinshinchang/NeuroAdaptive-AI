# Architecture

```text
┌───────────────────────┐
│ Browser Task / Web UI │
└───────────┬───────────┘
            │ pointer events + task events
            ▼
┌───────────────────────┐
│ MouseTracker          │
│ x, y, timestamp       │
└───────────┬───────────┘
            ▼
┌───────────────────────┐
│ FeatureExtractor      │
│ RT / errors / motion  │
└───────────┬───────────┘
            ▼
┌───────────────────────┐
│ Analyzer v0.1         │
│ rule-based heuristic  │
└───────────┬───────────┘
            ▼
┌───────────────────────┐
│ Interaction Profile   │
└───────────┬───────────┘
            ▼
┌───────────────────────┐
│ Adaptive UI Preview   │
└───────────────────────┘
```

The browser prototype intentionally keeps the layers separate so the telemetry and feature modules can later be reused by a Chrome Extension or connected to a backend model.
