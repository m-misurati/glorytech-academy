# النشر على استضافة LibyanSpider (Godzilla / cPanel)

## اقرأ هذا أولاً — نقطة مهمة

استضافة cPanel تقدّم **ملفات ثابتة فقط** (HTML/CSS/JS). المنصة فيها جزءان:

| الجزء | أين يعمل | هل يعمل على cPanel؟ |
| --- | --- | --- |
| الواجهة (React) | متصفح الطالب | ✅ نعم |
| Supabase (الحسابات وقاعدة البيانات) | خوادم Supabase | ✅ نعم، لا علاقة له بالاستضافة |
| **Cloudflare Worker** (`/api/lessons/.../playback` و`/api/stream/...`) | Cloudflare | ❌ **لا يعمل على cPanel** |

الـ Worker هو الذي يخفي روابط Google Drive ويوقّع روابط التشغيل المؤقتة. بدونه **لن تشتغل المقاطع**.

لذلك أمامك خياران:

---

## الخيار الأول (الموصى به): Cloudflare Pages + الدومين من LibyanSpider

تحتفظ بالدومين عند LibyanSpider وتوجّهه إلى Cloudflare. هكذا يعمل كل شيء، والاستضافة مجانية للحجم الحالي.

1. سجّل في [cloudflare.com](https://cloudflare.com) (الخطة المجانية تكفي).
2. من لوحة LibyanSpider غيّر **Nameservers** للدومين إلى الاثنين اللذين يعطيك إياهما Cloudflare.
3. من جهازك داخل مجلد المشروع:

   ```powershell
   npm run build
   npx wrangler login
   npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   npx wrangler secret put STREAM_SIGNING_SECRET
   npx wrangler deploy
   ```

4. من لوحة Cloudflare اربط الدومين بالـ Worker (Workers & Pages → اختر الـ Worker → Settings → Domains & Routes → Add custom domain).

بهذا تحصل على: شهادة SSL مجانية، CDN عالمي (سرعة أفضل للطلاب داخل ليبيا وخارجها)، وحماية DDoS.

---

## الخيار الثاني: رفع الواجهة على cPanel والإبقاء على الـ Worker في Cloudflare

إذا أردت الموقع على استضافتك الحالية، ترفع الواجهة على cPanel وتترك الـ Worker على Cloudflare كـ API منفصل.

### 1. ابنِ الملفات

```powershell
npm run build
```

تُنتَج الملفات في مجلد `dist/client`.

### 2. ارفعها عبر File Manager

1. افتح **cPanel → File Manager**.
2. ادخل مجلد `public_html`.
3. احذف `default.html` أو أي ملف افتراضي موجود.
4. اضغط **Upload** وارفع **محتويات** `dist/client` (وليس المجلد نفسه): `index.html` ومجلد `assets` وبقية الملفات.

   > الأسرع: اضغط محتويات `dist/client` في ملف `zip` واحد، ارفعه، ثم **Extract** داخل `public_html` واحذف ملف الـ zip.

### 3. ملف `.htaccess` — خطوة إلزامية

المنصة تستخدم توجيهاً داخلياً (React Router). بدون هذا الملف أي رابط غير الصفحة الرئيسية مثل `/teach` أو `/courses/ccna1-...` سيعطي **404**.

أنشئ ملفاً باسم `.htaccess` داخل `public_html` بهذا المحتوى:

```apache
# توجيه كل المسارات إلى index.html ليتكفّل React Router بالباقي
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

# ضغط الملفات النصية
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css text/javascript application/javascript application/json image/svg+xml
</IfModule>

# تخزين مؤقت طويل للأصول (أسماؤها تحمل بصمة، فتتغيّر تلقائياً عند كل إصدار)
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType font/woff2 "access plus 1 year"
  # الصفحة نفسها لا تُخزَّن حتى يصل التحديث فوراً
  ExpiresByType text/html "access plus 0 seconds"
</IfModule>

# فرض HTTPS
<IfModule mod_rewrite.c>
  RewriteCond %{HTTPS} off
  RewriteRule ^(.*)$ https://%{HTTP_HOST}/$1 [R=301,L]
</IfModule>
```

> ملاحظة: File Manager يخفي الملفات التي تبدأ بنقطة. فعّل **Settings → Show Hidden Files (dotfiles)**.

### 4. انشر الـ Worker على Cloudflare

```powershell
npx wrangler deploy
```

ثم اربطه بنطاق فرعي، مثل `api.glorytecho.ly`، من لوحة Cloudflare.

### 5. اضبط الواجهة لتنادي الـ API

أنشئ ملف `.env` قبل البناء:

```
VITE_SUPABASE_URL=https://icmzrmzwomnnjojzaafq.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_SITE_URL=https://glorytecho.ly
VITE_CONTACT_EMAIL=info@glorytecho.ly
VITE_API_BASE=https://api.glorytecho.ly
```

ثم أعد `npm run build` وارفع الملفات من جديد.

### 6. فعّل SSL

من cPanel → **SSL/TLS Status** → اختر الدومين → **Run AutoSSL**.

---

## أيهما تختار؟

| | Cloudflare Pages | cPanel + Worker |
| --- | --- | --- |
| الإعداد | أبسط، أمر واحد | رفع يدوي كل مرة |
| السرعة | CDN عالمي | خادم واحد |
| التحديث | `wrangler deploy` | إعادة رفع الملفات |
| التكلفة | مجاني | مدفوع (عندك بالفعل) |

**التوصية:** الخيار الأول. استضافة Godzilla تبقى مفيدة لاستضافة البريد `info@glorytecho.ly` ولأي أدوات جانبية.

---

## بعد كل تحديث للموقع

```powershell
npm run build
```

ثم ارفع محتويات `dist/client` من جديد (أو `npx wrangler deploy` في الخيار الأول).
