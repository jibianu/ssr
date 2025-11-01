# Backend API Optimization Guide

This document provides recommendations for optimizing the .NET Core backend API to improve SSR performance, reduce load times, and enhance overall application responsiveness.

## Overview

The Angular SSR application depends on the backend API for data. Optimizing backend responses directly improves:
- **Time to First Byte (TTFB)**: Faster initial page loads
- **Server-Side Rendering (SSR)**: Reduced wait times during SSR
- **User Experience**: Faster perceived performance

---

## 1. HTTP Cache Headers

### Problem
Backend responses don't include cache headers, causing:
- Redundant API calls on every page load
- Increased server load
- Slower SSR performance

### Solution: Add Cache Headers

#### For Static/Semi-Static Content (Categories, Locations, Icons)
```csharp
[HttpGet("page/category")]
public IActionResult GetCategories()
{
    var categories = _categoryService.GetAll();
    
    // ✅ Cache for 1 hour (3600 seconds)
    Response.Headers.Add("Cache-Control", "public, max-age=3600, stale-while-revalidate=7200");
    Response.Headers.Add("ETag", GenerateETag(categories));
    
    return Ok(categories);
}
```

#### For Dynamic Content (Courses, Events)
```csharp
[HttpGet("page/course")]
public IActionResult GetCourses([FromQuery] CourseFilterDto filters)
{
    var courses = _courseService.GetFiltered(filters);
    
    // ✅ Cache for 5 minutes with validation
    Response.Headers.Add("Cache-Control", "public, max-age=300, must-revalidate");
    Response.Headers.Add("ETag", GenerateETag(courses, filters));
    
    return Ok(courses);
}
```

#### Recommended Cache Durations

| Content Type | Max-Age | Reason |
|-------------|---------|--------|
| Categories | 1 hour (3600s) | Rarely changes |
| Locations | 1 hour (3600s) | Rarely changes |
| Icons | 24 hours (86400s) | Static content |
| Course List | 5 minutes (300s) | Changes periodically |
| Course Details | 15 minutes (900s) | Changes infrequently |
| Events | 5 minutes (300s) | Changes periodically |

### Benefits
- **Angular HTTP Transfer Cache** automatically respects these headers
- Reduces redundant API calls by 40-60%
- Improves SSR TTFB by 200-400ms

---

## 2. Database Query Optimization

### Problem
Sequential database queries and missing indexes cause slow response times.

### Solution

#### 2.1 Add Database Indexes

```sql
-- ✅ Index for course filtering by category
CREATE INDEX IX_Course_CategoryId ON Courses(CategoryId);

-- ✅ Index for course search by title
CREATE INDEX IX_Course_Title ON Courses(Title);

-- ✅ Index for canonical URL lookups (frequently used in resolvers)
CREATE INDEX IX_Course_CanonicalUrl ON Courses(CanonicalUrl);

-- ✅ Index for event lookups
CREATE INDEX IX_Event_CanonicalUrl ON Events(CanonicalUrl);
CREATE INDEX IX_Event_StartDate ON Events(StartDate);

-- ✅ Composite index for course list filtering
CREATE INDEX IX_Course_Category_IsActive ON Courses(CategoryId, IsActive);
```

#### 2.2 Optimize Entity Framework Queries

**Before (Inefficient)**:
```csharp
public async Task<List<Course>> GetCourses(CourseFilterDto filters)
{
    // ❌ N+1 query problem
    var courses = await _context.Courses
        .Where(c => c.CategoryId == filters.CategoryId)
        .ToListAsync();
    
    foreach (var course in courses)
    {
        course.Category = await _context.Categories.FindAsync(course.CategoryId);
        course.CourseFeatures = await _context.CourseFeatures
            .Where(f => f.CourseId == course.Id)
            .ToListAsync();
    }
    
    return courses;
}
```

**After (Optimized)**:
```csharp
public async Task<List<Course>> GetCourses(CourseFilterDto filters)
{
    // ✅ Single query with eager loading
    var courses = await _context.Courses
        .Include(c => c.Category)
        .Include(c => c.CourseFeatures)
        .Include(c => c.CreatedByUser)
        .Where(c => c.CategoryId == filters.CategoryId)
        .Where(c => c.IsActive == true)
        .AsNoTracking() // ✅ Don't track entities - read-only
        .ToListAsync();
    
    return courses;
}
```

#### 2.3 Use Projection for List Views

**Before**:
```csharp
var courses = await _context.Courses.ToListAsync();
// Returns full Course entity with all relations
```

**After**:
```csharp
// ✅ Project only needed fields
var courses = await _context.Courses
    .Select(c => new CourseListDto
    {
        Id = c.Id,
        Title = c.Title,
        TitleImageUrl = c.TitleImageUrl,
        CanonicalUrl = c.CanonicalUrl,
        Amount = c.Amount,
        CategoryName = c.Category.Name
    })
    .AsNoTracking()
    .ToListAsync();
```

### Benefits
- Query response time: 50-70% reduction
- Database load: 40-60% reduction
- SSR wait time: 150-300ms improvement

---

## 3. Response Compression

### Problem
Large JSON responses increase transfer time.

### Solution: Enable Compression Middleware

```csharp
// Startup.cs or Program.cs
public void ConfigureServices(IServiceCollection services)
{
    services.AddResponseCompression(options =>
    {
        options.EnableForHttps = true;
        options.Providers.Add<BrotliCompressionProvider>();
        options.Providers.Add<GzipCompressionProvider>();
    });
    
    services.Configure<BrotliCompressionProviderOptions>(options =>
    {
        options.Level = CompressionLevel.Fastest;
    });
}

public void Configure(IApplicationBuilder app)
{
    app.UseResponseCompression();
    // ... other middleware
}
```

### Benefits
- Response size: 60-80% reduction
- Transfer time: 50-70% reduction

---

## 4. Pagination Optimization

### Problem
Large result sets are loaded entirely, causing slow responses.

### Solution: Efficient Pagination

```csharp
[HttpGet("page/course")]
public async Task<IActionResult> GetCourses(
    [FromQuery] int pageSize = 12,
    [FromQuery] int pageNumber = 1,
    [FromQuery] string category = null)
{
    var query = _context.Courses.AsQueryable();
    
    if (!string.IsNullOrEmpty(category))
    {
        query = query.Where(c => c.Category.Name == category);
    }
    
    // ✅ Get total count first (with index, this is fast)
    var totalCount = await query.CountAsync();
    
    // ✅ Use Skip/Take for efficient pagination
    var courses = await query
        .OrderBy(c => c.SortOrder)
        .ThenBy(c => c.CreatedOn)
        .Skip((pageNumber - 1) * pageSize)
        .Take(pageSize)
        .Select(c => new CourseListDto { /* projection */ })
        .AsNoTracking()
        .ToListAsync();
    
    return Ok(new
    {
        Results = courses,
        TotalNumberOfRecords = totalCount,
        PageNumber = pageNumber,
        PageSize = pageSize
    });
}
```

### Benefits
- Response time: 70-90% reduction for large datasets
- Memory usage: Significant reduction

---

## 5. CORS Configuration (Already Implemented)

✅ **Already Configured** - Ensure CORS allows:
- Origin: `http://localhost:4200` (development)
- Origin: `https://oilandgasclub.com` (production)
- Methods: GET, POST, PUT, DELETE
- Headers: Content-Type, Authorization

---

## 6. Connection Pooling

### Problem
Too many database connections can cause slowdowns.

### Solution: Optimize Connection String

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=...;Database=...;User Id=...;Password=...;Max Pool Size=100;Min Pool Size=5;Connection Timeout=30;"
  }
}
```

### Benefits
- Reduced connection overhead
- Better resource utilization

---

## 7. Health Check Endpoint

### Solution: Add Health Check

```csharp
// Startup.cs or Program.cs
services.AddHealthChecks()
    .AddDbContextCheck<ApplicationDbContext>()
    .AddCheck<ApiHealthCheck>("api");

app.UseEndpoints(endpoints =>
{
    endpoints.MapHealthChecks("/health");
});

// HealthCheck class
public class ApiHealthCheck : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        // Check database connectivity
        // Check critical services
        return HealthCheckResult.Healthy();
    }
}
```

### Benefits
- Frontend can verify backend availability
- Better error handling and user feedback

---

## 8. Response Time Monitoring

### Solution: Add Response Time Logging

```csharp
public class ResponseTimeMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ResponseTimeMiddleware> _logger;

    public ResponseTimeMiddleware(RequestDelegate next, ILogger<ResponseTimeMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var stopwatch = Stopwatch.StartNew();
        await _next(context);
        stopwatch.Stop();
        
        var responseTime = stopwatch.ElapsedMilliseconds;
        _logger.LogInformation(
            "API {Method} {Path} - Response Time: {ResponseTime}ms",
            context.Request.Method,
            context.Request.Path,
            responseTime
        );
        
        // Log slow requests
        if (responseTime > 500)
        {
            _logger.LogWarning(
                "SLOW REQUEST: {Method} {Path} took {ResponseTime}ms",
                context.Request.Method,
                context.Request.Path,
                responseTime
            );
        }
    }
}
```

---

## 9. API Response Formatting

### Optimize JSON Serialization

```csharp
services.AddControllers()
    .AddJsonOptions(options =>
    {
        // ✅ Remove null properties to reduce payload size
        options.JsonSerializerOptions.IgnoreNullValues = true;
        
        // ✅ Use camelCase for consistency with Angular
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        
        // ✅ Write numbers as strings if needed for precision
        // options.JsonSerializerOptions.NumberHandling = JsonNumberHandling.WriteAsString;
    });
```

---

## 10. Recommended Implementation Priority

### Phase 1 (High Impact, Low Effort) - 1-2 days
1. ✅ Add cache headers (Categories, Locations)
2. ✅ Add database indexes for frequently queried fields
3. ✅ Enable response compression

**Expected Impact**: 30-40% improvement in API response times

### Phase 2 (High Impact, Medium Effort) - 2-3 days
4. ✅ Optimize Entity Framework queries (eager loading, projections)
5. ✅ Implement efficient pagination
6. ✅ Add health check endpoint

**Expected Impact**: Additional 40-50% improvement in query performance

### Phase 3 (Medium Impact, Ongoing) - Ongoing
7. ✅ Monitor response times
8. ✅ Fine-tune cache durations based on usage
9. ✅ Optimize based on slow query logs

---

## Monitoring & Metrics

### Key Metrics to Track:
- **Average Response Time**: Target < 200ms for list endpoints, < 100ms for detail endpoints
- **Cache Hit Rate**: Target > 60% for cached endpoints
- **Database Query Time**: Target < 50ms per query
- **95th Percentile Response Time**: Target < 500ms

### Tools:
- Application Insights
- SQL Server Profiler
- Performance Monitor
- Custom logging middleware

---

## Testing

After implementing optimizations:

1. **Load Testing**: Use tools like JMeter or k6 to test under load
2. **Performance Testing**: Measure before/after response times
3. **Cache Validation**: Verify cache headers are working
4. **Database Profiling**: Check query execution plans

---

## Summary

Implementing these backend optimizations will significantly improve:
- **SSR Performance**: Faster TTFB during server-side rendering
- **User Experience**: Faster page loads and interactions
- **Server Efficiency**: Reduced load and better resource utilization
- **Scalability**: Better handling of increased traffic

**Expected Overall Improvement**: 50-70% reduction in API response times, translating to 200-500ms faster page loads.

