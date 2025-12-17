// Firebase config
firebase.initializeApp({
  apiKey: "AIzaSyAE0DpuMOtf6gcMTNTh22jOPaovXSzKYBU",
  authDomain: "budget-app-193ef.firebaseapp.com",
  projectId: "budget-app-193ef"
});

const auth = firebase.auth();
const db = firebase.firestore();

let user, budgetId, unsubscribe;

// ---------- AUTH ----------
function loginWithGoogle() {
  auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
}

function toggleEmail() {
  document.getElementById("emailBox").style.display = "block";
}

function emailLogin() {
  auth.signInWithEmailAndPassword(
    email.value, password.value
  );
}

function emailSignup() {
  auth.createUserWithEmailAndPassword(
    email.value, password.value
  );
}

auth.onAuthStateChanged(u => {
  if (!u) return;
  user = u;

  db.collection("users").doc(user.uid).set({
    uid: user.uid,
    email: user.email,
    name: user.displayName || user.email
  }, { merge: true });

  loginSection.style.display = "none";
  appSection.style.display = "block";
  userInfo.innerText = "Logged in as " + (user.displayName || user.email);

  loadBudgets();
  loadUsers();
});

// ---------- BUDGETS ----------
function loadBudgets() {
  db.collection("budgets")
    .where("members", "array-contains", user.uid)
    .onSnapshot(snap => {
      budgetSelect.innerHTML = `<option disabled selected>Select Budget</option>`;
      snap.forEach(doc => {
        budgetSelect.innerHTML += `<option value="${doc.id}">${doc.data().name}</option>`;
      });
      budgetSelect.innerHTML += `<option value="new">➕ Create New</option>`;
    });
}

function onBudgetChange() {
  if (budgetSelect.value === "new") return;

  budgetId = budgetSelect.value;
  currentBudget.innerText = "Budget: " + budgetSelect.options[budgetSelect.selectedIndex].text;
  listenTransactions();
}

function createBudget() {
  db.collection("budgets").add({
    name: newBudgetName.value,
    ownerId: user.uid,
    members: [user.uid]
  });
  newBudgetName.value = "";
}

// ---------- USERS ----------
function loadUsers() {
  db.collection("users").get().then(snap => {
    usersDropdown.innerHTML = `<option disabled selected>Add user</option>`;
    snap.forEach(d => {
      if (d.id !== user.uid)
        usersDropdown.innerHTML += `<option value="${d.id}">${d.data().name}</option>`;
    });
  });
}

function addUser() {
  db.collection("budgets").doc(budgetId).update({
    members: firebase.firestore.FieldValue.arrayUnion(usersDropdown.value)
  });
}

// ---------- TRANSACTIONS ----------
function listenTransactions() {
  if (unsubscribe) unsubscribe();
  unsubscribe = db.collection("budgets")
    .doc(budgetId)
    .collection("transactions")
    .orderBy("createdAt")
    .onSnapshot(snap => {
      transactions.innerHTML = "";
      snap.forEach(doc => {
        const t = doc.data();
        transactions.innerHTML += `
          <tr>
            <td>${t.text}</td>
            <td>${t.category}</td>
            <td>${t.amount}</td>
            <td><button onclick="delTx('${doc.id}')">🗑</button></td>
          </tr>`;
      });
    });
}

function addTransaction() {
  db.collection("budgets").doc(budgetId)
    .collection("transactions")
    .add({
      text: desc.value,
      category: cat.value,
      amount: Number(amt.value),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      by: user.uid
    });
  desc.value = amt.value = "";
}

function delTx(id) {
  db.collection("budgets").doc(budgetId)
    .collection("transactions").doc(id).delete();
}
