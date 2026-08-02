# داده‌های همراه بسته

این پوشه یک Snapshot قابل‌انتقال از داده‌هایی است که بدون دسترسی به حساب مدیریتی قابل دریافت بود.

- `content.json`: پاسخ `/api/content`
- `customizations.json`: پاسخ `/api/customizations`
- `notifications.json`: پاسخ `/api/notifications`
- `r2/`: نسخه محلی فایل‌های R2 که در `customizations.json` استفاده شده‌اند
- `uploads-map.json`: نگاشت URLهای فعلی به فایل‌های محلی
- `seed-d1.sql`: Seed حداقلی برای جدول محتوای هندبوک

فایل `seed-d1.sql` حساب کاربری، رمز، مجوز یا Session ایجاد نمی‌کند. این تصمیم هم برای امنیت است و هم به این دلیل که API عمومی چنین داده‌ای ارائه نمی‌کند.
