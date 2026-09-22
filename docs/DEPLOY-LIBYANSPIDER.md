# إطلاق المنصة على academy.glorytech.ly

استضافة Godzilla من LibyanSpider مع cPanel، والدومين `glorytech.ly`.

## الفكرة في سطرين

استضافة cPanel تقدّم **ملفات ثابتة فقط**. المنصة فيها جزء لا يعمل عليها: **Cloudflare Worker** الذي يخفي روابط Google Drive ويوقّع روابط التشغيل. بدونه لن تشتغل المقاطع.

الحل: الموقع على استضافتك، والـ Worker على Cloudflare بعنوانه المجاني `workers.dev` — **بدون أي تغيير في إعدادات الدومين**.

| الجزء | أين | العنوان |
| --- | --- | --- |
| الموقع | cPanel على Godzilla | `https://academy.glorytech.ly` |
| تشغيل المقاطع (Worker) | Cloudflare (مجاني) | `https://glorytech-academy.<حسابك>.workers.dev` |
| الحسابات وقاعدة البيانات | Supabase | كما هي |

---

## الخطوة 1 — أنشئ الدومين الفرعي في cPanel

1. cPanel ← **Domains** ← **Create A New Domain**.
2. Domain: `academy.glorytech.ly`
3. أزل علامة **Share document root**، واجعل المسار: `public_html/academy`
4. **Submit**.

> إذا كانت نسخة cPanel قديمة استخدم **Subdomains** بدل Domains: Subdomain = `academy`، Domain = `glorytech.ly`.

## الخطوة 2 — انشر الـ Worker على Cloudflare

سجّل في [cloudflare.com](https://dash.cloudflare.com/sign-up) (الخطة المجانية تكفي)، ثم من PowerShell داخل مجلد المشروع:

```powershell
npx wrangler login
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put STREAM_SIGNING_SECRET
npx wrangler deploy
```

- `SUPABASE_SERVICE_ROLE_KEY`: من Supabase ← Project Settings ← API.
- `STREAM_SIGNING_SECRET`: نص عشوائي طويل تخترعه أنت، مثلاً من:
  ```powershell
  -join ((48..57) + (97..122) | Get-Random -Count 48 | ForEach-Object { [char]$_ })
  ```

في آخر مخرجات `deploy` سيظهر العنوان:

```
https://glorytech-academy.XXXX.workers.dev
```

**احفظه** — تحتاجه في الخطوة التالية.

> ملف `wrangler.jsonc` يسمح بالطلبات من `https://academy.glorytech.ly` فقط. لو غيّرت الدومين لاحقاً، عدّل `ALLOWED_ORIGINS` فيه وأعد `npx wrangler deploy`.

## الخطوة 3 — جهّز ملف الرفع

أنشئ ملف `.env` في جذر المشروع:

```
VITE_SUPABASE_URL=https://icmzrmzwomnnjojzaafq.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xYS9uFaMfZjjF7kZFgXEIQ_N1IYBggy
VITE_SITE_URL=https://academy.glorytech.ly
VITE_CONTACT_EMAIL=info@academy.glorytech.ly
VITE_API_BASE=https://glorytech-academy.XXXX.workers.dev
```

ثم:

```powershell
npm run package:cpanel
```

يُنتج **`glorytech-site.zip`** في جذر المشروع، ويتحقق قبلها من أن `VITE_API_BASE` موجود وأن ملف `.htaccess` بداخله.

## الخطوة 4 — ارفع الملف

1. cPanel ← **File Manager** ← ادخل `public_html/academy`.
2. **Settings** ← فعّل **Show Hidden Files (dotfiles)** — مهم ليظهر `.htaccess`.
3. احذف أي ملف افتراضي موجود (`default.html` أو `index.html`).
4. **Upload** ← اختر `glorytech-site.zip`.
5. بعد الرفع: كليك يمين على الملف ← **Extract** ← داخل نفس المجلد.
6. احذف ملف الـ zip بعد فك الضغط.

يجب أن ترى: `index.html` و`.htaccess` ومجلد `assets`.

## الخطوة 5 — فعّل HTTPS

cPanel ← **SSL/TLS Status** ← اختر `academy.glorytech.ly` ← **Run AutoSSL**. انتظر دقائق حتى تظهر علامة صحيحة.

## الخطوة 6 — اضبط Supabase

Supabase ← **Authentication** ← **URL Configuration**:

- **Site URL**: `https://academy.glorytech.ly`
- **Redirect URLs**: أضف `https://academy.glorytech.ly/**`

ومن **Authentication ← Emails** الصق قالب `supabase/templates/magic_link.html`.

---

## تحقّق بعد الإطلاق

1. افتح `https://academy.glorytech.ly` — تفتح الصفحة الرئيسية.
2. افتح `https://academy.glorytech.ly/teach` مباشرة (اكتبه في شريط العنوان) — **يجب أن تفتح، لا 404**. لو ظهر 404 فملف `.htaccess` غير مرفوع.
3. سجّل حساباً جديداً وتأكد من وصول رمز الدخول.
4. افتح محاضرة وشغّلها — لو بقيت سوداء، افتح **F12 ← Console** وابحث عن خطأ CORS، فهذا يعني أن `ALLOWED_ORIGINS` لا يطابق الدومين.

## عند كل تحديث للموقع

```powershell
npm run package:cpanel
```

ثم ارفع الـ zip من جديد وفك ضغطه فوق القديم. إذا تغيّر شيء في مجلد `worker/`، نفّذ أيضاً `npx wrangler deploy`.

---

## ملاحظات

- **البريد**: استضافة Godzilla تصلح لاستضافة `info@academy.glorytech.ly` من cPanel ← Email Accounts.
- **سرعة المقاطع**: الـ Worker يخزّن أجزاء الفيديو على شبكة Cloudflare، فتُفتح المحاضرة فوراً بعد أول مشاهدة. المشاهدة الأولى لكل محاضرة تبقى محكومة بسرعة Google Drive. الحل الجذري نقل المقاطع إلى **Cloudflare R2** (أول 10 جيجا مجاناً، ومقاطعك الحالية حوالي 8 جيجا).
- **بديل أبسط مستقبلاً**: نقل الدومين كاملاً إلى Cloudflare DNS ونشر الموقع والـ Worker معاً بأمر `npx wrangler deploy` واحد، فتستغني عن الرفع اليدوي. تبقى استضافة Godzilla للبريد.
