# GloryTech Academy LMS

منصة LMS عربية RTL مبنية بـ React وSupabase. النسخة الحالية تضم كورسين مجانيين، مع DevOps Bootcamp وCCNP Enterprise بحالة «قريباً»، بينما الفهرس وقاعدة البيانات مصممان لإضافة المزيد من دون تعديل هيكل الواجهة.

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

عند فتح الحساب تُحفظ الحقول الإلزامية `display_name` و`phone`، إضافة إلى `affiliation` الاختياري، تلقائياً داخل `profiles` بواسطة Trigger في قاعدة البيانات.

الإرسال العام من مشروع Supabase مجاني جديد يحتاج SMTP مخصصاً؛ يمكن ربط خطة مجانية من Resend أو Brevo. مزوّد Supabase الافتراضي مخصص للتجربة ولا يصلح لإرسال رموز الدخول لكل الطلاب.

## الفيديو عبر Telegram

ضع اسم القناة العامة في `VITE_TELEGRAM_CHANNEL`، ثم خزّن رقم رسالة الفيديو في `lessons.telegram_message_id`. ستعرض المنصة منشور Telegram داخل صفحة الدرس.

- القناة العامة مناسبة للكورسات المجانية، لكنها ليست حماية خاصة للفيديو.
- لا تضع Bot Token في المتصفح أو قاعدة بيانات قابلة للقراءة من العميل.
- إذا أصبحت الدروس مدفوعة أو خاصة، استخدم HLS/CDN بروابط موقعة واجعل Telegram أرشيفاً أو قناة رفع فقط.

## إضافة كورس جديد أو إطلاق كورس قادم

أضف سجلاً منشوراً إلى `courses` بحالة `coming_soon` ليظهر كبطاقة غير قابلة للفتح. عند اكتمال المحتوى أضف الوحدات والدروس، ثم غيّر `availability_status` إلى `available`. لوحة الطالب وسياسات RLS لا تعرضان محتوى الكورس قبل إطلاقه.

## التحقق

```bash
npm run build
supabase start
supabase db lint --local --schema public,private --fail-on error
supabase stop
```
