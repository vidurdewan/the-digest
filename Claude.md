## Source Provenance
- Articles have a `source` field (e.g. "CNBC", "Bloomberg") and may have a `sourceType` field
- Source types: "primary" (SEC filings, patent filings, FDA, court docs), "exclusive" (paywalled/first-to-report), "wire" (AP, Reuters — broadly syndicated), "analysis" (newsletters, opinion), "general" (standard news coverage)
- If `sourceType` is not set, infer it from the source name using a mapping object
- Primary sources are the most valuable and should be visually elevated
```