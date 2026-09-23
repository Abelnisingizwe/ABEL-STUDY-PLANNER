importScripts(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"
);

importScripts(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js"
);


firebase.initializeApp({

  apiKey: "AIzaSyBLOa2endiRKtEB3uN--LtrgQjRtVsHz_A",
  authDomain: "abel-study-planner.firebaseapp.com",
  projectId: "abel-study-planner",
  storageBucket: "abel-study-planner.firebasestorage.app",
  messagingSenderId: "75345755224",
  appId: "1:75345755224:web:061e4e1ea46b30a0375e2d"

});


const messaging = firebase.messaging();


messaging.onBackgroundMessage((payload) => {

  console.log(
    "Background message:",
    payload
  );

  const notificationTitle =
    payload.notification?.title ||
    "Abel Study Planner";

  const notificationOptions = {

    body:
      payload.notification?.body ||
      "Ufite reminder nshya.",

    icon:
      "/favicon.ico",

    data:
      payload.data || {}

  };

  self.registration.showNotification(
    notificationTitle,
    notificationOptions
  );

});


const CACHE = "abel-v2";

const FILES = [

  "/ABEL-STUDY-PLANNER/",

  "/ABEL-STUDY-PLANNER/index.html",

  "/ABEL-STUDY-PLANNER/stud.css",

  "/ABEL-STUDY-PLANNER/stud.js",

  "/ABEL-STUDY-PLANNER/db.js",

  "/ABEL-STUDY-PLANNER/manifest.json",

  "/ABEL-STUDY-PLANNER/images/logo.png",

  "/ABEL-STUDY-PLANNER/images/icon-192.png",

  "/ABEL-STUDY-PLANNER/images/icon-512.png"

];


self.addEventListener("install", event => {

  event.waitUntil(

    caches.open(CACHE).then(cache => cache.addAll(FILES))

  );

});


self.addEventListener("activate", event => {

  event.waitUntil(

    caches.keys().then(keys =>

      Promise.all(

        keys
          .filter(key => key !== CACHE)
          .map(key => caches.delete(key))

      )

    )

  );

});


self.addEventListener("fetch", event => {

  event.respondWith(

    caches.match(event.request)
      .then(response => response || fetch(event.request))

  );

});