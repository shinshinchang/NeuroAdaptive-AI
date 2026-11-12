# Methodology — v0.1

## 1. Goal

The first prototype does **not** attempt clinical ADHD diagnosis. It validates whether the project can technically capture and transform mouse interaction data into interpretable behavioral features and interface-support decisions.

## 2. Task

A short mouse-based Go/No-Go task is used because the project's literature review identified published adult mouse-movement work using Go/No-Go and stop-signal paradigms.

The original 2018 study used a substantially longer research protocol. This v0.1 demo deliberately uses only 20 trials so it can be shown during a short progress presentation. Therefore its output should be treated only as a software pipeline demonstration.

### Demo task

- 20 trials
- approximately 70% Go / 30% No-Go
- consistent START area before every trial
- cue `V` = Go
- cue `2` = No-Go
- response window: 1.25 s
- mouse coordinates sampled from browser pointer events

## 3. Features

### Task-level

- accuracy
- mean Go reaction time
- reaction-time standard deviation
- reaction-time coefficient of variation
- commission errors: response on No-Go
- omission errors: no response on Go

### Mouse movement

- path length
- mean speed
- maximum speed
- speed standard deviation
- mean absolute acceleration
- maximum absolute acceleration
- direction changes (>45°)
- path efficiency for Go trials

## 4. Analysis

The current `ADHD-related interaction indicator` is a transparent engineering heuristic. It combines:

- reaction-time variability
- commission-error rate
- omission-error rate
- direction-change rate
- mouse-speed variability

No threshold is presented as a diagnostic threshold. The score exists only to demonstrate how a future validated model could drive an adaptive UI.

## 5. Intended next validation

A future pilot should:

1. recruit adult participants under an appropriate research procedure;
2. record task behavior and informed self-report data;
3. examine associations between behavioral features and an appropriate validated measure;
4. compare rule-based and machine-learning baselines;
5. evaluate unseen participants using participant-level train/test splitting;
6. separately test whether the resulting UI adaptations improve task performance, perceived workload and control.
