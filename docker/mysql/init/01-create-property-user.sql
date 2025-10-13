DROP USER IF EXISTS 'property_user'@'%';
CREATE USER 'property_user'@'%' IDENTIFIED BY '${MYSQL_PROPERTY_USER_PASSWORD}';

-- Grant access to property table
GRANT SELECT, INSERT, UPDATE, DELETE ON qrent.properties TO 'property_user'@'%';

-- Grant access to property-related tables
GRANT SELECT, INSERT, UPDATE, DELETE ON qrent.regions TO 'property_user'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON qrent.schools TO 'property_user'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON qrent.property_school TO 'property_user'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON qrent.preferences TO 'property_user'@'%';

FLUSH PRIVILEGES;