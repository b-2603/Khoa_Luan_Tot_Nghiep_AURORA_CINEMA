# Customer Backend

Backend scaffold for the customer system.

Stack:
- Laravel PHP
- MySQL

Purpose:
- Keep API code organized
- Separate business logic from the React frontend
- Make future development easier to scale and maintain

## Suggested Structure

```text
backend/
├─ app/
│  ├─ Http/
│  │  ├─ Controllers/
│  │  │  └─ Api/
│  │  │     └─ V1/
│  │  ├─ Middleware/
│  │  ├─ Requests/
│  │  └─ Resources/
│  ├─ Models/
│  └─ Services/
├─ config/
├─ database/
│  ├─ factories/
│  ├─ migrations/
│  └─ seeders/
├─ public/
├─ resources/
│  └─ views/
├─ routes/
├─ storage/
│  ├─ app/
│  └─ framework/
└─ tests/
```

## Conventions

- `app/Http/Controllers/Api/V1`: API controllers by version
- `app/Http/Requests`: request validation classes
- `app/Http/Resources`: API response transformers
- `app/Services`: business logic
- `app/Models`: Eloquent models
- `database/migrations`: database schema changes
- `database/seeders`: sample data

## MySQL

Use `.env` values like:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=aurora_db
DB_USERNAME=root
DB_PASSWORD=
```

## Current State

This folder is a clean Laravel-ready scaffold.
The real Laravel framework files can be added here when the project is initialized with Composer.
