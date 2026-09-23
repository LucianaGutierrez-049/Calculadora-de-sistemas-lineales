import { formatNumber } from "./doolittle.js";

const refs = {
  order: document.querySelector("#system-order"),
  matrixInputs: document.querySelector("#matrix-inputs"),
  vectorInputs: document.querySelector("#vector-inputs"),
  unknownVector: document.querySelector("#unknown-vector"),
  equationPreview: document.querySelector("#equation-preview"),
  status: document.querySelector("#status"),
  count: document.querySelector("#factorization-count"),
  currentOrder: document.querySelector("#current-order"),
  matrixState: document.querySelector("#matrix-state"),
  quickResult: document.querySelector("#quick-result"),
  results: document.querySelector("#results"),
  resultContent: document.querySelector("#result-content"),
  newVectorButton: document.querySelector("#new-vector")
};

export function getRefs() { return refs; }

export function generateInputs(order, initial = {}) {
  refs.matrixInputs.innerHTML = "";
  refs.vectorInputs.innerHTML = "";
  refs.unknownVector.innerHTML = "";
  refs.matrixInputs.style.gridTemplateColumns = `repeat(${order}, 58px)`;
  refs.vectorInputs.style.gridTemplateColumns = "58px";
  refs.unknownVector.style.gridTemplateColumns = "30px";
  refs.currentOrder.textContent = `${order} × ${order}`;

  for (let i = 0; i < order; i += 1) {
    for (let j = 0; j < order; j += 1) {
      const input = document.createElement("input");
      input.type = "number";
      input.step = "any";
      input.inputMode = "decimal";
      input.className = "coefficient-input";
      input.dataset.matrix = "A";
      input.dataset.row = String(i);
      input.dataset.col = String(j);
      input.dataset.testid = `a-${i}-${j}`;
      input.setAttribute("aria-label", `Coeficiente a ${i + 1} ${j + 1}`);
      input.value = initial.A?.[i]?.[j] ?? "";
      refs.matrixInputs.append(input);
    }

    const unknown = document.createElement("span");
    unknown.innerHTML = `x<sub>${i + 1}</sub>`;
    refs.unknownVector.append(unknown);

    const vectorInput = document.createElement("input");
    vectorInput.type = "number";
    vectorInput.step = "any";
    vectorInput.inputMode = "decimal";
    vectorInput.className = "vector-input";
    vectorInput.dataset.vector = "b";
    vectorInput.dataset.row = String(i);
    vectorInput.dataset.testid = `b-${i}`;
    vectorInput.setAttribute("aria-label", `Componente b ${i + 1}`);
    vectorInput.value = initial.b?.[i] ?? "";
    refs.vectorInputs.append(vectorInput);
  }
  updateEquationPreview();
}

function parseInput(input, label) {
  const raw = input.value.trim();
  if (raw === "") throw new Error(`El campo ${label} está vacío.`);
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`El campo ${label} debe contener un número finito.`);
  return value;
}

export function readMatrix() {
  const n = Number(refs.order.value);
  const matrix = Array.from({ length: n }, () => Array(n).fill(0));
  refs.matrixInputs.querySelectorAll("input").forEach((input) => {
    const i = Number(input.dataset.row);
    const j = Number(input.dataset.col);
    matrix[i][j] = parseInput(input, `a${i + 1}${j + 1}`);
  });
  return matrix;
}

export function readVector() {
  const n = Number(refs.order.value);
  const vector = Array(n).fill(0);
  refs.vectorInputs.querySelectorAll("input").forEach((input) => {
    const i = Number(input.dataset.row);
    vector[i] = parseInput(input, `b${i + 1}`);
  });
  return vector;
}

export function fillData(A, b) {
  refs.order.value = String(A.length);
  generateInputs(A.length, { A, b });
}

export function fillVector(vector) {
  refs.vectorInputs.querySelectorAll("input").forEach((input) => {
    input.value = vector[Number(input.dataset.row)] ?? "";
  });
  updateEquationPreview();
}

export function setMatrixLocked(locked) {
  refs.matrixInputs.querySelectorAll("input").forEach((input) => { input.disabled = locked; });
  refs.matrixInputs.classList.toggle("locked", locked);
  refs.newVectorButton.textContent = locked ? "Editar matriz A" : "Nuevo vector b";
}

export function clearVector() {
  refs.vectorInputs.querySelectorAll("input").forEach((input) => { input.value = ""; });
  updateEquationPreview();
  refs.vectorInputs.querySelector("input")?.focus();
}

export function showStatus(message, type = "neutral") {
  refs.status.className = `status status-${type}`;
  refs.status.textContent = message;
}

export function updateCounter(value) {
  refs.count.textContent = String(value);
}

export function hideResults() {
  refs.results.hidden = true;
  refs.resultContent.innerHTML = "";
  refs.matrixState.textContent = "Sin factorizar";
  refs.quickResult.innerHTML = `
    <div class="empty-result-art" aria-hidden="true"><span>[</span><div><i></i><i></i><i></i><i></i></div><span>]</span></div>
    <h3>Aún no hay resultados</h3>
    <p>Completa la matriz y pulsa <strong>Resolver sistema</strong>. Aquí aparecerá la solución sin que pierdas de vista tus datos.</p>`;
}

function signedTerm(coefficient, variable, isFirst) {
  if (coefficient === "") return `${isFirst ? "" : "+ "}…${variable}`;
  const number = Number(coefficient);
  if (!Number.isFinite(number)) return `${isFirst ? "" : "+ "}?${variable}`;
  const abs = formatNumber(Math.abs(number));
  const core = `${abs === "1" ? "" : abs}${variable}`;
  if (isFirst) return number < 0 ? `−${core}` : core;
  return number < 0 ? `− ${core}` : `+ ${core}`;
}

export function updateEquationPreview() {
  const n = Number(refs.order.value);
  const matrixInputs = [...refs.matrixInputs.querySelectorAll("input")];
  const vectorInputs = [...refs.vectorInputs.querySelectorAll("input")];
  if (!matrixInputs.length) return;
  refs.equationPreview.innerHTML = "";
  for (let i = 0; i < n; i += 1) {
    const line = document.createElement("div");
    const terms = [];
    for (let j = 0; j < n; j += 1) {
      terms.push(signedTerm(matrixInputs[i * n + j].value, `x<sub>${j + 1}</sub>`, j === 0));
    }
    const rhs = vectorInputs[i]?.value.trim() || "…";
    line.innerHTML = `${terms.join(" ")} = ${rhs}`;
    refs.equationPreview.append(line);
  }
}

function matrixMarkup(matrix, label) {
  const columns = matrix[0]?.length ?? 1;
  const cells = matrix.flat().map((value) => `<span class="matrix-cell">${formatNumber(value)}</span>`).join("");
  return `<div class="math-card"><div class="math-card-title">${label}</div><div class="matrix-grid" style="grid-template-columns:repeat(${columns}, minmax(42px, auto))">${cells}</div></div>`;
}

function vectorMarkup(vector, label) {
  return matrixMarkup(vector.map((value) => [value]), label);
}

function quickMatrixMarkup(matrix, label, primary = false) {
  const columns = matrix[0]?.length ?? 1;
  const cells = matrix.flat().map((value) => `<span class="matrix-cell">${formatNumber(value)}</span>`).join("");
  return `<div class="quick-math-card ${primary ? "primary" : ""}"><div class="math-card-title">${label}</div><div class="matrix-grid" style="grid-template-columns:repeat(${columns}, minmax(30px, auto))">${cells}</div></div>`;
}

function renderQuickFactorization(factorization, luCorrect) {
  refs.matrixState.textContent = "LU disponible";
  refs.quickResult.innerHTML = `
    <div class="quick-solution-title">Factorización completada</div>
    <div class="quick-solution-caption">A quedó descompuesta y lista para resolver cualquier vector b.</div>
    <div class="quick-matrix-row factorization-row">
      ${quickMatrixMarkup(factorization.L, "Matriz L")}
      ${quickMatrixMarkup(factorization.U, "Matriz U")}
    </div>
    <div class="quick-checks"><div class="quick-check">LU = A: ${luCorrect ? "Correcta" : "Revisar"}</div></div>
    <a class="quick-detail-link" href="#results">Ver desarrollo completo <span>↓</span></a>`;
}

function renderQuickSolution(factorization, solution, luCorrect, axCorrect, reused) {
  refs.matrixState.textContent = reused ? "LU reutilizada" : "Sistema resuelto";
  refs.quickResult.innerHTML = `
    <div class="quick-solution-title">Vector solución</div>
    <div class="quick-solution-caption">${reused ? "Calculado reutilizando L y U." : "Calculado mediante dos sustituciones."}</div>
    <div class="quick-matrix-row solution-row">
      ${quickMatrixMarkup(solution.x.map((value) => [value]), "X", true)}
      ${quickMatrixMarkup(solution.y.map((value) => [value]), "Y")}
      ${quickMatrixMarkup(factorization.L, "L")}
      ${quickMatrixMarkup(factorization.U, "U")}
    </div>
    <div class="quick-checks">
      <div class="quick-check">LU = A: ${luCorrect ? "Correcta" : "Revisar"}</div>
      <div class="quick-check">AX = b: ${axCorrect ? "Correcta" : "Revisar"}</div>
    </div>
    <a class="quick-detail-link" href="#results">Ver resolución paso a paso <span>↓</span></a>`;
}

function sectionMarkup(number, title, intro, body) {
  return `<section class="procedure-section"><div class="section-number">${number}</div><div class="procedure-body"><h3>${title}</h3><p class="procedure-intro">${intro}</p>${body}</div></section>`;
}

function sumExpression(terms, leftPrefix, rightPrefix) {
  if (!terms.length) return "0";
  return terms.map((term) => `(${formatNumber(term.left ?? term.coefficient)})(${formatNumber(term.right ?? term.known)})`).join(" + ");
}

function factorStepMarkup(step) {
  const row = step.i + 1;
  const col = step.j + 1;
  const products = sumExpression(step.terms);
  if (step.type === "U") {
    return `<div class="calculation-step"><strong>u<sub>${row}${col}</sub></strong> = a<sub>${row}${col}</sub> − Σ l<sub>${row}k</sub>u<sub>k${col}</sub> = ${formatNumber(step.source)} − (${products}) = <strong>${formatNumber(step.value)}</strong></div>`;
  }
  return `<div class="calculation-step"><strong>l<sub>${row}${col}</sub></strong> = [a<sub>${row}${col}</sub> − Σ l<sub>${row}k</sub>u<sub>k${col}</sub>] / u<sub>${col}${col}</sub> = [${formatNumber(step.source)} − (${products})] / ${formatNumber(step.pivot)} = <strong>${formatNumber(step.value)}</strong></div>`;
}

function substitutionStepMarkup(step, kind) {
  const index = step.i + 1;
  const symbol = kind === "forward" ? "y" : "x";
  const matrixSymbol = kind === "forward" ? "l" : "u";
  const products = step.terms.length
    ? step.terms.map((term) => `(${formatNumber(term.coefficient)})(${formatNumber(term.known)})`).join(" + ")
    : "0";
  return `<div class="calculation-step"><strong>${symbol}<sub>${index}</sub></strong> = [${formatNumber(step.rhs)} − (${products})] / ${matrixSymbol}<sub>${index}${index}</sub> = ${formatNumber(step.numerator)} / ${formatNumber(step.diagonal)} = <strong>${formatNumber(step.value)}</strong></div>`;
}

function equationsMarkup(A, b) {
  return A.map((row, i) => {
    const terms = row.map((coefficient, j) => {
      const abs = formatNumber(Math.abs(coefficient));
      const core = `${abs === "1" ? "" : abs}x<sub>${j + 1}</sub>`;
      if (j === 0) return coefficient < 0 ? `−${core}` : core;
      return coefficient < 0 ? `− ${core}` : `+ ${core}`;
    }).join(" ");
    return `<div class="calculation-step">${terms} = ${formatNumber(b[i])}</div>`;
  }).join("");
}

export function renderFactorization(A, factorization, luProduct, luCorrect) {
  refs.results.hidden = false;
  renderQuickFactorization(factorization, luCorrect);
  refs.resultContent.innerHTML =
    sectionMarkup("1", "Datos ingresados", "La matriz cuadrada que se factorizará.", `<div class="math-row">${matrixMarkup(A, "Matriz A")}</div>`) +
    sectionMarkup("2", "Factorización Doolittle", "Se inicializa L como identidad y U como matriz nula. Luego se calculan primero los elementos de U y después los de L en cada etapa.",
      `<div class="matrix-pair">${matrixMarkup(identity(A.length), "L inicial")}${matrixMarkup(zeros(A.length), "U inicial")}</div><div class="step-list">${factorization.steps.map(factorStepMarkup).join("")}</div>`) +
    sectionMarkup("3", "Matrices L y U", "L es triangular inferior con diagonal unitaria; U es triangular superior.",
      `<div class="matrix-pair">${matrixMarkup(factorization.L, "Matriz L")}${matrixMarkup(factorization.U, "Matriz U")}</div><div class="verification-grid"><div class="verification-card"><div class="math-card-title">Producto LU</div>${matrixMarkup(luProduct, "L · U")}<div class="verification-status ${luCorrect ? "" : "fail"}">Verificación LU = A: ${luCorrect ? "Correcta" : "No coincide"}</div></div></div>`);
}

export function renderSolution({ A, b, factorization, solution, luProduct, axProduct, luCorrect, axCorrect, reused }) {
  refs.results.hidden = false;
  renderQuickSolution(factorization, solution, luCorrect, axCorrect, reused);
  refs.resultContent.innerHTML =
    sectionMarkup("1", "Datos ingresados", "El sistema se representa en la forma matricial AX = b.",
      `<div class="step-list">${equationsMarkup(A, b)}</div><div class="math-row">${matrixMarkup(A, "Matriz A")}${vectorMarkup(b, "Vector b")}</div>`) +
    sectionMarkup("2", "Factorización Doolittle", "Se usa la formulación indicada en la guía teórica: L comienza como identidad y U como matriz nula.",
      `${reused ? '<div class="reuse-note">Se están reutilizando las matrices L y U previamente calculadas. No es necesario volver a factorizar A.</div>' : `<div class="matrix-pair">${matrixMarkup(identity(A.length), "L inicial")}${matrixMarkup(zeros(A.length), "U inicial")}</div><div class="step-list">${factorization.steps.map(factorStepMarkup).join("")}</div>`}`) +
    sectionMarkup("3", "Matrices L y U", "El producto de las matrices reconstruye la matriz original.",
      `<div class="matrix-pair">${matrixMarkup(factorization.L, "Matriz L")}${matrixMarkup(factorization.U, "Matriz U")}</div>`) +
    sectionMarkup("4", "Sustitución hacia adelante", "Se resuelve LY = b desde la primera ecuación hasta la última.",
      `<div class="step-list">${solution.forwardSteps.map((step) => substitutionStepMarkup(step, "forward")).join("")}</div>${vectorMarkup(solution.y, "Vector Y")}`) +
    sectionMarkup("5", "Sustitución hacia atrás", "Se resuelve UX = Y desde la última ecuación hasta la primera.",
      `<div class="step-list">${solution.backwardSteps.map((step) => substitutionStepMarkup(step, "backward")).join("")}</div>`) +
    sectionMarkup("6", "Solución", "El vector X contiene el valor de cada incógnita.",
      `<div class="solution-grid"><div class="solution-card">${vectorMarkup(solution.x, "Vector solución X")}</div></div>`) +
    sectionMarkup("7", "Comprobación", "Se verifican numéricamente tanto la factorización como la solución obtenida.",
      `<div class="verification-grid"><div class="verification-card"><div class="math-card-title">L · U frente a A</div><div class="matrix-pair">${matrixMarkup(luProduct, "Producto LU")}${matrixMarkup(A, "Matriz A")}</div><div class="verification-status ${luCorrect ? "" : "fail"}">Verificación LU = A: ${luCorrect ? "Correcta" : "No coincide"}</div></div><div class="verification-card"><div class="math-card-title">A · X frente a b</div><div class="matrix-pair">${vectorMarkup(axProduct, "Producto AX")}${vectorMarkup(b, "Vector b")}</div><div class="verification-status ${axCorrect ? "" : "fail"}">Verificación AX = b: ${axCorrect ? "Correcta" : "No coincide"}</div></div></div>`);
}

function identity(n) {
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j ? 1 : 0));
}

function zeros(n) {
  return Array.from({ length: n }, () => Array(n).fill(0));
}
