# BizCore — Business Management Platform

A full-stack multi-tenant ERP platform.

## Tech Stack
- **Backend:** .NET 8, Clean Architecture, PostgreSQL, EF Core, MediatR, JWT
- **Frontend:** React 18, TypeScript, Tailwind CSS, Zustand

## Project Structure

BizCore/
├── backend/    # .NET Core Web API
└── frontend/   # React + TypeScript

## Backend Setup
```bash
cd backend

# Copy example config
copy BizCore.API\appsettings.Development.example.json BizCore.API\appsettings.Development.json

# Edit appsettings.Development.json with your DB credentials

# Restore packages
dotnet restore

# Run migrations
dotnet ef database update \
  --project BizCore.Infrastructure \
  --startup-project BizCore.API

# Run API
cd BizCore.API
dotnet run
```

## Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## Default Login (after DB seed)
- Email: superadmin@bizcore.com
- Password: Admin@123456
- ⚠️ Change password after first login!

## API Documentation
- Swagger: http://localhost:5045/swagger