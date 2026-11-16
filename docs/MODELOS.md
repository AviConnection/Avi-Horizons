# Modelos y límites científicos

## Transferencia orbital

Se usan órbitas circulares coplanares de radio r1 = 1 UA y r2 = 1,524 UA, con el Sol inmóvil en el origen. a = (r1+r2)/2; e = (r2-r1)/(r2+r1). El tiempo de transferencia es π√(a³/μ), aproximadamente 259 días. Se resuelve la ecuación de Kepler para dibujar la posición del vehículo sobre la media elipse. Marte parte de una fase ideal para coincidir con la nave al final; no se predicen ventanas reales ni se consultan efemérides.

Constantes: UA = 149 597 870 700 m; c = 299 792 458 m/s; día = 86 400 s; μ solar = 1,3271244×10²⁰ m³/s². El consumo en unidades de combustible no se deriva de delta-v ni de una ecuación de cohete. La masa preparada es masa seca; el combustible se representa con unidades de juego.

La ruta intensiva de 180 días cambia duración y consumos mediante parámetros de juego. Su curva es una visualización parametrizada de referencia; no es una solución dinámica ni un diseño de misión de 180 días.

Fuentes: [NASA, trayectorias](https://science.nasa.gov/learn/basics-of-space-flight/chapter4-1/), [NASA/JPL, ventanas a Marte](https://www.jpl.nasa.gov/edu/resources/lesson-plan/lets-go-to-mars-calculating-launch-windows/), [JPL, constantes astronómicas](https://ssd.jpl.nasa.gov/astro_par.html).

## Información y tiempo

La latencia de propagación es distancia/c, recalculada con las posiciones del modelo. Pedir ayuda requiere ida, dos minutos ficticios de preparación y vuelta. Una solicitud puede llegar demasiado tarde para la ventana de observación. Los mensajes pendientes no se muestran como recibidos.

La descarga científica añade tiempo de serialización (8 bits por byte) a la propagación. Se supone un enlace ficticio constante de 0,8 Mbit/s, sin pérdidas ni planificación de antenas. “Datos confirmados” significa llegada al receptor terrestre en la simulación; no incluye una segunda señal de acuse hacia la nave. La interfaz del juego permite conocer ese evento global, aunque un astronauta real necesitaría esperar un acuse para saberlo.

Una diferencia o desfase entre lecturas de reloj puede tener distintas causas. La latencia es demora de información; la dilatación temporal es una diferencia en los tiempos propios acumulados según las trayectorias y la geometría espacio-temporal. El juego las presenta por separado.

Fuente: [NASA, comunicaciones marcianas](https://www.nasa.gov/wp-content/uploads/2024/01/mars-communications-disruption-and-delay.pdf).

## Relatividad

El laboratorio de movimiento usa Δτ = Δt√(1−v²/c²) para un segmento ideal con velocidad constante en un marco inercial, sin gravedad ni regreso. A 0,8c, diez años de referencia equivalen a seis años propios.

El laboratorio gravitatorio usa Δτ = Δt√(1−r_s/r), para un reloj estático fuera de una masa esférica no rotante, respecto al tiempo de referencia en el infinito. Mantenerse estático exige aceleración; no equivale a una órbita y no reproduce el agujero negro rotante de Interestelar.

La campaña acumula únicamente una corrección cinemática de primer modelo a partir de su rapidez heliocéntrica: dt[1−√(1−v²/c²)]. Se evalúa con una forma numéricamente estable. No representa diferencia nave-Tierra ni incluye el potencial solar o planetario; la cifra del informe se etiqueta con ese alcance.

Fuentes: [Einstein Online](https://www.einstein-online.info/en/explandict/time-dilation/), [University of Winnipeg, Lorentz](https://theory.uwinnipeg.ca/mod_tech/node135.html), [Princeton, Schwarzschild](https://phy.princeton.edu/research/high-energy-theory/gubser-group/outreach/the-little-book-of-string/chapter-3).

## Asistencia gravitatoria

Se comparan velocidades vectoriales en el marco planetario y solar: v_solar = v_planeta + u. En la aproximación ideal, |u| se conserva; su dirección cambia y puede aumentar o reducir la rapidez solar. El planeta intercambia energía orbital con el vehículo. Los parámetros del laboratorio son ejemplos y no incluyen restricciones de periapsis ni una trayectoria concreta.

Fuente: [NASA, fundamentos de vuelo espacial](https://science.nasa.gov/learn/basics-of-space-flight/primer/).

## Ingeniería y mundo de juego

Presupuesto, masa, potencia, Wh, capacidad de batería, avería, ventanas científicas, terrenos y observaciones son ficticios y están diseñados para producir decisiones comprensibles. La batería añade almacenamiento; el plan secuencial reduce demanda simultánea sin reducir masa. La generación solar compensa la carga de mantenimiento durante el crucero; las operaciones descuentan energía explícita.

El aterrizaje es una secuencia didáctica de escudo, paracaídas y propulsión, con altitudes y velocidades ilustrativas. La superficie se explora desde un rover presurizado. No se simulan dinámica atmosférica, guiado, soporte vital o seguridad de una misión humana.

Fuente: [NASA, aterrizar en Marte](https://science.nasa.gov/solar-system/skywatching/night-sky-network/landing-on-mars-a-tricky-feat/).

MAQUI ofrece diagnóstico por reglas locales, visible y explicable; no es un modelo de IA conectado. La puntuación mide el desempeño dentro del juego, no una evaluación científica real. Los hallazgos no se presentan como descubrimientos de NASA.
