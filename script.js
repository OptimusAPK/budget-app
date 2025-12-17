// 🔥 Firebase Config (REPLACE WITH YOUR OWN)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

let transactions = [];
let userId = null;

// 🔐 Login
function login() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider);
}

// 👤 Auth State
auth.onAuthStateChanged(user => {
  if (user) {
    userId = user.uid;
    document.getElementById("userInfo").innerText =
      `Logged in as ${user.displayName}`;
    loadData();
  }
});

// 💾 Add Transaction
function addTransaction() {
  const text = document.getElementById("text").value;
  const amount = +document.getElementById("amount").value;
  const category = document.getElementById("category").value;

  if (!text || amount === 0 || !userId) return;

  transactions.push({ text, amount, category });
  saveData();

  document.getElementById("text").value = "";
  document.getElementById("amount").value = "";

  updateUI();
}

// ☁️ Save to Firestore
function saveData() {
  db.collection("budgets").doc(userId).set({
    transactions
  });
}

// ☁️ Load from Firestore
function loadData() {
  db.collection("budgets").doc(userId).get().then(doc => {
    if (doc.exists) {
      transactions = doc.data().transactions || [];
      updateUI();
    }
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
      <span>$${t.amount}</span>
    `;

    list.appendChild(li);
  });

  document.getElementById("balance").innerText = balance;
}
