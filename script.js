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

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let userId = null;
let budgetId = null;
let budgets = [];
let transactions = [];

// --------- Authentication ---------
function loginWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(err => alert(err.message));
}

function showEmailLogin() {
  document.getElementById("emailLoginSection").style.display = "block";
}

function emailLogin() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  auth.signInWithEmailAndPassword(email, password).catch(err => alert(err.message));
}

function emailSignUp() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  auth.createUserWithEmailAndPassword(email, password)
    .then(({ user }) => {
      // create user doc for collaboration
      db.collection("users").doc(user.uid).set({ email: user.email, name: user.displayName || "" });
    })
    .catch(err => alert(err.message));
}

// --------- Auth state listener ---------
auth.onAuthStateChanged(user => {
  if (user) {
    userId = user.uid;
    // Create user doc if not exists
    db.collection("users").doc(userId).set({ email: user.email, name: user.displayName || "" }, { merge: true });

    document.getElementById("userInfo").innerText = `Logged in as ${user.email || user.displayName}`;
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("appSection").style.display = "block";

    fetchUserBudgets();
  } else {
    userId = null;
    budgetId = null;
    budgets = [];
    transactions = [];
    document.getElementById("userInfo").innerText = "";
    document.getElementById("loginSection").style.display = "block";
    document.getElementById("appSection").style.display = "none";
    clearTransactionsTable();
    updateBudgetSelect();
  }
});

// --------- Fetch budgets user belongs to ---------
function fetchUserBudgets() {
  if (!userId) return;

  db.collection("budgets")
    .where("members", "array-contains", userId)
    .get()
    .then(snapshot => {
      budgets = [];
      snapshot.forEach(doc => budgets.push({ id: doc.id, ...doc.data() }));
      updateBudgetSelect();
    })
    .catch(err => alert(err.message));
}

// --------- Update the budget select dropdown ---------
function updateBudgetSelect() {
  const select = document.getElementById("budgetSelect");
  select.innerHTML = "";

  if (budgets.length === 0) {
    const createOption = document.createElement("option");
    createOption.value = "create_new";
    createOption.text = "Create New Budget";
    createOption.selected = true;
    select.appendChild(createOption);
    document.getElementById("newBudgetSection").style.display = "block";
  } else {
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.text = "Select a budget";
    defaultOption.disabled = true;
    defaultOption.selected = true;
    select.appendChild(defaultOption);

    budgets.forEach(b => {
      const option = document.createElement("option");
      option.value = b.id;
      option.text = b.name ? b.name + " (" + b.id + ")" : b.id;
      select.appendChild(option);
    });

    const createOption = document.createElement("option");
    createOption.value = "create_new";
    createOption.text = "Create New Budget";
    select.appendChild(createOption);

    document.getElementById("newBudgetSection").style.display = "none";
  }

  budgetId = null;
  document.getElementById("currentBudget").innerText = "None";
  clearTransactionsTable();
}

// --------- Handle budget selection change ---------
function handleBudgetChange() {
  const val = document.getElementById("budgetSelect").value;
  if (val === "create_new") {
    document.getElementById("newBudgetSection").style.display = "block";
    document.getElementById("inviteSection").style.display = "none";
    budgetId = null;
    document.getElementById("currentBudget").innerText = "None";
    clearTransactionsTable();
  } else {
    document.getElementById("newBudgetSection").style.display = "none";
    document.getElementById("inviteSection").style.display = "block";
    budgetId = val;
    const selectedBudget = budgets.find(b => b.id === val);
    document.getElementById("currentBudget").innerText = selectedBudget ? selectedBudget.name : val;
    listenToBudget();
  }
}

// --------- Create new budget ---------
function createNewBudget() {
  const name = document.getElementById("newBudgetName").value.trim();
  if (!name) return alert("Enter a budget name");

  const newBudgetRef = db.collection("budgets").doc();
  newBudgetRef.set({
    name,
    ownerId: userId,
    members: [userId],
    transactions: []
  }).then(() => {
    budgetId = newBudgetRef.id;
    document.getElementById("currentBudget").innerText = name;
    document.getElementById("newBudgetSection").style.display = "none";
    document.getElementById("newBudgetName").value = "";
    fetchUserBudgets();
    listenToBudget();
  }).catch(err => alert(err.message));
}

// --------- Invite user to budget ---------
function inviteUser() {
  const email = document.getElementById("inviteEmail").value.trim();
  if (!email) return alert("Enter an email");

  db.collection("users").where("email", "==", email).get()
    .then(snapshot => {
      if (snapshot.empty) return alert("User not found");
      const uid = snapshot.docs[0].id;
      db.collection("budgets").doc(budgetId).update({
        members: firebase.firestore.FieldValue.arrayUnion(uid)
      }).then(() => {
        alert("User added!");
        document.getElementById("inviteEmail").value = "";
      });
    })
    .catch(err => alert(err.message));
}

// --------- Listen to budget transactions ---------
let unsubscribeBudget = null;
function listenToBudget() {
  if (!budgetId) return;

  if (unsubscribeBudget) unsubscribeBudget();

  const budgetRef = db.collection("budgets").doc(budgetId);
  unsubscribeBudget = budgetRef.onSnapshot(doc => {
    if (doc.exists) {
      transactions = doc.data().transactions || [];
      updateTransactionsTable();
    } else {
      transactions = [];
      updateTransactionsTable();
    }
  });
}

// --------- Add transaction ---------
function addTransaction() {
  if (!userId || !budgetId) return alert("Select or create a budget first!");
  const text = document.getElementById("text").value.trim();
  const amount = Number(document.getElementById("amount").value);
  const category = document.getElementById("category").value;
  if (!text || !amount) return alert("Enter valid description and amount");

  transactions.push({ id: Date.now(), text, amount, category });
  saveData();
  updateTransactionsTable();

  document.getElementById("text").value = "";
  document.getElementById("amount").value = "";
}

// --------- Save transactions ---------
function saveData() {
  if (!budgetId) return;
  db.collection("budgets").doc(budgetId).set({ transactions }, { merge: true })
    .catch(err => alert(err.message));
}

// --------- Update transactions table ---------
function updateTransactionsTable() {
  const tbody = document.getElementById("transactionsTableBody");
  tbody.innerHTML = "";
  transactions.forEach(t => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(t.text)}</td>
      <td>${escapeHtml(t.category)}</td>
      <td>${t.amount}</td>
      <td>
        <button onclick="editTransaction(${t.id})">✏️</button>
        <button onclick="deleteTransaction(${t.id})">🗑</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

// --------- Clear table ---------
function clearTransactionsTable() {
  document.getElementById("transactionsTableBody").innerHTML = "";
}

// --------- Delete transaction ---------
function deleteTransaction(id) {
  if (!budgetId) return;
  transactions = transactions.filter(t => t.id !== id);
  saveData();
  updateTransactionsTable();
}

// --------- Edit transaction ---------
function editTransaction(id) {
  const tx = transactions.find(t => t.id === id);
  if (!tx) return alert("Transaction not found");
  const newText = prompt("Edit description:", tx.text);
  if (newText === null) return;
  const newAmountStr = prompt("Edit amount:", tx.amount);
  if (newAmountStr === null) return;
  const newAmount = Number(newAmountStr);
  if (isNaN(newAmount) || newAmount === 0) return alert("Invalid amount");
  const newCategory = prompt("Edit category (Food, Rent, Travel, Other):", tx.category);
  if (newCategory === null || !["Food","Rent","Travel","Other"].includes(newCategory)) return alert("Invalid category");

  tx.text = newText.trim();
  tx.amount = newAmount;
  tx.category = newCategory;

  saveData();
  updateTransactionsTable();
}

// --------- Escape HTML ---------
function escapeHtml(text) {
  return text.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
