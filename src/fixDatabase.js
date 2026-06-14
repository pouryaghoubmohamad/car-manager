import { getDatabase, ref, set, get } from "firebase/database";
import { getAuth } from "firebase/auth";

const db = getDatabase();
const auth = getAuth();
const user = auth.currentUser;

if (!user) {
  console.log("لطفاً اول وارد شوید");
} else {
  // گرفتن داده‌های قدیمی از مسیر cars
  const oldCarsRef = ref(db, 'cars');
  const snapshot = await get(oldCarsRef);
  const oldData = snapshot.val();
  
  if (oldData) {
    // انتقال به مسیر جدید
    const newCarsRef = ref(db, `users/${user.uid}/cars`);
    await set(newCarsRef, oldData);
    console.log("✅ داده‌ها منتقل شدند");
    
    // پاک کردن داده‌های قدیمی
    const deleteOldRef = ref(db, 'cars');
    await set(deleteOldRef, null);
    console.log("✅ داده‌های قدیمی پاک شدند");
  } else {
    console.log("هیچ داده‌ای یافت نشد");
  }
}