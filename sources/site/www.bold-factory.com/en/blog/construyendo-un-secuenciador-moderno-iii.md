# Source: http://www.bold-factory.com/en/blog/construyendo-un-secuenciador-moderno-iii

# Construyendo un secuenciador moderno (III)

![Pablo López](http://www.bold-factory.com/_next/image?url=%2Fimages%2Fpablo.webp&w=640&q=75)

Pablo López

2024-05-29

![Post cover image](http://www.bold-factory.com/_next/image?url=%2Fimages%2Fbuilding-software-iii.webp&w=2048&q=75)

Share on:

Este artículo es el tercero de una serie en la que exploramos el proceso de discovery y desarrollo de una funcionalidad en Bold. Puedes leer el primer artículo [aquí](http://www.bold-factory.com/blog/construyendo-un-secuenciador-moderno-i 'aquí') y el segundo artículo [aquí](http://www.bold-factory.com/blog/construyendo-un-secuenciador-moderno-ii 'aquí')

## Un problema complejo

Tras abordar en los artículos anteriores aspectos de usabilidad y funcionalidades, toca centrarnos ahora en el núcleo de la funcionalidad, el algoritmo de optimización.

La secuenciación tal y como la hemos planteado en Bold es lo que se conoce como un **Job-shop scheduling problem**, más concretamente _Flexible Job-shop scheduling_, y es un problema ampliamente estudiado en optimización combinatoria.

Se trata de un problema **NP-hard**, lo que significa que su resolución requiere un tiempo que crece exponencialmente con el tamaño del problema. O, dicho de otra forma, que es un problema bien jodido de resolver.

Todo esto ya nos da la pista de por donde debería ir la solución, ya que al ser un **problema ampliamente estudiado**, hay gente mucho más inteligente que yo que ha creado algoritmos de resolución más complejos y rápidos de los que yo podría soñar.

## La cosa va de algoritmos

Si echamos un vistazo a nuestras opciones, podemos englobar las soluciones en tres categorías:

### Métodos heurísticos

Si a un programador con cero conocimiento de matemáticas le planteas este problema, crear un heurístico sería su primer instinto. Se trata de una secuencia definida de pasos a ejecutar.

Tenemos varias opciones como **Shortest Processing Time (SPT)** o el **Earliest Due Date (EDD)** que son fáciles de implementar, pero no garantizan encontrar una solución óptima.

![Algoritmo de Johnson](http://www.bold-factory.com/_next/image?url=%2Fimages%2Fjohnson.png&w=1920&q=75)

¡Ah! el bueno de Johnson, qué recuerdos...

Algo más complejo son los **algoritmos genéticos**, que se basan en hacer mutaciones semi-aleatorias para ir mejorando poco a poco el objetivo. Mejoran la calidad de la solución, pero son más lentos.

### Métodos metaheurísticos

Los métodos metaheurísticos son un paso más allá de los heurísticos simples y están diseñados para explorar grandes espacios de soluciones de manera más eficiente. Entre los más conocidos se encuentran:

- [Simulated Annealing](https://medium.com/@gilewski.slawomir/using-simulated-annealing-in-job-shop-problem-solving-5d72232a2abe 'Simulated Annealing'): Se inspira en el proceso de enfriamiento de los metales, aceptando soluciones peores temporalmente para evitar quedar atrapado en óptimos locales.
- [Tabu Search](https://www.researchgate.net/publication/226183797_Applying_Tabu_Search_to_the_Job-Shop_Scheduling_Problem 'Tabu Search'): Usa una memoria a corto plazo para evitar ciclos, mejorando continuamente la solución.
- [Ant Colony Optimization](https://www.researchgate.net/publication/256846085_An_ant_colony_optimization_algorithm_for_job_shop_scheduling_problem 'Ant Colony Optimization'): Simula el comportamiento de las hormigas buscando rutas óptimas, siendo eficaz pero costoso en términos computacionales.

Estos métodos son potentes y flexibles, capaces de encontrar buenas soluciones, aunque no siempre óptimas, pero requieren ajustes finos de parámetros.

### Métodos exactos

Aquí encontramos cosas como la programación lineal entera (ILP) o la mixta (MILP). Probablemente, **la cosa más útil que aprendí en toda la carrera**. Es sorprendente como se puede modelar un problema así de complejo en forma de ecuaciones y ejecutar _solvers_ que te garantizan encontrar el óptimo.

El problema de este tipo de soluciones es que **te limitan mucho a la hora de expresar el problema**. Por ejemplo, representar algo como "una máquina solo puede hacer una operación a la vez" se traduce en una ingente cantidad de restricciones, especialmente a medida que crece el número de trabajos y de máquinas.

Esto hace que se vuelvan **poco prácticos** a la hora de resolver problemas del mundo real, donde ese número puede ascender a miles de trabajos y cientos de máquinas.

## Programación por Restricciones (CP)

Aunque los métodos metaheurísticos ofrecen buenas soluciones al explorar eficientemente el espacio de soluciones, no siempre garantizan encontrar la solución óptima y su rendimiento puede variar según los parámetros y la naturaleza del problema. Por ello, decidí utilizar la Programación por Restricciones, o _Constraint Programming_ (CP).

La **Programación por Restricciones** es un paradigma de resolución de problemas en el que se define un conjunto de restricciones que deben cumplirse. En lugar de buscar directamente una solución, CP trabaja eliminando soluciones imposibles y reduciendo el espacio de búsqueda hasta encontrar la solución óptima.

CP permite expresar el problema de manera más natural y directa mediante restricciones. Por ejemplo, imponer que "una máquina solo puede hacer una operación simultáneamente" se puede describir en una sola línea de código.

Además, **CP puede manejar problemas con un gran número de restricciones** y variables de manera más eficiente que los métodos exactos tradicionales como ILP, utilizando técnicas avanzadas de propagación de restricciones y búsqueda para reducir el espacio de soluciones posibles.

A diferencia de los metaheurísticos, CP garantiza encontrar la solución óptima siempre que exista suficiente tiempo y recursos computacionales.

## Google al rescate

Una vez decidido cómo resolver este problema, toca implementarlo, así que empiezo buscando alternativas que pueda implementar en C#.

Básicamente, encontramos unas cinco alternativas:

- **OptaPlanner**: es un motor de planificación open-source con muy buena pinta, pero está hecho en java así que la interoperabilidad puede incrementar la complejidad de la solución
- **Gurobi Optimizer**: este es uno de los más famosos, y en teoría de los más potentes, pero es de pago.
- **IBM ILOG CPLEX**: al igual que Gurobi, es un solver comercial, por lo que debemos descartarlo por el momento.
- **Microsoft Solver Foundation**: enfocada en C#, pero Microsoft ha abandonado el soporte, así que descartada

Finalmente, tenemos Google OR-Tools, que se describe como:

> OR-Tools is an open source software suite for optimization, tuned for tackling the world's toughest problems in vehicle routing, flows, integer and linear programming, and constraint programming.

Pinta bien, como OptaPlanner, pero además ofrece soporte para varios lenguajes, entre ellos C#. **Tenemos ganador**.

## Llevándolo a la práctica

Una vez decidido a utilizar este paquete, no es excesivamente difícil de implementar, incluso nos dan [un pequeño ejemplo](https://developers.google.com/optimization/scheduling/job_shop 'un pequeño ejemplo') de cómo implementar el Job Shop Problem utilizando el CpSatSolver.

Por suerte, el Dr. [Dominik Krupke](https://krupke.cc/ 'Dominik Krupke') ha escrito [una magnífica guía](https://github.com/d-krupke/cpsat-primer 'una magnífica guía') sobre CP-SAT que hace las cosas mucho más fáciles que con la documentación oficial.

Básicamente, se trata de traducir nuestro dominio a variables y restricciones. Por ejemplo, las fechas las traducimos a minutos a contar desde el instante inicial de la planificación. **Todo ello supone menos de 200 líneas de código**, gracias a la flexibilidad y las opciones que da el solver, como por ejemplo, `NoOverlap`.

Queda por decidir cuál es la función a optimizar. Eso de minimizar el _makespan_ está muy bien a nivel teórico, pero en el mundo real lo que queremos es satisfacer lo mejor posible a nuestros clientes, esto es, minimizar los retrasos (o _tardiness_).

Lo más probable es que no todos los clientes o todos los pedidos sean igual de importantes, por lo que tiene sentido traducir esta tardanza a una unidad ponderable, en la que podamos asignar diferentes pesos a diferentes pedidos.

En el caso que nos ocupa, creo que tiene sentido **traducir todo en forma de costes**, pues aunque no sea obvio, tener un retraso en el envío de un pedido es una forma de coste (en reputación) que tendrá implícito un valor monetario.

Lógicamente, nadie sabe realmente cuanto es ese valor, pero aun con una cifra inventada, nos da juego para poder ponderar entre diferentes conceptos.

Por ejemplo, podríamos **comparar un escenario en el que metemos horas extra** (y deberíamos pagarlas) para poder servir antes los pedidos **frente a uno en el que no** lo hacemos, y ajustar los parámetros hasta que el resultado tenga sentido para nuestra empresa.

## El resultado

Tras hacer unas cuantas pruebas con un tamaño de 1000x100, aparte del humo que echa mi PC cuando está resolviéndolo, vemos que **no suele llegar al óptimo fácilmente**, por lo que debo restringirle el tiempo de resolución.

Sin embargo, **en 30 segundos es capaz de llegar a soluciones muy buenas** que soy incapaz de mejorar a simple vista. Una solución más que aceptable para nuestro MVP.

¡Y hasta aquí con el artículo de hoy, la semana que viene veremos el resultado de este mes de trabajo y lo analizaremos, os espero allí!

Book a demo

## More articles you may like

[![Article cover image](http://www.bold-factory.com/_next/image?url=%2Fimages%2Fsuperar-desafios-pymes-mes.webp&w=3840&q=75)\\ \\ 2024-07-09\\ \\ **Superar los desafíos de producción de las PYMES con un sistema MES**\\ \\ ¿Cómo un sistema MES puede revolucionar la producción en las PYMES? Descúbrelo aquí.](http://www.bold-factory.com/en/blog/superar-desafios-pymes-mes) [![Article cover image](http://www.bold-factory.com/_next/image?url=%2Fimages%2Fbuilding-software-ii.webp&w=3840&q=75)\\ \\ 2024-05-15\\ \\ **Construyendo un secuenciador moderno (II)**\\ \\ Analizando la UI/UX de un secuenciador: innovación y funcionalidad en el diseño de herramientas de gestión.](http://www.bold-factory.com/en/blog/construyendo-un-secuenciador-moderno-ii)