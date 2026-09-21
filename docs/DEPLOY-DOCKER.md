# النشر عبر Docker على Render (الخطة المجانية)

## كيف تتوزّع الأجزاء

```
                    academy.glorytech.ly
                  (CNAME → Render، شهادة مجانية)
                             │
                             ▼
            ┌────────────────────────────────┐
            │  Render · Docker · free        │
            │  node:22-alpine                │
            │   • ملفات الموقع المبنية        │
            │   • توجيه مسارات React          │
            │   • حقن الإعدادات وقت التشغيل    │
            │   • /healthz                   │
            └────────────────────────────────┘
                             │
           المتصفح ينادي ─────┼──────────────┐
                             ▼              ▼
                ┌────────────────┐  ┌──────────────────────┐
                │ Supabase       │  │ Cloudflare Worker    │
                │ حسابات وبيانات  │  │ /api/… تشغيل المقاطع │
                └────────────────┘  │ تخزين مؤقت 4 ميجا    │
                                    └──────────┬───────────┘
                                               ▼
                                        Google Drive
```

**المقاطع لا تمرّ عبر الحاوية.** السبب: الخطة المجانية في Render بلا قرص دائم، و512 ميجا رام، و0.1 معالج، والنقل الصادر محسوب — ومشاهدة واحدة كاملة لـ CCNA 1 تساوي **5.2 جيجابايت**. الـ Worker على Cloudflare يخدمها بتخزين مؤقت على الحافة وبنقل غير محسوب.

## ما يحتويه المستودع

| الملف | الدور |
| --- | --- |
| `Dockerfile` | بناء على Debian (يحتاجه workerd)، وتشغيل على Alpine بمستخدم غير جذر |
| `.dockerignore` | يمنع `node_modules` و`.env` و`.dev.vars` من دخول الصورة |
| `docker-compose.yml` | تشغيل محلي على `http://localhost:8080` |
| `render.yaml` | مخطط Render جاهز |
| `server/index.js` | الخادم داخل الحاوية |

## الإعدادات وقت التشغيل

الصورة **لا تحتوي أي مفاتيح**. الخادم يحقن القيم في `index.html` عند الإقلاع من متغيرات البيئة:

| المتغير | مثال |
| --- | --- |
| `SUPABASE_URL` | `https://icmzrmzwomnnjojzaafq.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` |
| `API_BASE` | `https://glorytech-academy.XXXX.workers.dev` |
| `CONTACT_EMAIL` | `info@glorytech.ly` |
| `PORT` | يضبطه Render تلقائياً |

يعني: **صورة واحدة** تصلح للتجربة والإنتاج، وتغيير أي قيمة = إعادة تشغيل بثوانٍ، لا إعادة بناء.

> `SUPABASE_SERVICE_ROLE_KEY` و`STREAM_SIGNING_SECRET` تبقى على الـ Worker فقط ولا تدخل الحاوية أبداً.

## تجربة محلية

```powershell
docker compose up --build
```

ثم افتح `http://localhost:8080`. يقرأ القيم من ملف `.env` عندك.

بدون Docker:

```powershell
npm run build
$env:SUPABASE_URL="https://icmzrmzwomnnjojzaafq.supabase.co"
$env:SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
$env:API_BASE="https://glorytech-academy.XXXX.workers.dev"
npm start
```

## النشر على Render

1. **ارفع المستودع** إلى GitHub (`git push`).
2. انشر الـ Worker أولاً واحفظ عنوانه:
   ```powershell
   npx wrangler deploy
   ```
3. Render ← **New** ← **Blueprint** ← اختر المستودع. يقرأ `render.yaml` تلقائياً.
4. أدخل قيمة `API_BASE` (عنوان الـ Worker) عند الطلب.
5. انتظر أول بناء (3–5 دقائق).
6. Settings ← **Custom Domain** ← `academy.glorytech.ly` ← أضف سجل CNAME الذي يعطيك إياه Render في لوحة LibyanSpider.
7. عدّل `ALLOWED_ORIGINS` في `wrangler.jsonc` إلى `https://academy.glorytech.ly` ثم `npx wrangler deploy`.
8. Supabase ← Authentication ← URL Configuration ← Site URL = `https://academy.glorytech.ly`.

## حدود الخطة المجانية

| الحد | الأثر عليك |
| --- | --- |
| توقّف بعد 15 دقيقة خمول | أول زائر بعد الخمول ينتظر ~دقيقة |
| 750 ساعة تشغيل شهرياً | التشغيل المستمر = 730 ساعة، يكفي بالكاد |
| 512 ميجا رام · 0.1 معالج | كافٍ لملفات ثابتة، غير كافٍ للفيديو |
| لا قرص دائم | لا تخزين مؤقت للفيديو — سبب إبقائه على Cloudflare |
| نقل صادر محسوب | تجاوزه بلا بطاقة = إيقاف الخدمات |

**للتخلّص من التوقّف:** نداء كل 10 دقائق من خدمة مراقبة مجانية يبقيها مستيقظة ضمن الـ 750 ساعة.

## نقل الصورة لأي مكان آخر

نفس الصورة تعمل على VPS بأمر واحد:

```bash
docker run -d -p 80:8080 \
  -e SUPABASE_URL=... -e SUPABASE_PUBLISHABLE_KEY=... -e API_BASE=... \
  --restart unless-stopped glorytech-academy
```

وهذا هو المكسب الحقيقي من الحاويات: لست مربوطاً بـ Render.
