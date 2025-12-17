firebase.initializeApp({
  apiKey: "AIzaSyAE0DpuMOtf6gcMTNTh22jOPaovXSzKYBU",
  authDomain: "budget-app-193ef.firebaseapp.com",
  projectId: "budget-app-193ef"
});

const auth = firebase.auth();
const db = firebase.firestore();
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

let user = null;
let budgetId = null;
let unsubscribe = null;

// ---------- AUTH ----------
function loginWithGoogle() { auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); }
function toggleEmail() { document.getElementById("emailBox").style.display = "block"; }
function emailLogin() { auth.signInWithEmailAndPassword(email.value, password.value); }
function emailSignup() { auth.createUserWithEmailAndPassword(email.value, password.value); }
function logout() { localStorage.removeItem("lastBudgetId"); auth.signOut(); location.reload(); }

auth.onAuthStateChanged(u => {
  if (!u) { loginSection.style.display = "block"; appSection.style.display = "none"; userInfo.innerText = ""; return; }

  user = u;
  db.collection("users").doc(user.uid).set({ uid:user.uid, email:user.email, name:user.displayName||user.email }, { merge:true });

  loginSection.style.display = "none";
  appSection.style.display = "block";
  userInfo.innerText = "Logged in as "+(user.displayName||user.email);

  loadBudgets();
  loadUsers();
});

// ---------- BUDGET ----------
function loadBudgets() {
  db.collection("budgets").where("members","array-contains",user.uid)
    .onSnapshot(snap => {
      budgetSelect.innerHTML = `<option disabled>Select Budget</option>`;
      let lastBudget = localStorage.getItem("lastBudgetId");

      snap.forEach(doc => {
        const opt = document.createElement("option");
        opt.value = doc.id; opt.textContent = doc.data().name;
        budgetSelect.appendChild(opt);

        // Automatically select last budget
        if(doc.id===lastBudget){ 
          budgetSelect.value = lastBudget; 
          budgetId = lastBudget; 
          currentBudget.innerText="Budget: "+doc.data().name; 
          document.getElementById("addUserBtn").style.display="inline-block";
          listenTransactions(); 
        }
      });

      budgetSelect.innerHTML += `<option value="new">➕ Create New</option>`;
    });
}

function onBudgetChange() {
  if(budgetSelect.value==="new"){ 
    document.getElementById("createBudgetDiv").style.display="block";
    document.getElementById("addUserBtn").style.display="none";
    budgetId=null;
    currentBudget.innerText="Creating New Budget";
  } else {
    document.getElementById("createBudgetDiv").style.display="none";
    document.getElementById("addUserBtn").style.display="inline-block";
    budgetId=budgetSelect.value;
    localStorage.setItem("lastBudgetId",budgetId);
    currentBudget.innerText="Budget: "+budgetSelect.options[budgetSelect.selectedIndex].text;
    listenTransactions();
  }
}

function createBudget() {
  if(!newBudgetName.value) return alert("Enter budget name");
  db.collection("budgets").add({ name:newBudgetName.value, ownerId:user.uid, members:[user.uid] });
  newBudgetName.value=""; document.getElementById("createBudgetDiv").style.display="none";
}

// ---------- USERS ----------
function loadUsers() {
  db.collection("users").get().then(snap=>{
    usersDropdown.innerHTML=`<option disabled selected>Select user to add</option>`;
    snap.forEach(d=>{ if(d.id!==user.uid){ usersDropdown.innerHTML+=`<option value="${d.id}">${d.data().name||d.data().email}</option>`; } });
  });
}

function toggleAddUser(){ 
  addUserDiv.style.display = addUserDiv.style.display==="none"?"block":"none"; 
}

function addUser(){
  if(!budgetId) return alert("Select a budget");
  if(!usersDropdown.value) return alert("Select a user");
  db.collection("budgets").doc(budgetId).update({ members: firebase.firestore.FieldValue.arrayUnion(usersDropdown.value) });
  usersDropdown.value="";
  addUserDiv.style.display="none";
}

// ---------- TRANSACTIONS ----------
function listenTransactions(){
  if(unsubscribe) unsubscribe();
  unsubscribe=db.collection("budgets").doc(budgetId)
    .collection("transactions").orderBy("createdAt")
    .onSnapshot(snap=>{
      transactions.innerHTML="";
      snap.forEach(doc=>{
        const t=doc.data();
        transactions.innerHTML+=`
          <tr>
            <td>${t.text}</td>
            <td>${t.category}</td>
            <td>${t.amount}</td>
            <td>
              <button onclick="editTx('${doc.id}','${t.text}','${t.category}',${t.amount})">✏️</button>
              <button onclick="delTx('${doc.id}')">🗑</button>
            </td>
          </tr>`;
      });
    });
}

function addTransaction(){
  if(!budgetId) return alert("Select a budget");
  if(!desc.value || !amt.value) return alert("Fill description and amount");
  db.collection("budgets").doc(budgetId)
    .collection("transactions").add({ text:desc.value, category:cat.value, amount:Number(amt.value), createdAt:firebase.firestore.FieldValue.serverTimestamp(), by:user.uid });
  desc.value=""; amt.value="";
}

function delTx(id){ db.collection("budgets").doc(budgetId).collection("transactions").doc(id).delete(); }

function editTx(id, text, category, amount){
  const newText = prompt("Edit description", text);
  if(newText===null) return;
  const newCat = prompt("Edit category", category);
  if(newCat===null) return;
  const newAmt = prompt("Edit amount", amount);
  if(newAmt===null) return;
  db.collection("budgets").doc(budgetId).collection("transactions").doc(id).update({ text:newText, category:newCat, amount:Number(newAmt) });
}
