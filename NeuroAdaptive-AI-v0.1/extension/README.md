# Chrome Extension — Next Stage

The Chrome Extension is intentionally **not implemented in v0.1**. This folder records the planned migration path from the game prototype.

```text
Chrome Extension
├── content script
│   ├── mouse movement
│   ├── click
│   ├── scroll
│   └── focus / blur
├── rolling-window feature extraction
├── interaction-support estimator
└── UI adapter
    ├── focus mode
    ├── reduced distractions
    ├── larger primary targets
    └── structured summary
```

The important engineering idea is that the same `telemetry → feature extraction → adaptation` pipeline demonstrated in v0.1 can later run on ordinary websites.
