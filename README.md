# RailConnect

Full-stack railway reservation application.

## Project structure
- `frontend/` — React + Vite application (deploy on Vercel)
- `backend/` — Java 17 + Spring Boot REST API (deploy on Render using Docker)

## Deployment overview
1. Deploy the backend from the `backend/` directory on Render.
2. Configure the backend environment variables listed in `backend/.env.example`.
3. Deploy the frontend from the `frontend/` directory on Vercel with `VITE_API_BASE_URL` set to the Render backend URL.

Never commit real credentials or `.env` files.
