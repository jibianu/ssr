# Sitemap validation summary

- Sitemap: `https://oilandgasclub.com/sitemap.xml`
- Canonical origin: `https://oilandgasclub.com`
- Loc count: **344**
- Duplicate locs: **2**
- Deep GET checked: **40**
- Problems: **10**

## Live host checks (run separately)

```bash
curl -sI https://www.oilandgasclub.com/sitemap.xml
# Expect: 301 Location: https://oilandgasclub.com/sitemap.xml

curl -sI https://oilandgasclub.com/sitemap.xml
# Expect: 200 application/xml
```

## Failures

- `https://oilandgasclub.com/Check-Valves` — uppercase characters in path
- `https://oilandgasclub.com/equipment-and-Piping-layout-questions` — uppercase characters in path
- `https://oilandgasclub.com/history-of-energy-and-oil-Industry` — uppercase characters in path
- `https://oilandgasclub.com/%C3%AF%C2%BB%C2%BFcomprehensive-guide-to-preparing-for-the-api-571` — uppercase characters in path
- `https://oilandgasclub.com/%C3%AF%C2%BB%C2%BF%C3%AF%C2%BB%C2%BF%C3%AF%C2%BB%C2%BF%C3%AF%C2%BB%C2%BF%C3%AF%C2%BB%C2%BFmastering-the-api-577` — uppercase characters in path
- `https://oilandgasclub.com/mastering-microStation-your-gateway-to-advanced-design-and-drafting` — uppercase characters in path
- `https://oilandgasclub.com/pmp-exam-Study-guide-your-ultimate-path-to-certification-success` — uppercase characters in path
- `https://oilandgasclub.com/api-570-si-examination-excellence-certified-professional-achievement` — duplicate <loc> in sitemap
- `https://oilandgasclub.com/bgas-question-and-answers` — duplicate <loc> in sitemap
- `https://oilandgasclub.com/courses` — missing H1


