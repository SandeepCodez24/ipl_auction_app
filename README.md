# IPL Auction & Team Rating System

This repository contains a full-stack scaffold for the IPL Auction & Team Rating System described in `docs/IMPLEMENTATION_PLAN.md`.

## Structure
- `client/`: React (Vite) frontend scaffold
- `server/`: Flask backend scaffold
- `docker/` and `nginx/`: container and proxy configuration
- `docs/`: design and API documentation

## Quick Start (Local)

### Backend
```bash
cd server
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python run.py
```

### Frontend
```bash
cd client
npm install
npm run dev
```

## Notes
This is a starter scaffold. Replace placeholders with production-ready implementations.
