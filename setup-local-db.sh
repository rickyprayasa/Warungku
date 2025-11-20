#!/bin/bash

echo "🔧 Setting up local D1 database..."

# Create local D1 database
echo "Creating local database..."
npx wrangler d1 create warungku_db --local 2>/dev/null || echo "Database may already exist locally"

# Apply schema to local database
echo "Applying schema..."
npx wrangler d1 execute warungku_db --local --file=migrations/schema.sql

# Create test user
echo "Creating admin user..."
npx tsx scripts/create-user.ts admin@warungku.com admin123 > /tmp/user_sql.txt

# Extract the SQL command and execute
echo "Inserting admin user to local database..."
SQL_CMD=$(grep "INSERT INTO users" /tmp/user_sql.txt | sed "s/.*--command \"//" | sed "s/\".*//" | sed 's/\\$/$/g')
echo "$SQL_CMD" | npx wrangler d1 execute warungku_db --local --command="$SQL_CMD"

echo "✅ Local database setup complete!"
echo ""
echo "📧 Login credentials:"
echo "   Email: admin@warungku.com"
echo "   Password: admin123"
echo ""
echo "🚀 Run 'npm run dev' to start development server"
