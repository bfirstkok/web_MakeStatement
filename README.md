# Web MakeStatement (Expense Tracker)

แอปบันทึกรายรับ-รายจ่ายด้วย React + Tailwind พร้อมระบบล็อกอินด้วย Google (Firebase Auth) และหน้า Dashboard สรุปยอด

## ฟีเจอร์หลัก

- Login ด้วย Google (Firebase Authentication)
- แท็บ Dashboard: สรุปยอดรวม/กราฟ/รายการล่าสุด
- แท็บ จัดการรายการ: เพิ่ม/ลบ รายการรายรับ-รายจ่าย พร้อมแนบรูปหลักฐาน (เก็บเป็น base64)
- เก็บข้อมูลรายการลง Local Storage ของเครื่อง (ยังไม่ได้ sync ข้ามเครื่อง)

## การติดตั้งและรันในเครื่อง (Local)

### Prerequisites

- Node.js (แนะนำ LTS)
- npm

### Install

```bash
npm install
```

### ตั้งค่า Firebase (สำคัญ)

โปรเจกต์อ่านค่า config จาก Environment Variables (`REACT_APP_FIREBASE_*`) ในไฟล์ [src/firebase.js](src/firebase.js)

1) สร้างไฟล์ `.env.local` ที่ root ของโปรเจกต์ (ไฟล์นี้ถูก ignore แล้ว ไม่ขึ้น Git)

2) ใส่ค่าตามโปรเจกต์ Firebase ของคุณ เช่น

```bash
REACT_APP_FIREBASE_API_KEY=xxxxx
REACT_APP_FIREBASE_AUTH_DOMAIN=xxxxx.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=xxxxx
REACT_APP_FIREBASE_STORAGE_BUCKET=xxxxx.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=xxxxx
REACT_APP_FIREBASE_APP_ID=1:xxxx:web:xxxx
REACT_APP_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

หมายเหตุ: ถ้าไม่ได้ตั้งค่า env vars จะยัง build ได้ แต่ระบบ login อาจใช้งานไม่ได้/ขึ้น warning

### Run

```bash
npm start
```

### Test

```bash
npm test
```

### Build

```bash
npm run build
```

## Deploy (Firebase Hosting)

โปรเจกต์นี้ใช้ Firebase Hosting โดยมี config ในไฟล์ `firebase.json` และ `.firebaserc`

1) ติดตั้ง Firebase CLI (ครั้งแรกเท่านั้น)

```bash
npm install -g firebase-tools
```

2) ล็อกอิน

```bash
firebase login
```

3) Build และ Deploy

```bash
npm run build
firebase deploy --only hosting:omynocashflow
```
