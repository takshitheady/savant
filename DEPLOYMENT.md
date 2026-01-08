# Savant Deployment Guide

## Architecture Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Vercel    │────▶│   Railway   │────▶│  Supabase   │
│  (Frontend) │     │  (Backend)  │     │ (Database)  │
└─────────────┘     └─────────────┘     └─────────────┘
```

## 1. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run database migrations
3. Note down:
   - Project URL: `https://xxx.supabase.co`
   - Anon Key: `eyJ...`
   - Service Role Key: `eyJ...`
   - Database URL: `postgresql://postgres:xxx@db.xxx.supabase.co:5432/postgres`

## 2. Railway Backend Deployment

### Environment Variables (Railway Dashboard → Variables)

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `SUPABASE_DB_URL` | Yes | PostgreSQL connection string |
| `OPENAI_API_KEY` | Yes | For embeddings |
| `OPENROUTER_API_KEY` | Yes | For LLM calls (brand voice, chat) |
| `CORS_ORIGINS` | Yes | Frontend URLs, comma-separated |
| `DEFAULT_MODEL` | No | Default: gpt-4o-mini |

### Example CORS_ORIGINS
```
https://savant.vercel.app,https://your-custom-domain.com
```

### Get Railway URL
After deployment, go to **Settings → Networking** to get your public URL:
```
https://savant-backend-production-xxxx.up.railway.app
```

## 3. Vercel Frontend Deployment

### Environment Variables (Vercel Dashboard → Settings → Environment Variables)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `AGNO_API_URL` | **Yes** | **Railway backend URL** |

### IMPORTANT: AGNO_API_URL
This connects your frontend to the backend. Set it to your Railway URL:
```
https://savant-backend-production-xxxx.up.railway.app
```

## 4. Post-Deployment Checklist

- [ ] Supabase project created and migrations run
- [ ] Railway backend deployed with all env vars
- [ ] Railway public URL obtained
- [ ] Vercel frontend deployed with all env vars
- [ ] **AGNO_API_URL set in Vercel to Railway URL**
- [ ] CORS_ORIGINS in Railway includes Vercel frontend URL
- [ ] Test: Create a savant
- [ ] Test: Generate brand voice
- [ ] Test: Chat with savant

## Troubleshooting

### "Failed to generate brand voice" / Backend not responding
1. Check `AGNO_API_URL` is set in Vercel
2. Check Railway backend is running
3. Check `CORS_ORIGINS` in Railway includes your frontend URL

### CORS errors
Add your frontend URL to `CORS_ORIGINS` in Railway (comma-separated, no spaces)

### Database connection errors
Verify `SUPABASE_DB_URL` format:
```
postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
```
