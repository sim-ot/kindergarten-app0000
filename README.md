# Kindergarten School Management - MVP

## Prerequisites
- Docker & Docker Compose installed

## Run locally
1. Copy files into a folder structure as provided.
2. From project root run:
   docker-compose up --build
3. Backend: http://localhost:4000
   Frontend: http://localhost:3000

## Default admin
- Email: admin@school.test
- Password: password123 (create via API or run init script)

## Notes
- Uploads stored in `./uploads` (dev only).
- For production: configure a real SMTP, S3, and a payment gateway.
