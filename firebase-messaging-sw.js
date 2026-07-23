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


messaging.onBackgroundMessage((payload)=>{

console.log(
"Background message:",
payload
);

});
