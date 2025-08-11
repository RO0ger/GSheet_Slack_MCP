Security and Secrets Policy

- Do not commit real credentials or tokens. Use `.env` and `claude_desktop_config.json` locally only.
- The following are sensitive and must stay out of Git:
  - `GOOGLE_APPLICATION_CREDENTIALS` (service account JSON or path)
  - `SLACK_WEBHOOK_URL`
  - `GOOGLE_SHEETS_SPREADSHEET_ID`
  - Any absolute paths or machine-specific values
- Use `.env.example` and `claude_desktop_config.example.json` for templates.
- If a secret is accidentally committed, rotate it immediately and force-remove it from Git history (e.g., `git filter-repo`).
