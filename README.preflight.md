# Trae Preflight

This folder is prepared for `wangxt-972-1`.

Use `.env` for stable local ports and compose project identity:

- APP_PORT: 18272
- API_PORT: 19272
- WEB_PORT: 20272
- DB_PORT: 21272
- REDIS_PORT: 22272

Smoke entry:

```bash
bash scripts/smoke.sh
```

The preflight files are environment scaffolding only. The generated business
project can replace or extend them when needed.
