# إعداد Google OAuth 2.0 لمشروع HomeyChef

## الخطوات المطلوبة:

### 1. إنشاء مشروع Google OAuth

1. اذهب إلى [Google Cloud Console](https://console.cloud.google.com/)
2. أنشئ مشروع جديد أو اختر مشروع موجود
3. اذهب إلى **APIs & Services** > **Credentials**
4. اضغط على **Create Credentials** > **OAuth client ID**
5. اختر **Web application**
6. أضف **Authorized JavaScript origins**:
   - `http://localhost:3000`
   - `http://localhost:3001` (إذا كنت تستخدم port مختلف)
   - ⚠️ **مهم جداً**: تأكد من إضافة البورت الصحيح الذي تستخدمه!
7. أضف **Authorized redirect URIs**:
   - `http://localhost:3000`
   - `http://localhost:3000/login.html`
   - `http://localhost:3001` (إذا كنت تستخدم port مختلف)
   - `http://localhost:3001/login.html` (إذا كنت تستخدم port مختلف)
8. انسخ **Client ID** و **Client Secret**

### 2. إعداد متغيرات البيئة

افتح ملف `backend/.env` وأضف:

```env
GOOGLE_CLIENT_ID=your-google-client-id-here
JWT_SECRET=your-secret-key-here
```

### 3. تحديث Google Client ID في Frontend

افتح ملف `backend/views/js/social-auth.js` وتأكد من أن `googleClientId` يحتوي على Client ID الصحيح:

```javascript
this.googleClientId = 'your-google-client-id-here';
```

أو يمكنك استخدام متغير البيئة إذا كنت تستخدم bundler.

### 4. تشغيل المشروع

1. تأكد من أن MySQL يعمل
2. شغّل السيرفر:
   ```bash
   cd backend
   npm start
   ```
3. افتح `http://localhost:3000/login.html`
4. اضغط على زر "Google" لتسجيل الدخول

## ملاحظات مهمة:

- تأكد من أن Google Client ID في `.env` يطابق Client ID في `social-auth.js`
- في بيئة الإنتاج، استخدم HTTPS
- أضف جميع النطاقات المسموح بها في Google Cloud Console
- تأكد من أن JWT_SECRET قوي وآمن

## استكشاف الأخطاء:

### الخطأ: "Google Sign-In service not loaded"
- تأكد من أن الإنترنت متصل
- تحقق من أن Google OAuth script يتم تحميله بشكل صحيح

### الخطأ: "Invalid client" أو "The given origin is not allowed"
- ⚠️ **هذا هو الخطأ الأكثر شيوعاً!**
- تأكد من أن Client ID صحيح في `.env` و `social-auth.js`
- **تأكد من إضافة Origin الصحيح في Google Cloud Console:**
  1. اذهب إلى Google Cloud Console > APIs & Services > Credentials
  2. اضغط على OAuth 2.0 Client ID الخاص بك
  3. في قسم "Authorized JavaScript origins"، أضف:
     - `http://localhost:3000` (إذا كنت تستخدم port 3000)
     - `http://localhost:3001` (إذا كنت تستخدم port 3001)
  4. اضغط "Save"
  5. **انتظر دقيقة أو دقيقتين** حتى يتم تحديث الإعدادات
  6. أعد تحميل الصفحة وجرب مرة أخرى

### الخطأ: "Google authentication failed" أو "Unknown column 'googleId'"
- **إذا ظهر "Unknown column 'googleId'"**: 
  ```bash
  cd backend
  node init.js
  ```
  هذا سيحدث قاعدة البيانات ويضيف الحقول المطلوبة

### الخطأ: "Unknown column 'googleId' in 'field list'"
- هذا يعني أن قاعدة البيانات لم يتم تحديثها بعد
- شغّل الأمر التالي لتحديث قاعدة البيانات:
  ```bash
  cd backend
  node init.js
  ```
- تأكد من أن السيرفر يعمل على Port الصحيح (3000 أو 3001)
- تأكد من أن route `/api/auth/google` موجود ويعمل

