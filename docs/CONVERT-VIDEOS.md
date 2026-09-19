# تجهيز مقاطع المحاضرات

## المتطلبات

| الخاصية | المطلوب | لماذا |
| --- | --- | --- |
| الترميز | **H.264 (AVC)** | يعمل في كل المتصفحات. H.265/HEVC يعطي صوتاً بلا صورة على Chrome وFirefox في ويندوز |
| الصوت | AAC | مدعوم في كل مكان |
| الحاوية | MP4 | |
| الدقة | 1080p | الشرائح والشاشة تحتاج وضوح النص؛ 720p يجعل الكتابة صعبة القراءة |
| `faststart` | **مفعّل** | بيانات الفهرسة في أول الملف، فيبدأ التشغيل فوراً |

مقاطع CCNA 1 وCCNA 4 الحالية فحصناها: **H.264 و1080p بمعدل 0.4–0.7 ميجابت/ث** — ممتاز. الناقص فقط `faststart`.

---

## تفعيل faststart (بدون إعادة ترميز)

هذه ليست إعادة ترميز — مجرد نسخ للملف مع نقل الفهرسة لأوله. **ثوانٍ لكل ملف، بلا أي فقد في الجودة.**

### 1. ثبّت ffmpeg مرة واحدة

افتح **PowerShell** (من قائمة ابدأ اكتب `PowerShell`) ونفّذ:

```powershell
winget install Gyan.FFmpeg
```

بعد انتهاء التثبيت **أغلق PowerShell وافتحه من جديد** حتى يتعرّف على الأمر. تأكد:

```powershell
ffmpeg -version
```

### 2. ادخل مجلد المقاطع

إذا كانت المقاطع مثلاً في `D:\Videos\CCNA1`:

```powershell
cd "D:\Videos\CCNA1"
```

> أسهل طريقة: افتح المجلد في File Explorer، اضغط على شريط العنوان في الأعلى، اكتب `powershell` واضغط Enter — يفتح PowerShell داخل المجلد مباشرة.

### 3. حوّل كل المقاطع دفعة واحدة

انسخ هذا كاملاً والصقه في PowerShell:

```powershell
New-Item -ItemType Directory -Force faststart | Out-Null
Get-ChildItem *.mp4 | ForEach-Object {
  ffmpeg -y -loglevel error -i $_.FullName -c copy -movflags +faststart "faststart\$($_.Name)"
  Write-Host "done: $($_.Name)"
}
```

تظهر الملفات الجاهزة في مجلد `faststart` بنفس الأسماء.

### 4. ارفعها على Google Drive

1. ارفع الملفات من مجلد `faststart` إلى مجلد الكورس على Drive.
2. تأكد أن المشاركة **Anyone with the link**.
3. أرسل رابط المجلد، ونحدّث المعرّفات في ملف الترحيل.

---

## إذا كان المقطع H.265 أصلاً

تحتاج إعادة ترميز فعلية (أبطأ، دقائق لكل ملف):

```powershell
New-Item -ItemType Directory -Force h264 | Out-Null
Get-ChildItem *.mp4 | ForEach-Object {
  ffmpeg -y -loglevel error -i $_.FullName -c:v libx264 -preset medium -crf 23 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart "h264\$($_.Name)"
  Write-Host "done: $($_.Name)"
}
```

أو عبر **HandBrake**: Preset `Fast 1080p30`، وفعّل **Web Optimized**، وتأكد أن `Video Encoder = H.264 (x264)`.

## كيف تتأكد من ملف

```powershell
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height -of csv=p=0 "الملف.mp4"
```

المطلوب: `h264,1920,1080`

---

## للتسجيلات القادمة

اضبط OBS أو Camtasia على: **H.264 · MP4 · AAC** وفعّل خيار **Fast Start / Web Optimized** إن وُجد — فلا تحتاج أي خطوة تحويل.
