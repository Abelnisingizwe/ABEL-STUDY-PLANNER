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
// ================= FILE UPLOAD (STORAGE) =================
window.uploadFile = async function () {

  let file = document.getElementById("fileUpload").files[0];

  if (!file) return alert("Select file!");

  if (!currentUser) return alert("Login first!");

  try {

    let storageRef = ref(storage, `files/${currentUser}/${file.name}`);

    await uploadBytes(storageRef, file);

    let url = await getDownloadURL(storageRef);

    await addDoc(collection(db, "files"), {
      user: currentUser,
      name: file.name,
      url: url
    });

    alert("Uploaded!");
    loadFiles();

  } catch(e) {
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
      <a href="${f.url}" target="_blank">Open</a>
      <button onclick="deleteFile('${docSnap.id}')">Delete</button>
    `;

    container.appendChild(div);
  });
};

// ================= DELETE FILE =================
window.deleteFile = async function (id) {
  await deleteDoc(doc(db, "files", id));
  loadFiles();
};

// ================= AUTO LOGIN =================
window.addEventListener("DOMContentLoaded", () => {
  currentUser = auth.currentUser?.email || null;
});
  window.loadImage = function(event){

  let img = document.getElementById("profilePic");

  img.src = URL.createObjectURL(
    event.target.files[0]
  );

};
window.saveProfileImage = async function(event){

  let image = event.target.files[0];

  if(!image) return;

  try {

    let imageRef = ref(
      storage,
      `profilePics/${currentUser}`
    );

    await uploadBytes(imageRef, image);

    let url = await getDownloadURL(imageRef);

    await setDoc(doc(db,"users",currentUser),{
      profile:url
    });

    document.getElementById("profilePic").src = url;

    alert("Profile saved!");

  } catch(e){
    alert(e.message);
  }

};
