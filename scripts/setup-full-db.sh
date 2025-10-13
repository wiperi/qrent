#!/bin/bash

set -e 

if [ ! -f "docker-compose.yml" ]; then
  echo "❌ go to the root file"
  exit 1
fi

PROPERTY_FILE="packages/scraper/property_data_250623.json"
if [ ! -f "$PROPERTY_FILE" ]; then
  echo "error: $PROPERTY_FILE"
  exit 1
fi

echo "1. docker..."
docker-compose up -d db

echo "waitting..."
sleep 15

echo "check connect..."
max_attempts=10
attempt=1
while [ $attempt -le $max_attempts ]; do
  if docker-compose exec db mysql -u root -p1234 -e "SELECT 1;" > /dev/null 2>&1; then
    echo "database conneted"
    break
  else
    echo "wait... ( $attempt/$max_attempts)"
    sleep 5
    attempt=$((attempt + 1))
  fi
done

if [ $attempt -gt $max_attempts ]; then
  echo "error"
  exit 1
fi

cd packages/shared
DATABASE_URL="mysql://root:1234@localhost:3306/qrent" pnpm db:push

DATABASE_URL="mysql://root:1234@localhost:3306/qrent" pnpm db:generate

DATABASE_URL="mysql://root:1234@localhost:3306/qrent" npx tsx prisma/seed.ts

cd ../scraper
DB_HOST=localhost DB_USER=root MYSQL_PROPERTY_USER_PASSWORD=1234 python change_to_sql.py property property_data_250623.json

cd ../../
docker-compose exec db mysql -u root -p1234 -e "
USE qrent;
SELECT 
  'Properties' as table_name, 
  COUNT(*) as count 
FROM properties 
UNION ALL
SELECT 
  'Property-School Relations', 
  COUNT(*) 
FROM property_school 
UNION ALL
SELECT 
  'Regions', 
  COUNT(*) 
FROM regions 
UNION ALL
SELECT 
  'Schools', 
  COUNT(*) 
FROM schools;
"

echo ""
docker-compose exec db mysql -u root -p1234 -e "
USE qrent;
SELECT 
  p.id, 
  p.address, 
  r.name as region, 
  p.price 
FROM properties p 
JOIN regions r ON p.region_id = r.id 
LIMIT 3;
"

echo ""
docker-compose exec db mysql -u root -p1234 -e "
USE qrent;
SELECT 
  ps.property_id, 
  p.address, 
  s.name as school, 
  ps.commute_time 
FROM property_school ps 
JOIN properties p ON ps.property_id = p.id 
JOIN schools s ON ps.school_id = s.id 
LIMIT 5;
"

echo ""
echo "finish！"
echo ""
