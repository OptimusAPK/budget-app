let transactions = JSON.parse(localStorage.getItem("transactions")) || [];

function addTransaction() {
  const text = document.getElementById("text").value;
  const amount = +document.getElementById("amount").value;

  if (text === "" || amount === 0) return;

  transactions.push({ text, amount });
  localStorage.setItem("transactions", JSON.stringify(transactions));

  document.getElementById("text").value = "";
  document.getElementById("amount").value = "";

  updateUI();
}

function updateUI() {
  const list = document.getElementById("list");
  list.innerHTML = "";

  let balance = 0;

  transactions.forEach(t => {
    balance += t.amount;

    const li = document.createElement("li");
    li.classList.add(t.amount > 0 ? "plus" : "minus");
    li.innerHTML = `${t.text} <span>$${t.amount}</span>`;
    list.appendChild(li);
  });

  document.getElementById("balance").innerText = balance;
}

updateUI();

