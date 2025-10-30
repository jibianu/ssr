# CDN Configuration Guide - Production Optimization

**Status**: Production-Ready Setup Guide  
**Recommended**: Cloudflare (Free tier available)

---

## 🌐 CDN OVERVIEW

### **What is CDN?**
Content Delivery Network - Edge servers that cache your content globally for faster access.

### **Benefits**:
- ✅ **90-99% reduction** in origin server requests
- ✅ **Global edge locations** (faster worldwide)
- ✅ **DDoS protection**
- ✅ **Bandwidth savings**

---

## 🚀 CLOUDFLARE (RECOMMENDED - FREE TIER)

### **Step 1: Sign Up & Configure**

1. **Sign up**: https://cloudflare.com (free tier available)
2. **Add your domain**
3. **Update DNS**: Point nameservers to Cloudflare
4. **Wait for DNS propagation** (5-30 minutes)

### **Step 2: Configure Caching Rules**

#### **Option A: Dashboard Configuration** (Easiest)

1. Go to **Caching** → **Configuration**
2. Set **Caching Level**: Standard
3. Set **Browser Cache TTL**: Respect Existing Headers
4. Enable **Auto Minify**: HTML, CSS, JS

#### **Option B: Page Rules** (Advanced)

Create rules in **Rules** → **Page Rules**:

**Rule 1: Static Routes (Aggressive Caching)**
- URL Pattern: `*oilandgasclub.com/about-us/*`
- Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 hour
  - Browser Cache TTL: 1 hour

**Rule 2: Dynamic Routes (Smart Caching)**
- URL Pattern: `*oilandgasclub.com/course/*`
- Settings:
  - Cache Level: Standard
  - Edge Cache TTL: 1 minute
  - Browser Cache TTL: Respect Existing Headers

### **Step 3: Cache Headers** (Important)

Your server already sends proper headers:
- `Cache-Control: public, max-age=3600` (static routes)
- `ETag: "..."` (content validation)

Cloudflare will respect these headers automatically.

---

## ☁️ AWS CLOUDFRONT (ALTERNATIVE)

### **Step 1: Create Distribution**

1. **AWS Console** → CloudFront
2. **Create Distribution**
3. **Origin Domain**: Your SSR server domain
4. **Origin Protocol Policy**: HTTPS Only

### **Step 2: Configure Behaviors**

**Default Behavior**:
- Cache Policy: CachingOptimized
- Origin Request Policy: AllViewer
- Response Headers Policy: SecurityHeadersPolicy

**Static Routes Path Pattern**:
- Path Pattern: `/about-us*`, `/contact-us*`, etc.
- Cache Policy: CachingOptimizedForUncompressedObjects
- TTL: Minimum 3600, Maximum 86400

### **Step 3: Cache Invalidation**

```bash
# Invalidate specific paths
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/about-us" "/contact-us"

# Or use AWS Console → Invalidations → Create
```

---

## ⚙️ NGINX REVERSE PROXY (SELF-HOSTED OPTION)

If using Nginx as reverse proxy:

```nginx
# /etc/nginx/sites-available/your-site
server {
    listen 80;
    server_name yourdomain.com;

    # Proxy to Node.js SSR server
    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # ✅ CACHING: Enable proxy caching
        proxy_cache my_cache;
        proxy_cache_valid 200 3600s;    # Cache 200 responses for 1 hour
        proxy_cache_valid 404 300s;    # Cache 404 for 5 minutes
        proxy_cache_use_stale error timeout updating;
        proxy_cache_background_update on;
        
        # Pass cache headers
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_ignore_headers Set-Cookie;  # Only if no user-specific content
    }
    
    # ✅ CACHING: Define cache zone
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g 
                     inactive=60m use_temp_path=off;
}
```

---

## 🔧 CACHE PURGING

### **Cloudflare**:

**Option 1: Dashboard**
- Go to **Caching** → **Configuration** → **Purge Cache**
- Select: Purge Everything or Purge by URL

**Option 2: API** (Automated)
```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  -d '{"files":["https://yourdomain.com/about-us"]}'
```

**Option 3: Integration with Your App**
```typescript
// After content update
await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    files: [`https://yourdomain.com/course/${courseId}`]
  })
});
```

### **AWS CloudFront**:
```bash
aws cloudfront create-invalidation \
  --distribution-id YOUR_DIST_ID \
  --paths "/course/*" "/events/*"
```

---

## 📊 MONITORING CDN PERFORMANCE

### **Cloudflare Analytics**:
- Dashboard → Analytics → Performance
- Monitor: Hit rate, bandwidth saved, response times

### **Key Metrics**:
- **Cache Hit Rate**: Should be 80-95%
- **Bandwidth Saved**: Should be 70-90%
- **Origin Requests**: Should decrease by 80-95%

---

## ⚠️ IMPORTANT CONSIDERATIONS

### **1. User-Specific Content**
**Problem**: CDN may cache user-specific pages  
**Solution**: 
- Use `Vary: Cookie` header (already implemented)
- Don't cache authenticated routes
- Use different cache keys for auth users

### **2. Content Updates**
**Problem**: CDN serves stale content  
**Solution**: 
- Use cache invalidation APIs
- Set appropriate TTL values
- Use ETag/If-None-Match headers (already implemented)

### **3. SEO**
**Problem**: Search engines may get cached content  
**Solution**:
- Crawlers usually bypass CDN cache
- Use `Cache-Control: no-cache` for crawlers
- Or serve fresh content to known crawler user-agents

---

## ✅ VERIFICATION

### **Test CDN Caching**:

```bash
# First request (should hit origin)
curl -I https://yourdomain.com/about-us
# Should see: X-Cache: MISS (Cloudflare) or X-Amz-Cf-Id (CloudFront)

# Second request (should hit CDN)
curl -I https://yourdomain.com/about-us
# Should see: X-Cache: HIT (Cloudflare) or X-Cache: Hit from cloudfront
```

### **Check Cache Headers**:
```bash
curl -I https://yourdomain.com/about-us | grep -i cache
# Should see your Cache-Control headers
```

---

## 🎯 RECOMMENDED SETUP (Quick Start)

1. **Sign up for Cloudflare** (free)
2. **Point DNS** to Cloudflare
3. **Enable "Caching"** in dashboard
4. **Set Auto Minify**: Enable
5. **Done!** Your server headers will be respected

**Time to Setup**: 15-30 minutes  
**Cost**: Free (for basic tier)  
**Impact**: 80-90% reduction in server load

---

**Status**: Production-ready configuration guide  
**Priority**: High (for production deployments)

