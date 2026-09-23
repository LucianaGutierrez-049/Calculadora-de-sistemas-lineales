export const DEFAULT_TOLERANCE = 1e-10;

export class NumericalError extends Error {
  constructor(message, code = "NUMERICAL_ERROR") {
    super(message);
    this.name = "NumericalError";
    this.code = code;
  }
}

export function formatNumber(value, decimals = 6, tolerance = DEFAULT_TOLERANCE) {
  if (!Number.isFinite(value)) return "No definido";
  const normalized = Math.abs(value) < tolerance ? 0 : value;
  if (Number.isInteger(normalized)) return String(normalized);
  return normalized.toFixed(decimals).replace(/\.?0+$/, "");
}

function assertFiniteNumber(value, context) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new NumericalError(`${context} contiene un valor no numérico o infinito.`, "INVALID_NUMBER");
  }
}

export function validateSquareMatrix(matrix) {
  if (!Array.isArray(matrix) || matrix.length === 0) {
    throw new NumericalError("La matriz A debe contener datos.", "INVALID_MATRIX");
  }
  const n = matrix.length;
  matrix.forEach((row, i) => {
    if (!Array.isArray(row) || row.length !== n) {
      throw new NumericalError("La matriz A debe ser cuadrada.", "NON_SQUARE_MATRIX");
    }
    row.forEach((value, j) => assertFiniteNumber(value, `A[${i + 1},${j + 1}]`));
  });
  return n;
}

export function validateVector(vector, expectedLength) {
  if (!Array.isArray(vector) || vector.length !== expectedLength) {
    throw new NumericalError(`El vector b debe tener ${expectedLength} componentes.`, "INVALID_VECTOR");
  }
  vector.forEach((value, i) => assertFiniteNumber(value, `b[${i + 1}]`));
}

export function doolittle(matrix, tolerance = DEFAULT_TOLERANCE) {
  const n = validateSquareMatrix(matrix);
  const L = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  );
  const U = Array.from({ length: n }, () => Array(n).fill(0));
  const steps = [];

  for (let i = 0; i < n; i += 1) {
    for (let j = i; j < n; j += 1) {
      const terms = [];
      let sum = 0;
      for (let k = 0; k < i; k += 1) {
        const product = L[i][k] * U[k][j];
        terms.push({ k, left: L[i][k], right: U[k][j], product });
        sum += product;
      }
      const value = matrix[i][j] - sum;
      assertFiniteNumber(value, `u${i + 1}${j + 1}`);
      U[i][j] = Math.abs(value) < tolerance ? 0 : value;
      steps.push({ type: "U", i, j, source: matrix[i][j], terms, sum, value: U[i][j] });
    }

    if (Math.abs(U[i][i]) < tolerance) {
      throw new NumericalError(
        `El método de Doolittle sin pivoteo no puede continuar porque apareció un pivote cero o aproximadamente cero en u${i + 1}${i + 1}.`,
        "ZERO_PIVOT"
      );
    }

    for (let j = i + 1; j < n; j += 1) {
      const terms = [];
      let sum = 0;
      for (let k = 0; k < i; k += 1) {
        const product = L[j][k] * U[k][i];
        terms.push({ k, left: L[j][k], right: U[k][i], product });
        sum += product;
      }
      const numerator = matrix[j][i] - sum;
      const value = numerator / U[i][i];
      assertFiniteNumber(value, `l${j + 1}${i + 1}`);
      L[j][i] = Math.abs(value) < tolerance ? 0 : value;
      steps.push({
        type: "L", i: j, j: i, source: matrix[j][i], terms, sum,
        numerator, pivot: U[i][i], value: L[j][i]
      });
    }
  }

  return { L, U, steps };
}

export function forwardSubstitution(L, b, tolerance = DEFAULT_TOLERANCE) {
  const n = validateSquareMatrix(L);
  validateVector(b, n);
  const y = Array(n).fill(0);
  const steps = [];

  for (let i = 0; i < n; i += 1) {
    if (Math.abs(L[i][i]) < tolerance) {
      throw new NumericalError(`No se puede dividir entre l${i + 1}${i + 1}: el valor es cero.`, "ZERO_PIVOT");
    }
    const terms = [];
    let sum = 0;
    for (let j = 0; j < i; j += 1) {
      const product = L[i][j] * y[j];
      terms.push({ j, coefficient: L[i][j], known: y[j], product });
      sum += product;
    }
    const numerator = b[i] - sum;
    const value = numerator / L[i][i];
    assertFiniteNumber(value, `y${i + 1}`);
    y[i] = Math.abs(value) < tolerance ? 0 : value;
    steps.push({ i, rhs: b[i], diagonal: L[i][i], terms, sum, numerator, value: y[i] });
  }
  return { vector: y, steps };
}

export function backwardSubstitution(U, y, tolerance = DEFAULT_TOLERANCE) {
  const n = validateSquareMatrix(U);
  validateVector(y, n);
  const x = Array(n).fill(0);
  const steps = [];

  for (let i = n - 1; i >= 0; i -= 1) {
    if (Math.abs(U[i][i]) < tolerance) {
      throw new NumericalError(`No se puede dividir entre u${i + 1}${i + 1}: el valor es cero.`, "ZERO_PIVOT");
    }
    const terms = [];
    let sum = 0;
    for (let j = i + 1; j < n; j += 1) {
      const product = U[i][j] * x[j];
      terms.push({ j, coefficient: U[i][j], known: x[j], product });
      sum += product;
    }
    const numerator = y[i] - sum;
    const value = numerator / U[i][i];
    assertFiniteNumber(value, `x${i + 1}`);
    x[i] = Math.abs(value) < tolerance ? 0 : value;
    steps.push({ i, rhs: y[i], diagonal: U[i][i], terms, sum, numerator, value: x[i] });
  }
  return { vector: x, steps };
}

export function multiplyMatrices(A, B) {
  const rowsA = A.length;
  const colsA = A[0]?.length ?? 0;
  const rowsB = B.length;
  const colsB = B[0]?.length ?? 0;
  if (!rowsA || !colsA || colsA !== rowsB || B.some((row) => row.length !== colsB)) {
    throw new NumericalError("Las dimensiones no permiten multiplicar las matrices.", "DIMENSION_MISMATCH");
  }
  return Array.from({ length: rowsA }, (_, i) =>
    Array.from({ length: colsB }, (_, j) => {
      let value = 0;
      for (let k = 0; k < colsA; k += 1) value += A[i][k] * B[k][j];
      return value;
    })
  );
}

export function multiplyMatrixVector(A, vector) {
  const n = validateSquareMatrix(A);
  validateVector(vector, n);
  return A.map((row) => row.reduce((sum, value, j) => sum + value * vector[j], 0));
}

export function approximatelyEqualMatrix(A, B, tolerance = 1e-8) {
  return A.length === B.length && A.every((row, i) =>
    row.length === B[i]?.length && row.every((value, j) => Math.abs(value - B[i][j]) <= tolerance)
  );
}

export function approximatelyEqualVector(a, b, tolerance = 1e-8) {
  return a.length === b.length && a.every((value, i) => Math.abs(value - b[i]) <= tolerance);
}

export function solveWithLU(L, U, b, tolerance = DEFAULT_TOLERANCE) {
  const forward = forwardSubstitution(L, b, tolerance);
  const backward = backwardSubstitution(U, forward.vector, tolerance);
  return { y: forward.vector, x: backward.vector, forwardSteps: forward.steps, backwardSteps: backward.steps };
}
