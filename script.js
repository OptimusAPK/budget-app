 const firebaseConfig = {
    apiKey: "AIzaSyAE0DpuMOtf6gcMTNTh22jOPaovXSzKYBU",
    authDomain: "budget-app-193ef.firebaseapp.com",
    projectId: "budget-app-193ef",
    storageBucket: "budget-app-193ef.firebasestorage.app",
    messagingSenderId: "875342270120",
    appId: "1:875342270120:web:e5304dae0d056552217c9d",
    measurementId: "G-YYQDZR9YHV"
  };

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

let transactions = [];
let userId = null;
let budgetId = null;

// 🔐 Login
document.getElementById("loginBtn").addEventListener("click", () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider);
});

// 👤 Auth State
auth.onAuthStateChanged(user => {
  if (user) {
    userId = user.uid;
    document.getElementById("userInfo").innerText = `Logged in as ${user.displayName}`;
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("appSection").style.display = "block";
  } else {
    // Ensure app is hidden if not logged in
    document.getElementById("loginSection").style.display = "block";
    document.getElementById("appSection").style.display = "none";
  }
});

// 👥 Join or Create Budget
function joinBudget() {
  if (!userId) return alert("Login first!");
  
  const input = document.getElementById("budgetIdInput").value.trim();
  if (!input) return alert("Enter a Budget ID!");

  budgetId = input;
  document.getElementById("currentBudget").innerText = budgetId;

  const budgetRef = db.collection("budgets").doc(budgetId);

  budgetRef.get().then(doc => {
    if (!doc.exists) {
      budgetRef.set({
        ownerId: userId,
        members: [userId],
        transactions: []
      });
    } else {
      budgetRef.update({
        members: firebase.firestore.FieldValue.arrayUnion(userId)
      });
    }
    listenToBudget();
  });
}

// 🔄 Real-time Listener
function listenToBudget() {
  db.collection("budgets").doc(budgetId)
    .onSnapshot(doc => {
      if (doc.exists) {
        transactions = doc.data().transactions || [];
        updateUI();
      }
    });
}

// ➕ Add Transaction
function addTransaction() {
  if (!userId || !budgetId) return alert("Login and join a budget first!");

  const text = document.getElementById("text").value;
  const amount = +document.getElementById("amount").value;
  const category = document.getElementById("category").value;

  if (!text || amount === 0) return alert("Enter description and amount!");

  transactions.push({
    id: Date.now(),
    text,
    amount,
    category
  });

  saveData();
  updateUI();

  document.getElementById("text").value = "";
  document.getElementById("amount").value = "";
}

// ✏️ Edit Transaction
function editTransaction(id) {
  if (!userId || !budgetId) return alert("Login and join a budget first!");

  const t = transactions.find(t => t.id === id);
  if (!t) return;

  const newText = prompt("Edit description:", t.text);
  const newAmount = prompt("Edit amount:", t.amount);

  if (newText === null || newAmount === null) return;

  t.text = newText;
  t.amount = +newAmount;

  saveData();
  updateUI();
}

// 🗑 Delete Transaction
function deleteTransaction(id) {
  if (!userId || !budgetId) return alert("Login and join a budget first!");

  transactions = transactions.filter(t => t.id !== id);
  saveData();
  updateUI();
}

// ☁️ Save to Firestore
function saveData() {
  if (!budgetId) return;

  db.collection("budgets").doc(budgetId).update({
    transactions
  });
}

// 🔄 Update UI
function updateUI() {
  const list = document.getElementById("list");
  list.innerHTML = "";

  let balance = 0;

  transactions.forEach(t => {
    balance += t.amount;

    const li = document.createElement("li");
    li.className = t.amount > 0 ? "plus" : "minus";

    li.innerHTML = `
      <div>
        ${t.text}
        <small>${t.category}</small>
      </div>
      <div class="actions">
        <span>$${t.amount}</span>
        <button onclick="editTransaction(${t.id})">✏️</button>
        <button onclick="deleteTransaction(${t.id})">🗑</button>
      </div>
    `;

    list.appendChild(li);
  });

  document.getElementById("balance").innerText = balance;
}
