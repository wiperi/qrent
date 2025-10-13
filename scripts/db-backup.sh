#!/bin/bash

# 配置
DATE=$(date +%F-%H-%M)
BACKUP_DIR="$HOME/qrent-db-backup"
MYSQL_CONTAINER="qrent-db-1"
DB_NAME="qrent"
DB_USER="root"
DB_PASS=${MYSQL_ROOT_PASSWORD:-root}

mkdir -p $BACKUP_DIR

# 使用 docker exec 在容器中执行 mysqldump
docker exec $MYSQL_CONTAINER \
  mysqldump -u$DB_USER -p$DB_PASS --single-transaction --quick --routines $DB_NAME \
  > $BACKUP_DIR/${DB_NAME}_${DATE}.sql

# 清理旧备份
find $BACKUP_DIR -type f -name "*.sql" -mtime +7 -exec rm {} \;
