#!/bin/bash

set -e

echo "🚀 Setting up AI Onboarding Platform..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

echo "📦 Starting infrastructure services..."
cd "$(dirname "$0")/.."
docker-compose up -d postgres qdrant redis

echo "⏳ Waiting for Postgres to be ready..."
sleep 5
until docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do
    echo "Waiting for Postgres..."
    sleep 2
done

echo "🗄️ Running database migrations..."
cd backend
npx prisma migrate dev --name init 2>/dev/null || npx prisma db push

echo "✅ Setup complete!"
echo ""
echo "To start the application:"
echo "  Backend:  cd backend && npm run start:dev"
echo "  Frontend: cd frontend && npm run dev"
echo ""
echo "Make sure to set your environment variables:"
echo "  - GOOGLE_CLOUD_PROJECT"
echo "  - GOOGLE_CLOUD_LOCATION"
echo "  - GOOGLE_APPLICATION_CREDENTIALS (path to service account JSON)"
echo "  - MEM0_API_KEY"
