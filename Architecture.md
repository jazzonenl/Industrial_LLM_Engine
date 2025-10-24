# Architecture (High Level)

_Updated: 24 Oct 2025_

The architecture separates **how data is processed** from **how results are used**, ensuring portability and predictable integration across domains.

```
Sources → Normalization → Change & Trends → Relations & Context → Summaries → API → Grafana & AI Agents
```

## Conceptual layers
**Integration.** Connect historical and streaming data; harmonize formats.
**Normalization.** Bring heterogeneous signals to a consistent representation.
**Change & Trends.** Identify meaningful deviations and evolving patterns.
**Relations & Context.** Surface likely drivers and effects across systems and groups.
**Summaries.** Clear statements of state, risk, trend, and recommended next steps.
**Delivery.** Dashboards in **Grafana**; APIs for systems and **AI agents**.

## Design principles
- **Modularity.** Components deploy and evolve independently.
- **Stable contracts.** Inputs and outputs follow documented, versioned schemas.
- **Scalability.** Works for single assets and distributed fleets without redesign.
- **Reliability.** Resilient to noise, gaps, and mixed data quality.
- **Privacy.** External interfaces expose aggregated state only.

## Current status
- Unified architecture and production‑proven pipeline.
- Standard Grafana dashboards available.
- Agent‑ready formats for system, group, and attribute summaries.

> Implementation details and algorithmic specifics are intentionally not part of this public documentation.
