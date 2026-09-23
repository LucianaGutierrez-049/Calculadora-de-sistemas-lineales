import {
  doolittle,
  solveWithLU,
  multiplyMatrices,
  multiplyMatrixVector,
  approximatelyEqualMatrix,
  approximatelyEqualVector
} from "./doolittle.js";
import {
  getRefs,
  generateInputs,
  readMatrix,
  readVector,
  fillData,
  fillVector,
  setMatrixLocked,
  clearVector,
  showStatus,
  updateCounter,
  updateEquationPreview,
  hideResults,
  renderFactorization,
  renderSolution
} from "./ui.js";

const refs = getRefs();
const buttons = {
  load: document.querySelector("#load-example"),
  loadSecond: document.querySelector("#load-second"),
  factorize: document.querySelector("#factorize"),
  solve: document.querySelector("#solve"),
  newVector: document.querySelector("#new-vector"),
  clear: document.querySelector("#clear")
};

const TASK = {
  A: [[4, 2, 1], [12, 10, 5], [-8, 8, 7]],
  b1: [14, 46, 26],
  b2: [20, 62, 30]
};

const state = {
  cache: null,
  factorizationCount: 0,
  matrixLocked: false
};

function matrixSignature(A) {
  return JSON.stringify(A);
}

function setActivePreset(number = null) {
  document.querySelectorAll(".exercise-button").forEach((button) => {
    button.classList.toggle("is-active", button.id === (number === 1 ? "load-example" : number === 2 ? "load-second" : ""));
  });
}

function vectorsMatch(left, right) {
  return left.length === right.length && left.every((value, index) => Math.abs(value - right[index]) < 1e-9);
}

function presetForVector(b) {
  if (vectorsMatch(b, TASK.b1)) return 1;
  if (vectorsMatch(b, TASK.b2)) return 2;
  return null;
}

function invalidateFactorization(message = "La matriz A cambió: la factorización anterior fue invalidada.") {
  if (state.cache) showStatus(message, "warning");
  state.cache = null;
  hideResults();
}

function factorizeCurrentMatrix() {
  const A = readMatrix();
  const factorization = doolittle(A);
  const signature = matrixSignature(A);
  state.cache = { signature, A: A.map((row) => [...row]), factorization };
  state.factorizationCount += 1;
  updateCounter(state.factorizationCount);
  return { A, factorization };
}

function ensureCurrentFactorization(A) {
  const signature = matrixSignature(A);
  if (state.cache?.signature === signature) {
    return { factorization: state.cache.factorization, reused: true };
  }
  const factorization = doolittle(A);
  state.cache = { signature, A: A.map((row) => [...row]), factorization };
  state.factorizationCount += 1;
  updateCounter(state.factorizationCount);
  return { factorization, reused: false };
}

function handleError(error) {
  showStatus(error?.message || "Ocurrió un error inesperado.", "error");
}

refs.order.addEventListener("change", () => {
  setActivePreset();
  setMatrixLocked(false);
  state.matrixLocked = false;
  invalidateFactorization("Cambió el orden del sistema: ingresa una nueva matriz A.");
  generateInputs(Number(refs.order.value));
});

refs.matrixInputs.addEventListener("input", (event) => {
  if (event.target.matches("[data-matrix='A']")) {
    setActivePreset();
    invalidateFactorization();
  }
  updateEquationPreview();
});

refs.vectorInputs.addEventListener("input", () => {
  setActivePreset();
  updateEquationPreview();
});

buttons.load.addEventListener("click", () => {
  state.cache = null;
  state.factorizationCount = 0;
  updateCounter(0);
  state.matrixLocked = false;
  setMatrixLocked(false);
  fillData(TASK.A, TASK.b1);
  setActivePreset(1);
  hideResults();
  showStatus("Ejemplo cargado. Puedes cambiar cualquier valor de A o b antes de resolver.", "success");
});

buttons.loadSecond.addEventListener("click", () => {
  try {
    const taskSignature = matrixSignature(TASK.A);
    let canReuse = false;
    try {
      canReuse = matrixSignature(readMatrix()) === taskSignature && state.cache?.signature === taskSignature;
    } catch {
      canReuse = false;
    }

    let A;
    let factorization;
    if (canReuse) {
      A = state.cache.A.map((row) => [...row]);
      factorization = state.cache.factorization;
      fillVector(TASK.b2);
    } else {
      state.matrixLocked = false;
      setMatrixLocked(false);
      fillData(TASK.A, TASK.b1);
      ({ A, factorization } = factorizeCurrentMatrix());
      fillVector(TASK.b2);
    }

    state.matrixLocked = true;
    setMatrixLocked(true);
    setActivePreset(2);
    const luProduct = multiplyMatrices(factorization.L, factorization.U);
    const luCorrect = approximatelyEqualMatrix(luProduct, A);
    renderFactorization(A, factorization, luProduct, luCorrect);
    showStatus(
      canReuse
        ? "Nuevo vector b cargado. Se conservaron L y U; solo faltan las sustituciones LY = b y UX = Y."
        : "Ejemplo de reutilización preparado: A se factorizó una vez y L y U quedan guardadas para el nuevo vector b.",
      "success"
    );
  } catch (error) {
    handleError(error);
  }
});

buttons.factorize.addEventListener("click", () => {
  try {
    const { A, factorization } = factorizeCurrentMatrix();
    const luProduct = multiplyMatrices(factorization.L, factorization.U);
    const luCorrect = approximatelyEqualMatrix(luProduct, A);
    renderFactorization(A, factorization, luProduct, luCorrect);
    showStatus("Factorización completada. Las matrices L y U quedan disponibles para este y otros vectores b.", "success");
  } catch (error) {
    handleError(error);
  }
});

buttons.solve.addEventListener("click", () => {
  try {
    const A = readMatrix();
    const b = readVector();
    const { factorization, reused } = ensureCurrentFactorization(A);
    const solution = solveWithLU(factorization.L, factorization.U, b);
    const luProduct = multiplyMatrices(factorization.L, factorization.U);
    const axProduct = multiplyMatrixVector(A, solution.x);
    const luCorrect = approximatelyEqualMatrix(luProduct, A);
    const axCorrect = approximatelyEqualVector(axProduct, b);
    setActivePreset(presetForVector(b));
    renderSolution({ A, b, factorization, solution, luProduct, axProduct, luCorrect, axCorrect, reused });
    showStatus(
      reused
        ? "Sistema resuelto reutilizando L y U. No se volvió a calcular la factorización de A."
        : "Sistema resuelto correctamente: se calculó A = LU, luego LY = b y UX = Y.",
      "success"
    );
  } catch (error) {
    handleError(error);
  }
});

buttons.newVector.addEventListener("click", () => {
  try {
    setActivePreset();
    if (state.matrixLocked) {
      state.matrixLocked = false;
      setMatrixLocked(false);
      showStatus("La matriz A está habilitada. Si la modificas, la factorización almacenada se invalidará.", "warning");
      return;
    }
    const A = readMatrix();
    const { factorization, reused } = ensureCurrentFactorization(A);
    void factorization;
    state.matrixLocked = true;
    setMatrixLocked(true);
    clearVector();
    showStatus(
      reused
        ? "A quedó bloqueada para conservar LU. Ingresa un nuevo vector b y pulsa Resolver sistema."
        : "A fue factorizada y quedó bloqueada. Ingresa un nuevo vector b para reutilizar L y U.",
      "success"
    );
  } catch (error) {
    handleError(error);
  }
});

buttons.clear.addEventListener("click", () => {
  setActivePreset();
  state.cache = null;
  state.matrixLocked = false;
  state.factorizationCount = 0;
  updateCounter(0);
  setMatrixLocked(false);
  generateInputs(Number(refs.order.value));
  hideResults();
  showStatus("Campos limpiados. Ingresa una nueva matriz A y un vector b.", "neutral");
});

generateInputs(Number(refs.order.value));
