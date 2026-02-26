const STORAGE_KEY = "med-practice-bank-v1";

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) return JSON.parse(raw);
  const seed = {
    questions: [
      {
        id: crypto.randomUUID(),
        text: "Which electrolyte abnormality is most associated with peaked T waves on ECG?",
        options: { a: "Hypocalcemia", b: "Hyperkalemia", c: "Hyponatremia", d: "Hypermagnesemia", e: "Hypophosphatemia" },
        correct: "b",
        module: "Cardiology",
        lecture: "ECG Basics"
      }
    ],
    attempts: []
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  return seed;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function switchTab(id) {
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.id === id));
  document.querySelectorAll("nav button").forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === id));
  if (id === "practice") renderPractice();
  if (id === "stats") renderStats();
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error("CSV must include header and at least one row.");
  const headers = lines[0].split(",").map((h) => h.trim());
  const required = ["text", "option_a", "option_b", "option_c", "option_d", "option_e", "correct_option", "module", "lecture"];
  required.forEach((field) => {
    if (!headers.includes(field)) throw new Error(`Missing column: ${field}`);
  });

  return lines.slice(1).map((line, idx) => {
    const cells = line.split(",").map((c) => c.trim());
    const row = Object.fromEntries(headers.map((h, i) => [h, cells[i] || ""]));
    const correct = row.correct_option.toLowerCase();
    if (!["a", "b", "c", "d", "e"].includes(correct)) {
      throw new Error(`Row ${idx + 2}: correct_option must be a-e`);
    }
    return {
      id: crypto.randomUUID(),
      text: row.text,
      options: {
        a: row.option_a,
        b: row.option_b,
        c: row.option_c,
        d: row.option_d,
        e: row.option_e
      },
      correct,
      module: row.module,
      lecture: row.lecture
    };
  });
}

function getFilteredQuestions() {
  const selected = document.getElementById("moduleFilter").value;
  return selected === "all" ? state.questions : state.questions.filter((q) => q.module === selected);
}

function renderPractice() {
  const filter = document.getElementById("moduleFilter");
  const modules = [...new Set(state.questions.map((q) => q.module))].sort();
  const current = filter.value;
  filter.innerHTML = `<option value="all">All modules</option>` + modules.map((m) => `<option value="${m}">${m}</option>`).join("");
  filter.value = modules.includes(current) || current === "all" ? current : "all";

  const pool = getFilteredQuestions();
  const area = document.getElementById("questionArea");
  const result = document.getElementById("practiceResult");
  result.innerHTML = "";

  if (!pool.length) {
    area.innerHTML = "<p>No questions match this filter. Upload more questions.</p>";
    return;
  }

  const q = pool[Math.floor(Math.random() * pool.length)];
  area.innerHTML = `
    <h3>${q.text}</h3>
    <p><strong>Tag:</strong> ${q.module} / ${q.lecture}</p>
    <form id="answerForm">
      ${Object.entries(q.options).map(([k, v]) => `<label class="choice"><input type="radio" name="answer" value="${k}" required/> ${k.toUpperCase()}. ${v}</label>`).join("")}
      <button type="submit">Submit Answer</button>
    </form>
  `;

  document.getElementById("answerForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const selected = new FormData(e.target).get("answer");
    const correct = selected === q.correct;
    state.attempts.push({
      questionId: q.id,
      selected,
      isCorrect: correct,
      answeredAt: new Date().toISOString()
    });
    saveState();
    result.innerHTML = `<p class="alert ${correct ? "ok" : "bad"}">${correct ? "Correct!" : `Not quite. Correct: ${q.correct.toUpperCase()} - ${q.options[q.correct]}`}</p>`;
    renderPractice();
  });
}

function renderStats() {
  const total = state.attempts.length;
  const correct = state.attempts.filter((a) => a.isCorrect).length;
  const accuracy = total ? ((correct / total) * 100).toFixed(1) : "0.0";
  document.getElementById("statsOverview").innerHTML = `
    <p><strong>Total attempts:</strong> ${total}</p>
    <p><strong>Correct:</strong> ${correct}</p>
    <p><strong>Accuracy:</strong> ${accuracy}%</p>
    <p><strong>Total questions in bank:</strong> ${state.questions.length}</p>
  `;

  const moduleMap = new Map();
  const lectureRows = [];

  state.questions.forEach((q) => {
    const attempts = state.attempts.filter((a) => a.questionId === q.id);
    const c = attempts.filter((a) => a.isCorrect).length;
    const key = q.module;
    if (!moduleMap.has(key)) moduleMap.set(key, { attempts: 0, correct: 0 });
    moduleMap.get(key).attempts += attempts.length;
    moduleMap.get(key).correct += c;
    if (attempts.length) {
      lectureRows.push({
        module: q.module,
        lecture: q.lecture,
        attempts: attempts.length,
        accuracy: (c / attempts.length) * 100
      });
    }
  });

  const moduleTable = [...moduleMap.entries()].map(([module, v]) => {
    const acc = v.attempts ? ((v.correct / v.attempts) * 100).toFixed(1) : "0.0";
    return `<tr><td>${module}</td><td>${v.attempts}</td><td>${v.correct}</td><td>${acc}%</td></tr>`;
  }).join("");

  document.getElementById("moduleStats").innerHTML = moduleTable
    ? `<table><thead><tr><th>Module</th><th>Attempts</th><th>Correct</th><th>Accuracy</th></tr></thead><tbody>${moduleTable}</tbody></table>`
    : "<p>No attempts yet.</p>";

  const weakest = lectureRows.sort((a, b) => a.accuracy - b.accuracy).slice(0, 5);
  document.getElementById("weakAreas").innerHTML = weakest.length
    ? `<ol>${weakest.map((r) => `<li>${r.module} / ${r.lecture}: ${r.accuracy.toFixed(1)}% (${r.attempts} attempts)</li>`).join("")}</ol>`
    : "<p>Weak areas appear after first attempts.</p>";
}

const state = loadState();

document.querySelectorAll("nav button").forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

document.getElementById("moduleFilter").addEventListener("change", renderPractice);

document.getElementById("singleQuestionForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  const correct = (form.get("correct") || "").toString().trim().toLowerCase();
  if (!["a", "b", "c", "d", "e"].includes(correct)) {
    alert("Correct option must be a, b, c, d, or e.");
    return;
  }
  state.questions.push({
    id: crypto.randomUUID(),
    text: form.get("text").toString().trim(),
    options: {
      a: form.get("a").toString().trim(),
      b: form.get("b").toString().trim(),
      c: form.get("c").toString().trim(),
      d: form.get("d").toString().trim(),
      e: form.get("e").toString().trim()
    },
    correct,
    module: form.get("module").toString().trim(),
    lecture: form.get("lecture").toString().trim()
  });
  saveState();
  e.target.reset();
  document.getElementById("uploadMessage").textContent = "Question saved.";
  renderPractice();
  renderStats();
});

document.getElementById("uploadCsvBtn").addEventListener("click", async () => {
  const fileInput = document.getElementById("csvFile");
  const file = fileInput.files[0];
  const msg = document.getElementById("uploadMessage");
  if (!file) {
    msg.textContent = "Choose a CSV file first.";
    return;
  }
  try {
    const text = await file.text();
    const rows = parseCSV(text);
    state.questions.push(...rows);
    saveState();
    msg.textContent = `Imported ${rows.length} question(s).`;
    renderPractice();
    renderStats();
  } catch (err) {
    msg.textContent = err.message;
  }
});

renderPractice();
renderStats();
