# Property Statistics API Documentation

## Overview

The Property Statistics API provides aggregated statistical data for properties based on regional queries. It offers both tRPC and REST interfaces with comprehensive caching and error handling.

## Endpoints

### tRPC Interface

#### `propertyStats.getStats`

Get property statistics for specified regions.

**Input:**
```typescript
{
  regions?: string // Space-separated region names (optional)
}
```

**Output:**
```typescript
{
  regions: RegionStats[];
  timestamp: Date;
  cacheHit: boolean;
}

interface RegionStats {
  regionName: string;
  avgPricePerRoom: number;      // Average price per bedroom
  avgCommuteTime: number;       // Average commute time in minutes
  totalProperties: number;      // Total number of properties
  avgPropertyPrice: number;     // Average property price
}
```

**Example Usage:**
```typescript
// Get stats for Melbourne and Sydney
const result = await trpc.propertyStats.getStats.query({
  regions: "melbourne sydney"
});

// Get stats for all regions
const allStats = await trpc.propertyStats.getStats.query({});
```

#### `propertyStats.invalidateCache`

Clear all cached statistical data.

**Input:** `{}`

**Output:**
```typescript
{
  success: boolean;
  message: string;
  timestamp: Date;
}
```

### REST Interface

#### `GET /api/property-stats`

Get property statistics for specified regions.

**Query Parameters:**
- `regions` (optional): Space-separated region names

**Example Requests:**
```bash
# Get stats for Melbourne and Sydney
GET /api/property-stats?regions=melbourne%20sydney

# Get stats for all regions
GET /api/property-stats
```

**Response:**
```json
{
  "regions": [
    {
      "regionName": "melbourne",
      "avgPricePerRoom": 325000.50,
      "avgCommuteTime": 28.75,
      "totalProperties": 150,
      "avgPropertyPrice": 650000.25
    }
  ],
  "timestamp": "2024-01-01T12:00:00.000Z",
  "cacheHit": false
}
```

#### `DELETE /api/property-stats/cache`

Invalidate the property statistics cache.

**Response:**
```json
{
  "success": true,
  "message": "Property statistics cache cleared successfully",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Features

### Region Matching
- Uses prefix matching (e.g., "melbourne" matches "melbourne-cbd", "melbourne-north")
- Case-insensitive region names
- Space-separated multiple regions

### Statistical Calculations
- **Average Price per Room**: Property price divided by bedroom count (excludes 0-bedroom properties)
- **Average Commute Time**: Average of all property-school commute times (excludes null values)
- **Total Properties**: Count of all properties in the region
- **Average Property Price**: Mean of all property prices in the region

### Data Handling
- All statistical fields return `0` instead of `null` when no data is available
- Decimal values are rounded to 2 decimal places
- Handles edge cases like zero bedrooms and null commute times gracefully

### Caching
- Redis-based caching with 1-hour TTL
- Cache keys are consistent regardless of region order
- Automatic cache invalidation available
- Graceful fallback when Redis is unavailable

### Error Handling

#### HTTP Status Codes
- `200`: Success
- `400`: Bad Request (invalid region format)
- `500`: Internal Server Error (database issues)
- `504`: Gateway Timeout (query timeout)

#### tRPC Error Codes
- `BAD_REQUEST`: Invalid input validation
- `INTERNAL_SERVER_ERROR`: Database or server errors
- `TIMEOUT`: Query timeout errors

## Input Validation

### Region Format
- Must contain only lowercase letters and hyphens
- Space-separated for multiple regions
- Regex pattern: `^[a-z-]+(\s[a-z-]+)*$`

**Valid Examples:**
- `"melbourne"`
- `"sydney melbourne"`
- `"melbourne-cbd north-sydney"`

**Invalid Examples:**
- `"Melbourne"` (uppercase)
- `"melbourne,sydney"` (comma-separated)
- `"melbourne_sydney"` (underscore)

## Performance

### Response Time
- Target: < 2 seconds per request
- Optimized with single database queries using JOINs
- Leverages existing database indexes

### Caching Strategy
- 1-hour TTL for statistical data
- Consistent cache keys for identical region sets
- Cache hit/miss tracking in response

### Concurrency
- Supports 100+ concurrent requests
- Thread-safe caching operations
- Connection pooling for database queries

## Examples

### Frontend Integration (React + tRPC)

```typescript
import { trpc } from '@/lib/trpc';

function PropertyStats() {
  const { data, isLoading, error } = trpc.propertyStats.getStats.useQuery({
    regions: "melbourne sydney"
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h2>Property Statistics</h2>
      {data?.regions.map(region => (
        <div key={region.regionName}>
          <h3>{region.regionName}</h3>
          <p>Average Price per Room: ${region.avgPricePerRoom.toLocaleString()}</p>
          <p>Average Commute Time: {region.avgCommuteTime} minutes</p>
          <p>Total Properties: {region.totalProperties}</p>
          <p>Average Price: ${region.avgPropertyPrice.toLocaleString()}</p>
        </div>
      ))}
      <small>Data cached: {data?.cacheHit ? 'Yes' : 'No'}</small>
    </div>
  );
}
```

### REST API Integration (JavaScript)

```javascript
async function getPropertyStats(regions) {
  const params = regions ? `?regions=${encodeURIComponent(regions)}` : '';
  const response = await fetch(`/api/property-stats${params}`);
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return await response.json();
}

// Usage
try {
  const stats = await getPropertyStats('melbourne sydney');
  console.log('Property Statistics:', stats);
} catch (error) {
  console.error('Failed to fetch stats:', error.message);
}
```

## Testing

### Unit Tests
- Comprehensive service layer testing with mocked dependencies
- Edge case coverage (zero bedrooms, null values, empty regions)
- Cache functionality testing

### Integration Tests
- Real database query testing
- Performance benchmarking
- Cache integration verification
- Error scenario testing

### Running Tests
```bash
# Run all tests
pnpm test

# Run specific test files
pnpm test PropertyStatsService.test.ts
pnpm test PropertyStatsAPI.integration.test.ts
```

## Monitoring and Debugging

### Logging
- All errors are logged with context
- Request timing information
- Cache hit/miss statistics

### Health Checks
- Database connectivity validation
- Redis availability checking
- Performance metrics collection

## Migration and Deployment

### Database Requirements
- Existing `properties`, `regions`, and `property_school` tables
- Proper foreign key relationships
- Indexes on `regionId`, `price`, and `bedroomCount`

### Environment Variables
- `REDIS_URL`: Redis connection string
- `DATABASE_URL`: MySQL connection string

### Deployment Checklist
- [ ] Database schema up to date
- [ ] Redis instance available
- [ ] Environment variables configured
- [ ] API endpoints registered in routing
- [ ] Tests passing
- [ ] TypeScript compilation successful