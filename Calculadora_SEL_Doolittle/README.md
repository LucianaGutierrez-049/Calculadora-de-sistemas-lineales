# Calculadora de Sistemas de Ecuaciones Lineales

Aplicación web educativa para factorizar matrices cuadradas y resolver sistemas `AX = b` mediante el método LU de Doolittle. Está desarrollada únicamente con HTML5, CSS3 y JavaScript vanilla.

## Fundamento y actividad

La guía teórica de la Sesión 6 define la factorización `A = LU`, con `L` triangular inferior y diagonal unitaria, y `U` triangular superior. El sistema se resuelve en dos etapas:

1. `LY = b`, por sustitución hacia adelante.
2. `UX = Y`, por sustitución hacia atrás.

La guía de aprendizaje autónomo aplica el método al balanceo de carga de tres microservicios. Pide resolver un primer vector de tráfico y luego un segundo vector con las mismas matrices `L` y `U`, sin repetir la factorización.

## Funcionalidades

- Dashboard académico con navegación lateral, métricas del sistema y perfil de Luciana Gutierrez.
- Panel de resultado inmediato junto a la calculadora para consultar `L`, `U`, `Y` y `X` sin abandonar la entrada.
- Cuaderno de resolución independiente con las siete etapas del desarrollo analítico.
- Sistemas cuadrados de orden 2 a 5 desde la interfaz; el algoritmo no está limitado internamente a esos tamaños.
- Entradas enteras, negativas y decimales.
- Desarrollo de cada cálculo de `uᵢⱼ`, `lᵢⱼ`, `yᵢ` y `xᵢ`.
- Visualización matemática de `A`, `b`, `L`, `U`, `Y` y `X`.
- Verificaciones propias `LU ≈ A` y `AX ≈ b`.
- Detección de campos vacíos, valores no finitos y pivotes cero o casi cero.
- Caché de la factorización mientras la matriz `A` no cambie.
- El botón **Nuevo vector b** bloquea temporalmente `A`, limpia `b` y permite resolver otro sistema reutilizando `L` y `U`.
- Los botones **Ejercicio 1** y **Ejercicio 2** cargan directamente `b₁` y `b₂`; al pasar del primero al segundo se conservan las matrices `L` y `U`.
- Contador visible de factorizaciones para comprobar la reutilización.

## Estructura

```text
Calculadora_SEL_Doolittle/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── doolittle.js   # Algoritmos matemáticos y validaciones numéricas
│   ├── ui.js          # Campos dinámicos y presentación del procedimiento
│   └── app.js         # Eventos, estado y caché de LU
├── tests/
│   └── test.html      # Pruebas automáticas en el navegador
└── README.md
```

La separación entre el núcleo matemático, la interfaz y el controlador permite añadir después otros módulos, como Gauss, Gauss-Jordan, Cramer o sistemas homogéneos.

## Ejecución con Visual Studio Code

1. Abre la carpeta `Calculadora_SEL_Doolittle` en Visual Studio Code.
2. Instala la extensión **Live Server** si todavía no está disponible.
3. Haz clic derecho en `index.html` y selecciona **Open with Live Server**.
4. Para ejecutar las pruebas, abre `tests/test.html` con Live Server.

No se requieren dependencias, instalación con npm ni proceso de compilación. Al usar módulos JavaScript, se recomienda un servidor local como Live Server en lugar de abrir el archivo directamente con `file://`.

## Caso de la actividad

```text
A = [  4   2   1 ]    b₁ = [14]    b₂ = [20]
    [ 12  10   5 ]         [46]         [62]
    [ -8   8   7 ]         [26]         [30]
```

La factorización es:

```text
L = [  1  0  0 ]    U = [ 4  2  1 ]
    [  3  1  0 ]        [ 0  4  2 ]
    [ -2  3  1 ]        [ 0  0  3 ]
```

- Para `b₁`, la solución es `X = (3, -6, 14)ᵀ`.
- Para `b₂`, reutilizando las mismas `L` y `U`, la solución es `X = (4.75, -10.166667, 21.333333)ᵀ`.

Si se modifica cualquier coeficiente de `A`, `app.js` invalida inmediatamente la caché y la siguiente resolución vuelve a calcular `L` y `U`.
