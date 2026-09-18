# دليل النشر — من الجهاز إلى الإنترنت

خطوات نشر GloryTech Academy على Cloudflare. نفّذها بالترتيب.

---

## 1) قبل النشر

- [ ] دومين جاهز (مثل `glorytech.ly`) مضاف إلى حساب Cloudflare.
- [ ] الفيديوهات مرفوعة على Google Drive ومشاركتها «أي شخص لديه الرابط»، ومربوطة بالدروس من بوابة المدرّب.
- [ ] ملفات قاعدة البيانات مشغّلة على Supabase (schema.sql أو ملفات الترحيل).
- [ ] **مفتاح خدمة جديد** من Supabase (تدوير المفتاح القديم لأنه استُخدم أثناء التطوير).

## 2) متغيّرات الواجهة

في ملف `.env` (يُقرأ وقت البناء):

```env
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_SITE_URL=https://glorytech.ly
VITE_CONTACT_EMAIL=
VITE_TELEGRAM_CHANNEL=
```

`VITE_SITE_URL` مهم: منه يُبنى `sitemap.xml` تلقائياً عند كل `npm run build`.

## 3) أسرار الخادم (Worker)

القيم العامة موجودة في [wrangler.jsonc](../wrangler.jsonc) ضمن `vars`. الأسرار تُضاف بأوامر:

```bash
npx wrangler secret put STREAM_SIGNING_SECRET
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

- `STREAM_SIGNING_SECRET`: نص عشوائي طويل يوقّع روابط الفيديو. ولّده بـ:
  `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`
- `SUPABASE_SERVICE_ROLE_KEY`: مفتاح الخدمة من Supabase. **لا يوضع في `.env` أبداً.**

> إذا غيّرت `STREAM_SIGNING_SECRET` فروابط الفيديو المفتوحة حالياً تتوقف، ويحتاج الطلاب إلى تحديث الصفحة فقط.

## 4) النشر

```bash
npm ci
npm run build      # يولّد robots.txt و sitemap.xml ثم يبني الموقع
npx wrangler deploy
```

ثم من لوحة Cloudflare: **Workers & Pages ← glorytech-academy ← Settings ← Domains** وأضف دومينك.

## 5) إعدادات Supabase للإنتاج

**Authentication ← URL Configuration:**
- Site URL: `https://glorytech.ly`
- Redirect URLs: `https://glorytech.ly/**`

**Authentication ← Emails:**
- SMTP خاص (استضافتك أو Resend). بدونه لن تصل رموز الدخول إلا لعدد قليل جداً في الساعة.
- الصق قالبَي الإيميل من `supabase/templates/` مع عناوينهما من `supabase/config.toml`.

**Authentication ← Providers ← Email:**
- Email OTP Expiration: 600 ثانية (10 دقائق).
- Email OTP Length: 6.

**Storage:** أنشئ bucket عاماً باسم `brand` وارفع فيه `supabase/templates/assets/glorytech-mark.png` ليظهر الشعار في الإيميل.

## 6) بعد النشر: قائمة فحص

- [ ] فتح الصفحة الرئيسية بالعربي والإنجليزي، والوضع الفاتح والداكن.
- [ ] تسجيل حساب جديد ووصول الرمز إلى البريد.
- [ ] تشغيل درس المعاينة، ثم التسجيل في كورس وتشغيل درس مقفل.
- [ ] تحميل مرفق من صفحة الدرس.
- [ ] دخول لوحة المدرّب ولوحة الإدارة.
- [ ] فتح الموقع من هاتف على شبكة موبايل.
- [ ] `https://glorytech.ly/robots.txt` و`sitemap.xml` يعملان.

## 7) الصيانة الدورية

| المهمة | الدورية |
|---|---|
| نسخة احتياطية من قاعدة البيانات | أسبوعياً |
| مراجعة سجلات الأخطاء في Cloudflare (Observability مفعّل) | أسبوعياً |
| `npm run test:db` بعد أي تعديل على قاعدة البيانات | عند كل تعديل |
| تحديث الحزم `npm outdated` | شهرياً |
| مراجعة الأرباح والتحويلات في لوحة الإدارة | شهرياً |

## 8) أوامر سريعة

```bash
npm run dev          # تشغيل محلي
npm run build        # بناء + توليد ملفات SEO
npm run test:db      # اختبار قاعدة البيانات والصلاحيات محلياً
npx wrangler tail    # متابعة سجلات الخادم المباشرة بعد النشر
```
