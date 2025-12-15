# Poly Nova Backend

Backend API server for tracking MrBeast video views and weather market analysis using Fastify, Prisma, and PostgreSQL.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- PostgreSQL (for production) or SQLite (for local development)

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Update .env with your configuration
# DATABASE_URL, YOUTUBE_API_KEY, etc.

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Optional: Seed database with initial data
npm run seed
```

### Development

```bash
# Start development server with auto-reload
npm run dev

# Server will start on http://localhost:3000
```

### Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

## 📁 Project Structure

```
poly_nova_backend/
├── src/
│   ├── server.ts          # Main server file
│   └── services/          # Business logic services
│       ├── videoService.ts
│       ├── weatherService.ts
│       └── ...
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── migrations/        # Database migrations
├── scripts/               # Utility scripts
│   ├── seed_weather.ts
│   ├── check_db.ts
│   └── ...
├── package.json
├── tsconfig.json
└── .env.example
```

## 🗄️ Database

### SQLite (Local Development)

```env
DATABASE_URL="file:./dev.db"
```

### PostgreSQL (Production)

```env
DATABASE_URL="postgresql://user:password@host:port/database"
```

### Prisma Commands

```bash
# Generate Prisma client
npx prisma generate

# Create migration
npx prisma migrate dev --name migration_name

# Apply migrations (production)
npx prisma migrate deploy

# Open Prisma Studio (database GUI)
npx prisma studio

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

## 🌐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Database connection string | ✅ |
| `YOUTUBE_API_KEY` | YouTube Data API v3 key | ✅ |
| `CHANNEL_ID` | YouTube channel ID to track | ✅ |
| `NODE_ENV` | Environment (development/production) | ❌ |
| `PORT` | Server port | ❌ (default: 3000) |

## 🔌 API Endpoints

### Videos

- `GET /api/videos` - Get all tracked videos
- `GET /api/videos/:id` - Get specific video with view history

### Weather

- `GET /api/weather` - Get all weather forecasts
- `GET /api/weather/:date` - Get forecasts for specific date
- `GET /api/weather/accuracy` - Get model accuracy scores

### Health

- `GET /health` - Server health check

## 🚢 Deployment

### Deploy to Render

1. Push code to GitHub
2. Create new Web Service in Render
3. Configure:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run deploy`
4. Add environment variables (see above)
5. Create PostgreSQL database in Render
6. Deploy!

### Deploy to Railway

1. Push code to GitHub
2. Import repository in Railway
3. Add PostgreSQL database
4. Configure environment variables
5. Deploy!

## 🔧 Available Scripts

- `npm run dev` - Start development server with auto-reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run deploy` - Run migrations and start server (for production)
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations

## 📦 Tech Stack

- **Fastify** - Fast web framework
- **Prisma** - Modern ORM
- **PostgreSQL** - Production database
- **SQLite** - Local development database
- **TypeScript** - Type safety
- **Node-Cron** - Scheduled tasks
- **Axios** - HTTP client

## 🛠️ Utility Scripts

Located in `scripts/` directory:

- `seed_weather.ts` - Seed weather data
- `check_db.ts` - Check database connection
- `test_accuracy.ts` - Test weather model accuracy
- `trigger_collection.ts` - Manually trigger data collection

Run with:
```bash
npx ts-node scripts/script_name.ts
```

## 🤝 Related Repositories

- [poly_nova_frontend](../poly_nova_frontend) - React frontend application

## 📄 License

ISC
  
