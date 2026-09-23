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

function setActiveExercise(number = null) {
  document.querySelectorAll(".exercise-button").forEach((button) => {
    button.classList.toggle("is-active", button.id === (number === 1 ? "load-example" : number === 2 ? "load-second" : ""));
  });
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
  setActiveExercise();
  setMatrixLocked(false);
  state.matrixLocked = false;
  invalidateFactorization("Cambió el orden del sistema: ingresa una nueva matriz A.");
  generateInputs(Number(refs.order.value));
});

refs.matrixInputs.addEventListener("input", (event) => {
  if (event.target.matches("[data-matrix='A']")) {
    setActiveExercise();
    invalidateFactorization();
  }
  updateEquationPreview();
});

refs.vectorInputs.addEventListener("input", () => {
  setActiveExercise();
  updateEquationPreview();
});

buttons.load.addEventListener("click", () => {
  state.cache = null;
  state.matrixLocked = false;
  setMatrixLocked(false);
  fillData(TASK.A, TASK.b1);
  setActiveExercise(1);
  hideResults();
  showStatus("Ejemplo de la guía autónoma cargado. Puedes factorizar A o resolver el sistema completo.", "success");
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
      fillData(TASK.A, TASK.b2);
      ({ A, factorization } = factorizeCurrentMatrix());
    }

    state.matrixLocked = true;
    setMatrixLocked(true);
    setActiveExercise(2);
    const luProduct = multiplyMatrices(factorization.L, factorization.U);
    const luCorrect = approximatelyEqualMatrix(luProduct, A);
    renderFactorization(A, factorization, luProduct, luCorrect);
    showStatus(
      canReuse
        ? "Ejercicio 2 cargado. Se conservaron las matrices L y U del ejercicio 1; pulsa Resolver sistema."
        : "Ejercicio 2 cargado. La matriz A se factorizó una sola vez y quedó preparada para resolver b₂.",
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
    renderSolution({ A, b, factorization, solution, luProduct, axProduct, luCorrect, axCorrect, reused });
    showStatus(
      reused
        ? "Se están reutilizando las matrices L y U previamente calculadas. No es necesario volver a factorizar A."
        : "Sistema resuelto correctamente: se calculó LU y se realizaron ambas sustituciones.",
      "success"
    );
  } catch (error) {
    handleError(error);
  }
});

buttons.newVector.addEventListener("click", () => {
  try {
    setActiveExercise();
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
  setActiveExercise();
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
