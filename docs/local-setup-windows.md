# Running locally on Windows without Docker

Docker Desktop needs WSL 2. If you don't have it, you can still run everything natively.

## 1. Database: a local PostgreSQL

Install PostgreSQL (16 or newer) from postgresql.org. Then, in `psql` as the `postgres` superuser:

```sql
CREATE ROLE fixit LOGIN PASSWORD 'fixit-local-only';
CREATE DATABASE fixit OWNER fixit;
```

In the repo-root `.env`:

```properties
DB_URL=jdbc:postgresql://localhost:5432/fixit
DB_USERNAME=fixit
DB_PASSWORD=fixit-local-only
```

Flyway creates every table (and the `citext` extension) the first time the backend starts.

## 2. Port 8080 may already be taken

The PostgreSQL Windows installer can add an Apache service, **PEM HTTPD**, that listens on 8080. Check with:

```powershell
Get-NetTCPConnection -LocalPort 8080 -State Listen
```

If something is there, don't stop it. Move the backend instead:

```properties
PORT=8081
```

The frontend dev proxy reads the same `PORT` from `.env`, so nothing else changes.

## 3. Java 21

Any JDK 21 works (Temurin, Microsoft, or one IntelliJ downloaded into `%USERPROFILE%\.jdks`). If `java` isn't on your `PATH`, point `JAVA_HOME` at it for the session:

```powershell
$env:JAVA_HOME = "$env:USERPROFILE\.jdks\<your-jdk-folder>"
cd backend; .\mvnw.cmd spring-boot:run
```

## 4. Frontend

```powershell
cd frontend; npm install; npm run dev     # http://localhost:3000
```

## Tests without Docker

`.\mvnw.cmd test -Punit` runs the unit tests. The `*IT` integration tests use Testcontainers and need Docker. They run on every push in GitHub Actions.

## Dev servers stop when their window closes

`npm run dev` and `spring-boot:run` only live as long as the terminal that started them. After a restart, start both again. "Site can't be reached" on `localhost:3000` almost always means the frontend isn't running.
