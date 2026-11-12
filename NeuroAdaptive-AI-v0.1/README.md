# NeuroAdaptive AI — ADHD-related Mouse Interaction Prototype v0.1

A browser-based research prototype that demonstrates the first technical layer of **NeuroAdaptive AI**:

**Go/No-Go task → mouse telemetry → behavioral feature extraction → rule-based interaction indicator → adaptive UI recommendation**

> **Important:** This prototype is **not** a medical device and does not diagnose or screen for ADHD. The current score is an explicitly heuristic engineering baseline for demonstrating the data pipeline.

## Demo features

- 20-trial mouse Go/No-Go task
- Consistent START area before each trial
- Raw mouse trajectory recording (`x`, `y`, timestamp)
- Go / No-Go accuracy
- Reaction time and reaction-time variability
- Commission errors and omission errors
- Mouse speed, acceleration and path length
- Direction-change count and path efficiency
- Research-demo `ADHD-related interaction indicator`
- Adaptive UI / Focus Mode preview
- Session CSV and full JSON export
- Runs fully in the browser; no backend required for v0.1

## Run locally

Because the source uses JavaScript ES modules, run it through a tiny local web server.

**Windows:** double-click `run_demo.bat`

**macOS:** double-click `run_demo.command` (you may need to allow it once), or run:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Current architecture

```text
User
  ↓
Go / No-Go Task
  ↓
Mouse Telemetry
  ↓
Feature Extractor
  ├─ reaction time
  ├─ RT variability
  ├─ commission / omission errors
  ├─ velocity / acceleration
  ├─ path length
  └─ direction changes
  ↓
Rule-based Baseline
  ↓
Interaction Support Profile
  ↓
Adaptive UI Preview
```

## Why Go/No-Go + mouse dynamics?

The prototype design follows the project literature review and published work using augmented Go/No-Go / stop-signal tasks with mouse movement measures. The goal is to reuse **task structure and feature definitions**, not to claim that mouse movement alone diagnoses ADHD.

Key technical references:

1. Leontyev, A., Sun, S., Wolfe, M., & Yamauchi, T. (2018). *Augmented Go/No-Go Task: Mouse Cursor Motion Measures Improve ADHD Symptom Assessment in Healthy College Students*. Frontiers in Psychology, 9, 496. https://doi.org/10.3389/fpsyg.2018.00496
2. Leontyev, A., & Yamauchi, T. (2019). *Mouse movement measures enhance the stop-signal task in adult ADHD assessment*. PLOS ONE, 14(11), e0225437. https://doi.org/10.1371/journal.pone.0225437

## Prototype score disclaimer

`js/analyzer.js` uses transparent, hand-written heuristic thresholds to demonstrate how behavioral features could be converted into interaction-support decisions. These thresholds are **not literature-validated clinical cut-offs**.

The intended research path is:

1. Verify telemetry and feature computation.
2. Collect pilot task data with informed consent.
3. Compare behavioral features with an appropriate validated adult ADHD self-report / research measure (subject to permission and study design).
4. Evaluate a model with participant-level splits.
5. Use the model to choose interface assistance, while keeping user override available.

## Repository structure

```text
.
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   ├── experiment.js
│   ├── mouseTracker.js
│   ├── featureExtractor.js
│   ├── analyzer.js
│   └── charts.js
├── docs/
│   ├── architecture.md
│   └── methodology.md
├── data/
│   └── README.md
└── extension/
    └── README.md
```

## Next milestone

Move the same telemetry idea into a Chrome Extension:

- content script records mouse / scroll / click behavior
- feature layer aggregates behavior in time windows
- interaction-state layer estimates support needs
- UI adapter reduces distractions or restructures content
- user can always override the automatic adaptation
