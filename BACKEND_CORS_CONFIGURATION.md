# .NET Core Backend CORS Configuration Guide

## Overview

This guide shows how to configure CORS (Cross-Origin Resource Sharing) in your .NET Core backend API to allow requests from your Angular frontend.

---

## 🔧 Configuration Steps

### **Step 1: Add CORS Service** (Program.cs or Startup.cs)

#### **For .NET 6+ (Minimal API / Program.cs)**:

```csharp
using Microsoft.AspNetCore.Cors;

var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddControllers();

// ✅ CORS Configuration
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngularSSR",
        policy =>
        {
            policy
                .WithOrigins(
                    // Development - Angular dev server
                    "http://localhost:4200",
                    // Development - SSR server  
                    "http://localhost:4000",
                    // Production domains
                    "https://oilandgasclub.com",
                    "https://www.oilandgasclub.com",
                    // Add any other domains that need access
                    "https://coursebackend.oilandgasclub.com"
                )
                .AllowAnyMethod()           // Allow GET, POST, PUT, DELETE, etc.
                .AllowAnyHeader()           // Allow any headers (Content-Type, Authorization, etc.)
                .AllowCredentials();         // Allow cookies/auth headers (if needed)
        });
});

var app = builder.Build();

// ✅ IMPORTANT: Use CORS middleware BEFORE UseRouting and UseEndpoints
app.UseCors("AllowAngularSSR");

app.UseRouting();
app.UseAuthentication();   // If using auth
app.UseAuthorization();    // If using auth
app.MapControllers();

app.Run();
```

#### **For .NET Core 3.1 / 5.0 (Startup.cs)**:

```csharp
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

public class Startup
{
    public Startup(IConfiguration configuration)
    {
        Configuration = configuration;
    }

    public IConfiguration Configuration { get; }

    // ✅ Configure Services
    public void ConfigureServices(IServiceCollection services)
    {
        services.AddControllers();

        // ✅ CORS Configuration
        services.AddCors(options =>
        {
            options.AddPolicy("AllowAngularSSR",
                builder =>
                {
                    builder
                        .WithOrigins(
                            "http://localhost:4200",  // Angular dev server
                            "http://localhost:4000",  // SSR server
                            "https://oilandgasclub.com",
                            "https://www.oilandgasclub.com"
                        )
                        .AllowAnyMethod()
                        .AllowAnyHeader()
                        .AllowCredentials();
                });
        });
    }

    // ✅ Configure Middleware Pipeline
    public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
    {
        if (env.IsDevelopment())
        {
            app.UseDeveloperExceptionPage();
        }

        app.UseHttpsRedirection();
        app.UseRouting();

        // ✅ IMPORTANT: CORS must be BEFORE UseAuthentication/UseAuthorization
        app.UseCors("AllowAngularSSR");

        app.UseAuthentication();
        app.UseAuthorization();

        app.UseEndpoints(endpoints =>
        {
            endpoints.MapControllers();
        });
    }
}
```

---

## 🔐 Security Best Practices

### **Option 1: Environment-Based CORS (RECOMMENDED)**

Configure CORS based on environment:

```csharp
public void ConfigureServices(IServiceCollection services)
{
    services.AddControllers();
    
    // ✅ Environment-aware CORS
    var allowedOrigins = new List<string>();
    
    if (Environment.IsDevelopment())
    {
        // Development: Allow localhost
        allowedOrigins.AddRange(new[]
        {
            "http://localhost:4200",
            "http://localhost:4000"
        });
    }
    else
    {
        // Production: Only allow specific domains
        allowedOrigins.AddRange(new[]
        {
            "https://oilandgasclub.com",
            "https://www.oilandgasclub.com"
        });
    }
    
    services.AddCors(options =>
    {
        options.AddPolicy("AllowAngularSSR",
            builder =>
            {
                builder
                    .WithOrigins(allowedOrigins.ToArray())
                    .AllowAnyMethod()
                    .AllowAnyHeader()
                    .AllowCredentials();
            });
    });
}
```

### **Option 2: Configuration-Based CORS**

Store allowed origins in `appsettings.json`:

```json
// appsettings.json
{
  "Cors": {
    "AllowedOrigins": [
      "http://localhost:4200",
      "http://localhost:4000",
      "https://oilandgasclub.com",
      "https://www.oilandgasclub.com"
    ]
  }
}
```

```csharp
// In ConfigureServices
var allowedOrigins = Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();

services.AddCors(options =>
{
    options.AddPolicy("AllowAngularSSR",
        builder =>
        {
            builder
                .WithOrigins(allowedOrigins)
                .AllowAnyMethod()
                .AllowAnyHeader()
                .AllowCredentials();
        });
});
```

---

## 🔒 SSL Certificate Configuration (For Local HTTPS)

If you're using `https://localhost:52045/`, you need to handle SSL certificates.

### **Option 1: Use HTTP for Local Development (EASIEST)**

**Backend** (`Properties/launchSettings.json` or `appsettings.json`):
```json
{
  "profiles": {
    "CourseBackend": {
      "applicationUrl": "http://localhost:52045"  // Use HTTP
    }
  }
}
```

**Frontend** (`src/environments/environment.ts`):
```typescript
apiUrl: 'http://localhost:52045/',  // Use HTTP
```

### **Option 2: Trust Development Certificate**

**Generate Development Certificate** (ASP.NET Core):
```bash
dotnet dev-certs https --trust
```

**Backend Configuration** (`Program.cs`):
```csharp
// For development only
if (app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
else
{
    // Production HTTPS configuration
    app.UseHttpsRedirection();
}
```

**Frontend**: No changes needed, browser will trust the certificate after running `dotnet dev-certs https --trust`.

---

## 🧪 Testing CORS Configuration

### **Test with curl**:

```bash
# Test CORS preflight (OPTIONS request)
curl -X OPTIONS http://localhost:52045/page/category \
  -H "Origin: http://localhost:4200" \
  -H "Access-Control-Request-Method: GET" \
  -v

# Expected Response Headers:
# Access-Control-Allow-Origin: http://localhost:4200
# Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
# Access-Control-Allow-Headers: Content-Type, Authorization
```

### **Test with Postman**:

1. Create a new request to `http://localhost:52045/page/category`
2. Add header: `Origin: http://localhost:4200`
3. Send request
4. Check response headers for `Access-Control-Allow-Origin`

---

## 🐛 Common Issues & Solutions

### **Issue 1: CORS Error - "No 'Access-Control-Allow-Origin' header"**

**Cause**: CORS middleware not configured or in wrong order

**Solution**:
1. Ensure `app.UseCors()` is called BEFORE `app.UseAuthentication()` and `app.UseAuthorization()`
2. Verify the origin URL in your Angular app matches exactly what's in CORS policy

### **Issue 2: Preflight (OPTIONS) Request Fails**

**Cause**: CORS policy doesn't allow OPTIONS method

**Solution**: Add `AllowAnyMethod()` to CORS policy (already included in examples above)

### **Issue 3: Credentials Not Working**

**Cause**: Using `AllowCredentials()` but origin uses wildcard or missing

**Solution**: 
- Use specific origins (not `*`)
- Ensure frontend sends `withCredentials: true` in HTTP requests

### **Issue 4: CORS Works in Browser but Not in SSR**

**Cause**: SSR server makes requests from different origin

**Solution**: Add SSR server origin to CORS policy:
```csharp
.WithOrigins(
    "http://localhost:4200",  // Browser
    "http://localhost:4000"   // SSR server
)
```

---

## 📋 Checklist

Before deploying, verify:

- [ ] CORS middleware is in correct order (before auth/authorization)
- [ ] All required origins are added (dev + production)
- [ ] `AllowAnyMethod()` is included
- [ ] `AllowAnyHeader()` is included (or specific headers listed)
- [ ] `AllowCredentials()` is included if using cookies/auth
- [ ] Tested with curl/Postman
- [ ] Tested from Angular dev server
- [ ] Tested from SSR server
- [ ] Production origins are correctly configured
- [ ] No wildcard (`*`) used with `AllowCredentials()`

---

## 🔗 Additional Resources

- [ASP.NET Core CORS Documentation](https://learn.microsoft.com/en-us/aspnet/core/security/cors)
- [Angular HTTP Client](https://angular.io/guide/http)

---

**Last Updated**: Configuration guide for Angular SSR + .NET Core backend integration
