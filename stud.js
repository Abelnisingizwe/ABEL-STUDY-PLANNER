import { auth, db, storage } from "./firebase.js";

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
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
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

// ================= TASKS (FIRESTORE) =================
window.addTask = async function () {
  let task = document.getElementById("taskName").value;
  let date = document.getElementById("taskDate").value;
  let hour = document.getElementById("taskHour").value;
  let minute = document.getElementById("taskMinute").value;

  if (!task || !date) return alert("Fill all fields!");

  try {
    await addDoc(collection(db, "tasks"), {
      user: currentUser,
      task,
      time: `${date} ${hour}:${minute}`
    });

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
      <p><b>${data.task}</b> - ${data.time}</p>
      <button onclick="deleteTask('${docSnap.id}')">Delete</button>
    `;

    list.appendChild(div);
  });
};
 
window.deleteTask = async function (id) {
  await deleteDoc(doc(db, "tasks", id));
  loadTasks();
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

  const q = query(
    collection(db, "files"),
    where("user", "==", currentUser)
  );

  let snapshot = await getDocs(q);

  snapshot.forEach((docSnap) => {
    let f = docSnap.data();

    let div = document.createElement("div");

    div.innerHTML = `
      <p>📁 ${f.name}</p>
      <button onclick="openDriveFile('${f.driveId}','${f.name}')">
 Open
</button>
      <button onclick="deleteFile('${docSnap.id}','${f.driveId}')">
Delete
</button>
    `;

    container.appendChild(div);
  });
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
