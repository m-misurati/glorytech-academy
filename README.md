# GloryTech Academy LMS

منصة LMS عربية RTL مبنية بـ React وSupabase. النسخة الحالية تبدأ بكورسين مجانيين، بينما الفهرس وقاعدة البيانات مصممان لإضافة كورسات جديدة من دون تعديل هيكل الواجهة.

## التشغيل المحلي

```bash
npm install
cp .env.example .env
npm run dev
```

## إعداد Supabase

1. أنشئ مشروع Supabase مخصصاً للمنصة.
2. طبّق ملف الهجرة الموجود في `supabase/migrations/` بواسطة Supabase CLI أو SQL Editor.
3. ضع رابط المشروع و`Publishable key` فقط في `.env`. لا تضع `service_role` أو أي مفتاح سري في تطبيق الويب.
4. في قالب رسالة تسجيل الدخول استخدم `{{ .Token }}` لإرسال رمز OTP من ستة أرقام.
5. اضبط Site URL وRedirect URLs على نطاق المنصة.

الإرسال العام من مشروع Supabase مجاني جديد يحتاج SMTP مخصصاً؛ يمكن ربط خطة مجانية من Resend أو Brevo. مزوّد Supabase الافتراضي مخصص للتجربة ولا يصلح لإرسال رموز الدخول لكل الطلاب.

## الفيديو عبر Telegram

ضع اسم القناة العامة في `VITE_TELEGRAM_CHANNEL`، ثم خزّن رقم رسالة الفيديو في `lessons.telegram_message_id`. ستعرض المنصة منشور Telegram داخل صفحة الدرس.

- القناة العامة مناسبة للكورسات المجانية، لكنها ليست حماية خاصة للفيديو.
- لا تضع Bot Token في المتصفح أو قاعدة بيانات قابلة للقراءة من العميل.
- إذا أصبحت الدروس مدفوعة أو خاصة، استخدم HLS/CDN بروابط موقعة واجعل Telegram أرشيفاً أو قناة رفع فقط.

## إضافة كورس ثالث مستقبلاً

أضف سجلاً منشوراً إلى `courses` ثم وحداته في `modules` ودروسه في `lessons`. الواجهة ولوحة الطالب تقرآن الفهرس ديناميكياً وتعرضانه تلقائياً حسب `position`.

## التحقق

```bash
npm run build
supabase start
supabase db lint --local --schema public,private --fail-on error
supabase stop
```
