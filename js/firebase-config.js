/* ============================================================
   ফলহাট — Firebase কনফিগারেশন
   ------------------------------------------------------------
   এখানে আপনার নিজের Firebase প্রজেক্টের কনফিগারেশন বসান।
   কীভাবে পাবেন তার ধাপে ধাপে নির্দেশনা README.md ফাইলে দেওয়া আছে।

   Firebase Console (https://console.firebase.google.com) →
   প্রজেক্ট তৈরি করুন → Project settings → "Your apps" → Web app (</>) →
   নিচের মতো একটি অবজেক্ট পাবেন, সেটা এখানে বসিয়ে দিন।
   ============================================================ */

const firebaseConfig = {
apiKey:"AIzaSyBVvht4v48lvWiUPRnBnJp4ItBsLfqCWV4",
  
authDomain:"fruitorder-7dd0f.firebaseapp.com",
  
  projectId:"fruitorder-7dd0f",
  storageBucket:"fruitorder-7dd0f.firebasestorage.app",
  messagingSenderId: "1035777275852",
  appId: "1:1035777275852:web:c262cf4e2028845d498f69"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// অফলাইনেও কিছুটা ডেটা দেখার সুবিধার জন্য (ঐচ্ছিক, ব্যর্থ হলে নিরবে উপেক্ষা করা হয়)
try {
  db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
} catch (e) {
  /* ignore */
}
