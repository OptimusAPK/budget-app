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
let currentTransactions = [];

// ---------- AUTH ----------
function loginWithGoogle() { 
  auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(err => showError(err.message)); 
}

function toggleEmail() { 
  document.getElementById("emailBox").style.display = document.getElementById("emailBox").style.display === "none" ? "block" : "none"; 
}

function emailLogin() { 
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  
  if(!email || !password) {
    showError("Please enter email and password");
    return;
  }
  
  auth.signInWithEmailAndPassword(email, password).catch(err => showError(err.message)); 
}

function emailSignup() { 
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  
  if(!email || !password) {
    showError("Please enter email and password");
    return;
  }
  
  if(password.length < 6) {
    showError("Password must be at least 6 characters");
    return;
  }
  
  auth.createUserWithEmailAndPassword(email, password).catch(err => showError(err.message)); 
}

function logout() { 
  localStorage.removeItem("lastBudgetId"); 
  auth.signOut(); 
  location.reload(); 
}

auth.onAuthStateChanged(u => {
  if (!u) { 
    document.getElementById("loginSection").style.display = "block"; 
    document.getElementById("appSection").style.display = "none"; 
    document.getElementById("userInfo").innerText = ""; 
    return; 
  }

  user = u;
  db.collection("users").doc(user.uid).set({ 
    uid: user.uid, 
    email: user.email, 
    name: user.displayName || user.email,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  document.getElementById("loginSection").style.display = "none";
  document.getElementById("appSection").style.display = "block";
  document.getElementById("userInfo").innerText = "👋 Welcome, " + (user.displayName || user.email);

  loadBudgets();
  loadUsers();
});

// ---------- BUDGET ----------
function loadBudgets() {
  db.collection("budgets").where("members","array-contains",user.uid)
    .orderBy("createdAt", "desc")
    .get()
    .then(snap => {
      const budgetSelect = document.getElementById("budgetSelect");
      budgetSelect.innerHTML = `<option disabled>Select Budget</option>`;
      let lastBudget = localStorage.getItem("lastBudgetId");
      let selectedBudgetSet = false;

      snap.forEach(doc => {
        const opt = document.createElement("option");
        opt.value = doc.id;
        opt.textContent = doc.data().name;
        budgetSelect.appendChild(opt);

        if (doc.id === lastBudget) {
          budgetSelect.value = lastBudget;
          budgetId = lastBudget;
          selectedBudgetSet = true;
          document.getElementById("currentBudget").innerText = "📊 " + doc.data().name;
          document.getElementById("addUserBtn").style.display = "inline-flex";
          listenTransactions();
        }
      });

      budgetSelect.innerHTML += `<option value="new">➕ Create New Budget</option>`;

      if(selectedBudgetSet){
        listenTransactions();
      }
    })
    .catch(err => showError("Failed to load budgets: " + err.message));
}

function onBudgetChange() {
  const budgetSelect = document.getElementById("budgetSelect");
  
  if(budgetSelect.value === "new"){ 
    document.getElementById("createBudgetDiv").style.display = "block";
    document.getElementById("addUserBtn").style.display = "none";
    document.getElementById("summaryDiv").style.display = "none";
    budgetId = null;
    document.getElementById("currentBudget").innerText = "📝 Creating New Budget";
  } else {
    document.getElementById("createBudgetDiv").style.display = "none";
    document.getElementById("addUserBtn").style.display = "inline-flex";
    budgetId = budgetSelect.value;
    localStorage.setItem("lastBudgetId", budgetId);
    document.getElementById("currentBudget").innerText = "📊 " + budgetSelect.options[budgetSelect.selectedIndex].text;
    listenTransactions();
  }
}

// ---------- CREATE NEW BUDGET ----------
function createBudget() {
  const newBudgetName = document.getElementById("newBudgetName").value;
  
  if(!newBudgetName) {
    showError("Please enter a budget name");
    return;
  }

  db.collection("budgets").add({
    name: newBudgetName,
    ownerId: user.uid,
    members: [user.uid],
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(docRef => {
    document.getElementById("newBudgetName").value = "";
    document.getElementById("createBudgetDiv").style.display = "none";
    loadBudgets();
    
    // Auto-select the new budget
    setTimeout(() => {
      document.getElementById("budgetSelect").value = docRef.id;
      onBudgetChange();
    }, 100);
  })
  .catch(err => showError("Failed to create budget: " + err.message));
}

// ---------- USERS ----------
function loadUsers() {
  db.collection("users").get().then(snap=>{
    const usersDropdown = document.getElementById("usersDropdown");
    usersDropdown.innerHTML = `<option disabled selected>Select user to add</option>`;
    snap.forEach(d=>{
      if(d.id !== user.uid){
        usersDropdown.innerHTML += `<option value="${d.id}">${sanitizeHtml(d.data().name || d.data().email)}</option>`;
      }
    });
  })
  .catch(err => showError("Failed to load users: " + err.message));
}

function toggleAddUser(){ 
  const addUserDiv = document.getElementById("addUserDiv");
  addUserDiv.style.display = addUserDiv.style.display === "none" ? "block" : "none"; 
}

function addUser(){
  if(!budgetId) {
    showError("Select a budget first");
    return;
  }
  
  const usersDropdown = document.getElementById("usersDropdown");
  if(!usersDropdown.value) {
    showError("Select a user to add");
    return;
  }
  
  db.collection("budgets").doc(budgetId).update({ 
    members: firebase.firestore.FieldValue.arrayUnion(usersDropdown.value) 
  })
  .then(() => {
    usersDropdown.value = "";
    document.getElementById("addUserDiv").style.display = "none";
    showSuccess("Member added successfully!");
  })
  .catch(err => showError("Failed to add member: " + err.message));
}

// ---------- TRANSACTIONS ----------
function listenTransactions(){
  if(unsubscribe) unsubscribe();
  
  if(!budgetId) {
    document.getElementById("transactions").innerHTML = "";
    return;
  }
  
  // Start with a basic query, then order if all docs have createdAt
  let query = db.collection("budgets").doc(budgetId).collection("transactions");
  
  unsubscribe = query.onSnapshot(snap=>{
    const transactions = document.getElementById("transactions");
    const transactionsTable = document.getElementById("transactionsTable");
    const noTransactions = document.getElementById("noTransactions");
    const summaryDiv = document.getElementById("summaryDiv");
    
    currentTransactions = [];
    transactions.innerHTML = "";
    
    if(snap.empty) {
      noTransactions.style.display = "block";
      transactionsTable.style.display = "none";
      summaryDiv.style.display = "none";
      return;
    }
    
    noTransactions.style.display = "none";
    transactionsTable.style.display = "table";
    
    // Collect and sort transactions client-side for better compatibility
    const txArray = [];
    snap.forEach(doc => {
      txArray.push({id: doc.id, ...doc.data()});
    });
    
    // Sort by createdAt if available, otherwise by document order
    txArray.sort((a, b) => {
      if(a.createdAt && b.createdAt) {
        return b.createdAt.toDate() - a.createdAt.toDate();
      }
      return 0;
    });
    
    let total = 0;
    const categoryTotals = {};
    
    txArray.forEach(t => {
      currentTransactions.push(t);
      
      total += t.amount;
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
      
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${sanitizeHtml(t.text)}</td>
        <td><span class="category-badge">${t.category}</span></td>
        <td>₹${t.amount.toFixed(2)}</td>
        <td>
          <div class="action-buttons">
            <button onclick="editTransaction('${t.id}')">✏️ Edit</button>
            <button onclick="deleteTransaction('${t.id}')">🗑️ Delete</button>
          </div>
        </td>
      `;
      transactions.appendChild(row);
    });
    
    document.getElementById("txCount").textContent = txArray.length + " expense" + (txArray.length !== 1 ? "s" : "");
    updateSummary(total, categoryTotals);
  },
  err => console.error("Failed to load transactions:", err));
}

function updateSummary(total, categoryTotals) {
  const summaryDiv = document.getElementById("summaryDiv");
  const summaryContent = document.getElementById("summaryContent");
  
  if(total === 0) {
    summaryDiv.style.display = "none";
    return;
  }
  
  summaryDiv.style.display = "block";
  
  let html = `
    <div class="summary-item">
      <div class="summary-item-label">Total</div>
      <div class="summary-item-value">₹${total.toFixed(2)}</div>
    </div>
  `;
  
  // Sort categories by amount (descending)
  Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, amt]) => {
      html += `
        <div class="summary-item">
          <div class="summary-item-label">${cat}</div>
          <div class="summary-item-value">₹${amt.toFixed(2)}</div>
        </div>
      `;
    });
  
  summaryContent.innerHTML = html;
}

function addTransaction(){
  if(!budgetId) {
    showError("Select a budget first");
    return;
  }
  
  const desc = document.getElementById("desc").value;
  const cat = document.getElementById("cat").value;
  const amt = parseFloat(document.getElementById("amt").value);
  
  if(!desc) {
    showError("Please enter a description");
    return;
  }
  
  if(!cat) {
    showError("Please select a category");
    return;
  }
  
  if(!amt || amt <= 0) {
    showError("Please enter a valid amount");
    return;
  }
  
  db.collection("budgets").doc(budgetId)
    .collection("transactions").add({ 
      text: desc, 
      category: cat, 
      amount: amt, 
      createdAt: firebase.firestore.FieldValue.serverTimestamp(), 
      by: user.uid 
    })
    .then(() => {
      document.getElementById("desc").value = "";
      document.getElementById("cat").value = "";
      document.getElementById("amt").value = "";
      showSuccess("Expense added successfully!");
    })
    .catch(err => showError("Failed to add transaction: " + err.message));
}

function deleteTransaction(id) {
  if(!confirm("Are you sure you want to delete this expense?")) return;
  
  db.collection("budgets").doc(budgetId)
    .collection("transactions").doc(id).delete()
    .then(() => showSuccess("Expense deleted"))
    .catch(err => showError("Failed to delete: " + err.message));
}

function editTransaction(id) {
  const transaction = currentTransactions.find(t => t.id === id);
  if(!transaction) return;
  
  const newText = prompt("Edit description", transaction.text);
  if(newText === null) return;
  
  if(!newText) {
    showError("Description cannot be empty");
    return;
  }
  
  const newCat = prompt("Edit category", transaction.category);
  if(newCat === null) return;
  
  if(!newCat) {
    showError("Category cannot be empty");
    return;
  }
  
  const newAmt = prompt("Edit amount", transaction.amount);
  if(newAmt === null) return;
  
  const amount = parseFloat(newAmt);
  if(!amount || amount <= 0) {
    showError("Amount must be a positive number");
    return;
  }
  
  db.collection("budgets").doc(budgetId)
    .collection("transactions").doc(id).update({ 
      text: newText, 
      category: newCat, 
      amount: amount 
    })
    .then(() => showSuccess("Expense updated"))
    .catch(err => showError("Failed to update: " + err.message));
}

// ---------- UTILITIES ----------
function showError(message) {
  alert("❌ " + message);
}

function showSuccess(message) {
  console.log("✅ " + message);
}

function sanitizeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}
