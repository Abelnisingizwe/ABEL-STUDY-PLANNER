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


      const token = await getToken(messaging,{
        vapidKey:"BBx_zJTcCHfRG5AM7YmbU45d7PSYUBHfZk2-DVuyhAyM-ybpG-MMhVX_YGRgMTam7r2Lzv7xETMz1XJROD4mRf8",
        serviceWorkerRegistration:registration
      });


      console.log("FCM Token:",token);


      // SAVE TOKEN
      if(auth.currentUser){

        await setDoc(
          doc(db,"users",auth.currentUser.email),
          {
            fcmToken:token
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

requestNotificationPermission();

    document.getElementById("loginPage").style.display = "none";
    document.getElementById("planner").style.display = "block";

    document.getElementById("welcomeUser").innerText =
      "Welcome " + currentUser;

    loadTasks();
    loadFiles();
    loadProfileImage();

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
  let time = document.getElementById("taskTime").value;
  let month = document.getElementById("taskMonth").value;

  if (!task || !time || !month) {
    alert("Uzuza igikorwa, isaha n'ukwezi!");
    return;
  }

  try {

    await addDoc(collection(db, "tasks"), {

      user: currentUser,

      task: task,

      month: month,

      time: time,

      createdAt: new Date()

    });


    alert("Task yongewemo neza!");

    // gusiba ibyo user yari yanditse
    document.getElementById("taskName").value = "";
    document.getElementById("taskTime").value = "";
    document.getElementById("taskMonth").value = "";

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
      ${data.task} - ${data.month} - ${data.time}
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
window.deleteSelectedFiles = async function(){

  const checked = document.querySelectorAll(".fileCheck:checked");

  for(const file of checked){

    let docId = file.value;
    let driveId = file.dataset.drive;

    await fetch(
      `https://www.googleapis.com/drive/v3/files/${driveId}`,
      {
        method:"DELETE",
        headers:{
          Authorization:`Bearer ${googleToken}`
        }
      }
    );

    await deleteDoc(
      doc(db,"files",docId)
    );

  }

  alert("Selected files deleted!");

  loadFiles();

};

// ================= FILE UPLOAD (STORAGE) =================
// ================= GOOGLE DRIVE UPLOAD =================

window.uploadFile = async function () {

  let fileInput = document.getElementById("fileUpload");
  let file = fileInput.files[0];

  if (!file) {
    alert("Hitamo file mbere!");
    return;
  }

  if (!googleToken) {
    alert("Banza uhuze Google Drive!");
    return;
  }

  try {

    let metadata = {
      name: file.name
    };

    let form = new FormData();

    form.append(
      "metadata",
      new Blob(
        [JSON.stringify(metadata)],
        {type:"application/json"}
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
        method:"POST",

        headers:{
          Authorization:
          "Bearer " + googleToken
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

    await addDoc(collection(db,"files"),{

      user: currentUser,

      name:file.name,

      driveId:data.id,

      createdAt:new Date()

    });


    alert("File yashyizwe kuri Google Drive neza!");

    loadFiles();


  } catch(e){

    console.error(e);

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

  if(!confirmDelete){
    return;
  }

  try {

    console.log("Drive ID:", driveId);
console.log("Token exists:", googleToken ? "YES" : "NO");

    let response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${driveId}`,
      {
        method:"DELETE",
        headers:{
          Authorization:`Bearer ${googleToken}`
        }
      }
    );


    console.log("Delete status:", response.status);


    if(!response.ok){
      throw new Error(
        "Google Drive delete failed: " + response.status
      );
    }


    await deleteDoc(
      doc(db,"files",docId)
    );


    alert("File yasibwe neza!");

    loadFiles();


  } catch(e){

    console.error("DELETE ERROR:", e);

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

let googleToken = localStorage.getItem("googleToken");
window.connectDrive = function () {

  google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,

   scope:
 "https://www.googleapis.com/auth/drive",


    callback: (response) => {

     googleToken = response.access_token;
     localStorage.setItem("googleToken", googleToken);

localStorage.setItem(
  "googleToken",
  googleToken
);
      alert("Google Drive yahujwe neza!");

      console.log("Drive token:", googleToken);

    }

  }).requestAccessToken();

};
let deferredPrompt;

window.addEventListener("beforeinstallprompt", (event) => {

    event.preventDefault();

    deferredPrompt = event;

    const installBtn = document.getElementById("installBtn");

    if (installBtn) {
        installBtn.style.display = "block";
    }

});


document.getElementById("installBtn")?.addEventListener("click", async () => {

    if (!deferredPrompt) {
        return;
    }

    deferredPrompt.prompt();

    const result = await deferredPrompt.userChoice;

    console.log("Install choice:", result.outcome);

    deferredPrompt = null;

});
