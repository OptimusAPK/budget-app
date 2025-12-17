// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAE0DpuMOtf6gcMTNTh22jOPaovXSzKYBU",
  authDomain: "budget-app-193ef.firebaseapp.com",
  projectId: "budget-app-193ef",
  storageBucket: "budget-app-193ef.appspot.com",
  messagingSenderId: "875342270120",
  appId: "1:875342270120:web:e5304dae0d056552217c9d",
  measurementId: "G-YYQDZR9YHV"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Global state
let currentUser = null;
let currentBudgetId = null;

// --------------------- Auth -----------------------
function loginWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .then(res => setupUser(res.user))
    .catch(console.error);
}

function showEmailLogin() {
  document.getElementById("emailLoginSection").style.display = "block";
}

function emailLogin() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  auth.signInWithEmailAndPassword(email, password)
      .then(res => setupUser(res.user))
      .catch(console.error);
}

function emailSignUp() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  auth.createUserWithEmailAndPassword(email, password)
      .then(res => setupUser(res.user))
      .catch(console.error);
}

function setupUser(user) {
  currentUser = user;
  document.getElementById("loginSection").style.display = "none";
  document.getElementById("appSection").style.display = "block";
  document.getElementById("userInfo").innerText = `Hello, ${user.displayName || user.email}`;
  saveUserToFirestore();
  fetchBudgets();
  fetchAllUsers();
}

// --------------------- Firestore -----------------------
function saveUserToFirestore() {
  db.collection("users").doc(currentUser.uid).set({
    name: currentUser.displayName || currentUser.email
  }, { merge: true });
}

// Fetch budgets where user is a member
function fetchBudgets() {
  db.collection("budgets")
    .where("members", "array-contains", currentUser.uid)
    .onSnapshot(snapshot => {
      const select = document.getElementById("budgetSelect");
      select.innerHTML = `<option value="" disabled selected>Select Budget</option>`;
      snapshot.forEach(doc => {
        const data = doc.data();
        const option = document.createElement("option");
        option.value = doc.id;
        option.innerText = data.name;
        select.appendChild(option);
      });
      // Add "Create New" option
      const newOption = document.createElement("option");
      newOption.value = "create_new";
      newOption.innerText = "➕ Create New Budget";
      select.appendChild(newOption);
    });
}

// Fetch all users for adding to budget
function fetchAllUsers() {
  db.collection("users").get().then(snapshot => {
    const select = document.getElementById("allUsersSelect");
    select.innerHTML = `<option value="" disabled selected>Select user to add</option>`;
    snapshot.forEach(doc => {
      const option = document.createElement("option");
      option.value = doc.id;
      option.innerText = doc.data().name;
      if(doc.id !== currentUser.uid) select.appendChild(option);
    });
  });
}

// Handle budget selection
function handleBudgetChange() {
  const select = document.getElementById("budgetSelect");
  const value = select.value;
  if(value === "create_new") {
    document.getElementById("newBudgetSection").style.display = "flex";
    currentBudgetId = null;
    document.getElementById("transactionsTableBody").innerHTML = "";
    document.getElementById("currentBudget").innerText = "None";
  } else {
    document.getElementById("newBudgetSection").style.display = "none";
    currentBudgetId = value;
    db.collection("budgets").doc(currentBudgetId)
      .get().then(doc => {
        document.getElementById("currentBudget").innerText = doc.data().name;
      });
    fetchTransactions();
  }
}

// Create new budget
function createNewBudget() {
  const name = document.getElementById("newBudgetName").value.trim();
  if(!name) return alert("Enter a budget name");
  db.collection("budgets").add({
    name,
    ownerId: currentUser.uid,
    members: [currentUser.uid]
  }).then(doc => {
    currentBudgetId = doc.id;
    document.getElementById("currentBudget").innerText = name;
    document.getElementById("newBudgetName").value = "";
    document.getElementById("newBudgetSection").style.display = "none";
  }).catch(console.error);
}

// Add user to current budget
function addUserToBudget() {
  const userId = document.getElementById("allUsersSelect").value;
  if(!userId || !currentBudgetId) return;
  const budgetRef = db.collection("budgets").doc(currentBudgetId);
  budgetRef.update({
    members: firebase.firestore.FieldValue.arrayUnion(userId)
  }).then(() => fetchBudgets())
    .catch(console.error);
}

// --------------------- Transactions -----------------------
function fetchTransactions() {
  if(!currentBudgetId) return;
  db.collection("budgets").doc(currentBudgetId)
    .collection("transactions")
    .onSnapshot(snapshot => {
      const tbody = document.getElementById("transactionsTableBody");
      tbody.innerHTML = "";
      snapshot.forEach(doc => {
        const tr = document.createElement("tr");
        const data = doc.data();
        tr.innerHTML = `
          <td>${data.text}</td>
          <td>${data.category}</td>
          <td>${data.amount}</td>
          <td>
            <button onclick="deleteTransaction('${doc.id}')">🗑️</button>
          </td>`;
        tbody.appendChild(tr);
      });
    });
}

function addTransaction() {
  if(!currentBudgetId) return;
  const text = document.getElementById("text").value.trim();
  const category = document.getElementById("category").value;
  const amount = Number(document.getElementById("amount").value);
  if(!text || !category || !amount) return alert("Fill all fields");
  db.collection("budgets").doc(currentBudgetId)
    .collection("transactions")
    .add({ text, category, amount })
    .then(() => {
      document.getElementById("text").value = "";
      document.getElementById("amount").value = "";
    })
    .catch(console.error);
}

function deleteTransaction(id) {
  if(!currentBudgetId) return;
  db.collection("budgets").doc(currentBudgetId)
    .collection("transactions").doc(id)
    .delete().catch(console.error);
}
