# Security

The Copilot Studio Direct Line secret must exist only in the Azure Function App setting `COPILOT_DIRECTLINE_SECRET` (or a local uncommitted `local.settings.json` during development). Never place the real secret in browser JavaScript, committed config, GitHub Actions logs, issues, pull requests, or documentation.
