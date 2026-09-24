import { auth, db, storage, messaging } from "./firebase.js";

import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  getToken
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";
async function requestNotificationPermission() {

  try {

    const permission = await Notification.requestPermission();

    if(permission === "granted"){

      console.log("Notification permission granted");


    const registration = await navigator.serviceWorker.register(
  "firebase-messaging-sw.js"
);


      fcmToken = await getToken(messaging,{
        vapidKey:"BBx_zJTcCHfRG5AM7YmbU45d7PSYUBHfZk2-DVuyhAyM-ybpG-MMhVX_YGRgMTam7r2Lzv7xETMz1XJROD4mRf8",
        serviceWorkerRegistration:registration
      });


      console.log("FCM Token:",fcmToken);


      // SAVE TOKEN
      if(auth.currentUser){

        await setDoc(
          doc(db,"users",auth.currentUser.email),
          {
           fcmToken:fcmToken
          },
          {
            merge:true
          }
        );


        console.log("Token saved to Firestore");

      }


    }else{

      console.log("Permission denied");

    }


  }catch(error){

    console.error("Notification error:",error);

  }

}
// ================= USER =================
let currentUser = null;
let fcmToken = null;

// ================= SIGNUP =================
window.signup = async function () {
  let email = document.getElementById("newUser").value;
  let password = document.getElementById("newPass").value;

  try {
    await createUserWithEmailAndPassword(auth, email, password);

    alert("Account created!");
    window.showLogin();

  } catch (e) {
    alert(e.message);
  }
};

// ================= LOGIN =================
window.login = async function () {
  let email = document.getElementById("username").value;
  let password = document.getElementById("password").value;

  try {
    let res = await signInWithEmailAndPassword(auth, email, password);

   currentUser = res.user.email;

await requestNotificationPermission();

document.getElementById("loginPage").style.display = "none";
    document.getElementById("planner").style.display = "block";

    document.getElementById("welcomeUser").innerText =
      "Welcome " + currentUser;

       loadTasks();
    loadFiles();
    loadProfileImage();
    loadReminders();
    startRwibutsoTVReminderChecker();

  } catch (e) {
    alert(e.message);
  }
};

// ================= LOGOUT =================
window.logout = async function () {
  await signOut(auth);
  location.reload();
};

// ================= PAGES =================
window.showSignup = function () {
  document.getElementById("loginPage").style.display = "none";
  document.getElementById("signupPage").style.display = "block";
};

window.showLogin = function () {
  document.getElementById("signupPage").style.display = "none";
  document.getElementById("loginPage").style.display = "block";
};

// ================= ADD TASK =================
window.addTask = async function () {
  let task = document.getElementById("taskName").value;
  let dateTime = document.getElementById("taskDateTime").value;

  if (!task || !dateTime) {
    alert("Uzuza amakuru yose!");
    return;
  }

  try {
    await addDoc(collection(db, "tasks"), {
      user: currentUser,
      task: task,
      dateTime: dateTime,
      createdAt: new Date()
    });

    alert("Task yongewemo neza!");

    document.getElementById("taskName").value = "";
    document.getElementById("taskDateTime").value = "";

    loadTasks();

  } catch (e) {
    alert(e.message);
  }
};

window.loadTasks = async function () {

  let list = document.getElementById("taskList");
  list.innerHTML = "";

  const q = query(
    collection(db, "tasks"),
    where("user", "==", currentUser)
  );

  let snapshot = await getDocs(q);

  snapshot.forEach((docSnap) => {

    let data = docSnap.data();

    let div = document.createElement("div");

    div.innerHTML = `
<input type="checkbox" class="taskCheck" value="${docSnap.id}">
${data.task} - ${data.dateTime}
`;

    list.appendChild(div);

  });
};
window.deleteSelectedTasks = async function () {

  const checked = document.querySelectorAll(".taskCheck:checked");

  for (const item of checked) {

    await deleteDoc(
      doc(db, "tasks", item.value)
    );

  }

  alert("Selected tasks deleted!");

  loadTasks();
};

// ================= PERSONAL REMINDER =================

window.addReminder = async function () {

  const title =
    document.getElementById("reminderTitle").value.trim();

  const description =
    document.getElementById("reminderDescription").value.trim();

  const date =
    document.getElementById("reminderDate").value;

  const time =
    document.getElementById("reminderTime").value;

  const reminderBefore =
    document.getElementById("reminderBefore").value;

  const repeat =
    document.getElementById("reminderRepeat").value;


  if (!title || !date || !time) {

    alert("Uzuza Title, Date na Time!");

    return;
  }


  if (!currentUser) {

    alert("Banza winjire muri account!");

    return;
  }


  try {

    // SAVE REMINDER FOR STUDENT UI
await addDoc(
  collection(db, "reminders"),
  {
    user: currentUser,
    title: title,
    description: description,
    date: date,
    time: time,
    reminderBefore: reminderBefore,
    repeat: repeat,
    completed: false,
    createdAt: new Date()
  }
);

// SEND REMINDER TO BACKEND SCHEDULER
if (!fcmToken) {
  throw new Error("FCM Token ntaraboneka. Ongera winjire muri account.");
}

const dateTime = `${date}T${time}`;

const response = await fetch(
  "https://abel-study-planner-backend.onrender.com/create-reminder",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      token: fcmToken,
      title: title,
      dateTime: dateTime
    })
  }
);

const result = await response.json();

if (!response.ok || !result.success) {
  throw new Error(
    result.error || "Reminder ntiyoherejwe kuri backend."
  );
}

console.log("Backend reminder created:", result.reminder);
    alert("Reminder yabitswe neza!");


    document.getElementById(
      "reminderTitle"
    ).value = "";

    document.getElementById(
      "reminderDescription"
    ).value = "";

    document.getElementById(
      "reminderDate"
    ).value = "";

    document.getElementById(
      "reminderTime"
    ).value = "";


    loadReminders();


  } catch (error) {

    console.error(
      "ADD REMINDER ERROR:",
      error
    );

    alert(error.message);

  }

};

// ================= DELETE REMINDER =================

window.deleteReminder = async function (reminderId) {

  console.log("DELETE CLICKED:", reminderId);

  try {

    await deleteDoc(
      doc(db, "reminders", reminderId)
    );
    console.log("REMINDER DELETED:", reminderId);

    loadReminders();

  } catch (error) {

    console.error(
      "DELETE REMINDER ERROR:",
      error
    );

    alert("Reminder ntiyashoboye gusibwa.");

  }

};

// ================= LOAD REMINDERS =================

window.loadReminders = async function () {

  const list =
    document.getElementById("reminderList");

  if (!list) return;

  list.innerHTML = "";


  try {

    const q = query(
      collection(db, "reminders"),
      where("user", "==", currentUser)
    );


    const snapshot =
      await getDocs(q);
      console.log("Reminders found:", snapshot.size);
console.log("Reminder user:", currentUser);


    snapshot.forEach((docSnap) => {

      const data =
        docSnap.data();


      const div =
        document.createElement("div");

div.innerHTML = `

  <input
    type="checkbox"
    class="reminderCheck"
  >

  <strong>
    ${data.title}
  </strong>

  <br>

  ${data.description || ""}

  <br>

  📅 ${data.date}

  ⏰ ${data.time}

  <br>

  🔔 ${data.reminderBefore}

  |

  🔄 ${data.repeat}

  <br><br>

`;

const checkbox = div.querySelector(".reminderCheck");

checkbox.addEventListener("change", function () {

  if (this.checked) {

    deleteReminder(docSnap.id);

  }

});


      list.appendChild(div);

    });


  } catch (error) {

    console.error(
      "LOAD REMINDERS ERROR:",
      error
    );

  }

};

window.deleteSelectedFiles = async function(){

  const checked =
    document.querySelectorAll(".fileCheck:checked");

  try {

    const token = await getGoogleDriveToken();

    for (const file of checked) {

      let docId = file.value;
      let driveId = file.dataset.drive;

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${driveId}`,
        {
          method: "DELETE",

          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!response.ok && response.status !== 404) {

        throw new Error(
          "Google Drive delete failed: " +
          response.status
        );

      }

      await deleteDoc(
        doc(db, "files", docId)
      );

    }

    alert("Selected files deleted!");

    loadFiles();

  } catch (e) {

    console.error(
      "DELETE SELECTED FILES ERROR:",
      e
    );

    alert(e.message);

  }

};
// ================= FILE UPLOAD (STORAGE) =================
window.uploadFile = async function () {

  let fileInput = document.getElementById("fileUpload");
  let file = fileInput.files[0];

  if (!file) {
    alert("Hitamo file mbere!");
    return;
  }

  try {

    const token = await getGoogleDriveToken();

    let metadata = {
      name: file.name
    };

    let form = new FormData();

    form.append(
      "metadata",
      new Blob(
        [JSON.stringify(metadata)],
        { type: "application/json" }
      )
    );

    form.append(
      "file",
      file
    );

    console.log(file.name);
    console.log(file.type);
    console.log(file.size);

    let response = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
      {
        method: "POST",

        headers: {
          Authorization: "Bearer " + token
        },

        body: form
      }
    );

    console.log("Status:", response.status);

    let data = await response.json();

    console.log("Drive file:", data);

    if (!response.ok) {
      throw new Error(JSON.stringify(data));
    }

    await addDoc(
      collection(db, "files"),
      {
        user: currentUser,
        name: file.name,
        driveId: data.id,
        createdAt: new Date()
      }
    );

    alert("File yashyizwe kuri Google Drive neza!");

    fileInput.value = "";

    loadFiles();

  } catch (e) {

    console.error("UPLOAD ERROR:", e);

    alert(e.message);

  }

};
// ================= LOAD FILES =================
window.loadFiles = async function () {

  let container = document.getElementById("fileList");
  container.innerHTML = "";

  try {

    console.log("Current user:", currentUser);

    const q = query(
      collection(db, "files"),
      where("user", "==", currentUser)
    );

    let snapshot = await getDocs(q);

    console.log("Files found:", snapshot.size);

    snapshot.forEach((docSnap) => {

      let f = docSnap.data();

      let div = document.createElement("div");

      div.innerHTML = `

        <input 
          type="checkbox" 
          class="fileCheck"
          value="${docSnap.id}"
          data-drive="${f.driveId}">

        📁 <b>${f.name}</b>

        <button onclick="openDriveFile('${f.driveId}')">
          Open
        </button>

        <br><br>

      `;

      container.appendChild(div);

    });

  } catch(error) {

    console.error("LOAD FILES ERROR:", error);
    alert(error.message);

  }

};
window.openDriveFile = function(driveId) {

    const viewer = document.getElementById("pdfFrame");

    viewer.src =
      `https://drive.google.com/file/d/${driveId}/preview`;

};
// ================= DELETE FILE =================
window.deleteFile = async function (docId, driveId) {

  let confirmDelete = confirm(
    "Urashaka koko gusiba iyi file? Izasibika no muri Google Drive."
  );

  if (!confirmDelete) {
    return;
  }

  try {

    const token = await getGoogleDriveToken();

    console.log("Drive ID:", driveId);
    console.log("Token exists:", token ? "YES" : "NO");

    let response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${driveId}`,
      {
        method: "DELETE",

        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    console.log(
      "Delete status:",
      response.status
    );

    if (!response.ok && response.status !== 404) {

      throw new Error(
        "Google Drive delete failed: " +
        response.status
      );

    }

    await deleteDoc(
      doc(db, "files", docId)
    );

    alert("File yasibwe neza!");

    loadFiles();

  } catch (e) {

    console.error(
      "DELETE ERROR:",
      e
    );

    alert(e.message);

  }

};

window.saveProfileImage = async function(event){

  let image = event.target.files[0];

  if(!image) return;

  if(!currentUser){
    alert("Login first!");
    return;
  }

  let reader = new FileReader();

  reader.onload = async function(){

    let imageData = reader.result;

    try {

      await setDoc(
        doc(db,"users",currentUser),
        {
          profile:imageData
        },
        { merge:true }
      );

      document.getElementById("profilePic").src = imageData;

      alert("Profile saved!");

    } catch(e){

      alert(e.message);

    }

  };

  reader.readAsDataURL(image);

};
window.loadProfileImage = async function(){

  if(!currentUser) return;

  let userDoc = await getDoc(
    doc(db,"users",currentUser)
  );

  if(userDoc.exists()){

    let data = userDoc.data();

    if(data.profile){

      document.getElementById("profilePic").src =
      data.profile;

    }

  }

};
// ================= GOOGLE DRIVE =================

const GOOGLE_CLIENT_ID = "197520392155-8q2vd42n99lddka1endcbnus6otvdjg8.apps.googleusercontent.com";

const GOOGLE_DRIVE_SCOPE =
  "https://www.googleapis.com/auth/drive";

let googleToken = null;

let googleTokenClient = null;


// ================= LOAD SAVED GOOGLE TOKEN =================

function loadGoogleToken() {

  googleToken =
    localStorage.getItem("googleToken");

}


// ================= GOOGLE DRIVE AUTH =================

function initializeGoogleDrive() {

  if (!window.google || !google.accounts) {
    console.log("Google Identity Services not ready");
    return;
  }

  googleTokenClient =
    google.accounts.oauth2.initTokenClient({

      client_id: GOOGLE_CLIENT_ID,

      scope: GOOGLE_DRIVE_SCOPE,

      callback: (response) => {

        if (response.error) {

          console.error(
            "Google OAuth Error:",
            response
          );

          return;

        }

        googleToken =
          response.access_token;

        localStorage.setItem(
          "googleToken",
          googleToken
        );

        localStorage.setItem(
          "googleDriveConnected",
          "true"
        );

        console.log(
          "Google Drive connected"
        );

      }

    });

}


// ================= CONNECT GOOGLE DRIVE =================

window.connectDrive = function () {

  if (!googleTokenClient) {

    initializeGoogleDrive();

  }

  googleTokenClient.requestAccessToken({
    prompt: ""
  });

};


// ================= GET VALID GOOGLE TOKEN =================

async function getGoogleDriveToken() {

  if (!googleTokenClient) {
    initializeGoogleDrive();
  }

  // If there is no token, request one
  if (!googleToken) {

    return new Promise((resolve, reject) => {

      googleTokenClient.callback = (response) => {

        if (response.error) {

          reject(
            new Error(
              "Google Drive authentication failed."
            )
          );

          return;
        }

        googleToken = response.access_token;

        localStorage.setItem(
          "googleToken",
          googleToken
        );

        localStorage.setItem(
          "googleDriveConnected",
          "true"
        );

        resolve(googleToken);

      };

      googleTokenClient.requestAccessToken({
        prompt: ""
      });

    });

  }

  // Test whether current token is still valid
  try {

    const response = await fetch(
      "https://www.googleapis.com/drive/v3/about?fields=user",
      {
        headers: {
          Authorization:
            "Bearer " + googleToken
        }
      }
    );

    // Token is valid
    if (response.ok) {

      return googleToken;

    }

    // Token expired / invalid
    if (response.status === 401) {

      console.log(
        "Google token expired. Requesting a new token..."
      );

      localStorage.removeItem("googleToken");

      googleToken = null;

      return new Promise((resolve, reject) => {

        googleTokenClient.callback = (response) => {

          if (response.error) {

            reject(
              new Error(
                "Google Drive authentication failed."
              )
            );

            return;
          }

          googleToken =
            response.access_token;

          localStorage.setItem(
            "googleToken",
            googleToken
          );

          localStorage.setItem(
            "googleDriveConnected",
            "true"
          );

          resolve(googleToken);

        };

        googleTokenClient.requestAccessToken({
          prompt: ""
        });

      });

    }

    throw new Error(
      "Google Drive authentication error: " +
      response.status
    );

  } catch (error) {

    console.error(
      "Google Drive token error:",
      error
    );

    throw error;

  }

}


// ================= INITIALIZE =================

loadGoogleToken();

window.addEventListener(
  "load",
  () => {

    setTimeout(() => {

      initializeGoogleDrive();

    }, 1000);

  }
);

// ================= RWIBUTSO TV REMINDER =================

let reminderTVTimer = null;

async function checkRwibutsoTVReminders() {

  if (!currentUser) return;

  const now = new Date();

  try {

    const q = query(
      collection(db, "reminders"),
      where("user", "==", currentUser)
    );

    const snapshot = await getDocs(q);

    let activeReminder = null;

    snapshot.forEach((docSnap) => {

      const data = docSnap.data();

      if (data.completed) return;

      if (!data.date || !data.time) return;

      const reminderDateTime =
        new Date(`${data.date}T${data.time}`);

      // Calculate when the reminder should appear
      let reminderShowTime =
        new Date(reminderDateTime);

      if (data.reminderBefore === "10_minutes") {

        reminderShowTime.setMinutes(
          reminderShowTime.getMinutes() - 10
        );

      } else if (data.reminderBefore === "1_hour") {

        reminderShowTime.setHours(
          reminderShowTime.getHours() - 1
        );

      } else if (data.reminderBefore === "1_day") {

        reminderShowTime.setDate(
          reminderShowTime.getDate() - 1
        );

      }

      // Show reminder when its reminder time arrives
      if (now >= reminderShowTime) {

        activeReminder = data;

      }

    });

    const tv =
      document.getElementById("rwibutsoReminderTV");

    const title =
      document.getElementById("rwibutsoReminderTitle");

    const description =
      document.getElementById(
        "rwibutsoReminderDescription"
      );

    const reminderTime =
      document.getElementById(
        "rwibutsoReminderTime"
      );

    if (!tv) return;

    if (activeReminder) {

      tv.style.display = "block";

      title.textContent =
        "🔔 " + activeReminder.title;

      description.textContent =
        activeReminder.description || "";

      reminderTime.textContent =
        "📅 " +
        activeReminder.date +
        " ⏰ " +
        activeReminder.time;

    } else {

      tv.style.display = "none";

    }

  } catch (error) {

    console.error(
      "RWIBUTSO TV REMINDER ERROR:",
      error
    );

  }

}
// Check every 30 seconds
function startRwibutsoTVReminderChecker() {

  if (reminderTVTimer) {

    clearInterval(reminderTVTimer);

  }

  checkRwibutsoTVReminders();

  reminderTVTimer = setInterval(
    checkRwibutsoTVReminders,
    30000
  );

}