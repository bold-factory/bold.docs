# Source: https://bold-factory.com/en/blog/construyendo-un-secuenciador-moderno-ii

# Construyendo un secuenciador moderno (II)

![Pablo López](https://bold-factory.com/_next/image?url=%2Fimages%2Fpablo.webp&w=640&q=75)

Pablo López

2024-05-15

![Post cover image](https://bold-factory.com/_next/image?url=%2Fimages%2Fbuilding-software-ii.webp&w=2048&q=75)

Share on:

Este artículo es el segundo de una serie en la que exploramos el proceso de discovery y desarrollo de una funcionalidad en Bold. Puedes leer el primer artículo [aquí](https://bold-factory.com/blog/construyendo-un-secuenciador-moderno-i 'aquí').

## Análisis de la competencia

Dado que no somos los primeros ni los últimos en desarrollar un secuenciador, lo primero es echar un vistazo a la competencia para entender qué tipo de interfaz de usuario ofrecen. Os lo resumo: **diagramas de Gantt _everywhere_**.

El primer pensamiento que se me cruza por la cabeza es si podemos hacer algo que rompa totalmente con lo existente. Sin embargo, cuando le das un par de vueltas, es difícil encontrar una representación visual de muchos recursos a lo largo de un horizonte temporal que mejore al Gantt.

## Capturando feedback de usuarios

No es cuestión de rendirse a la primera, es hora de capturar feedback de usuarios de este tipo de herramientas para ver si nos estamos perdiendo algo. Tiramos de contactos, clientes, o incluso potenciales clientes, cualquiera que sufra el problema y esté dispuesto a hablar de ello.

De este proceso saqué principalmente dos insights: **uno, que el Gantt funciona**, y **dos, que la clave está en la información que necesitas para tomar la decisión de hacer una orden de fabricación antes o después**.

## Limitaciones del diagrama de Gantt

En un diagrama de Gantt tienes una forma limitada de mostrar información. Hacerlo vía texto hace que todo sea difícil de entender, porque las barras del Gantt son pequeñas, y la cantidad de texto que puedes mostrar es limitada. Eso nos deja sólo dos formas de mostrar información: el **color de la barra** y los **tooltips**.

Los tooltips pueden valer para expandir información de forma puntual, pero no pueden ser los drivers de la decisión, puesto que tienes que ir moviendo el ratón para verlos y no funcionan bien en dispositivos táctiles.

Hay muchas dimensiones de información que pueden ser necesarias para tomar decisiones, pero el color nos limita a una, como mucho dos si partimos la barra horizontalmente o usamos patrones multicolor.

Lo que nos lleva a tener una forma sencilla de cambiar la dimensión que nos interesa ver, para poder repasar rápidamente la secuenciación usando dimensiones diferentes.

## Solución propuesta

Una vez que tenemos claro que vamos a construir un Gantt, falta pensar en las acciones que el usuario podrá hacer, más allá de simplemente mover las barras.

Estas acciones deberían estar representadas en nuestra API. Para mí, en este punto tienes dos opciones: **empiezas haciendo un primer diseño de tu backend y tus datos**, o **empiezas simplemente pensando las acciones desde el punto de vista del usuario y ya te preocuparás después de si te encaja o no**.

La segunda opción suena mejor, pero si ignoras completamente la big picture, seguramente te encuentres con piedras a la hora de implementar.

Para evitarlo, yo trato de hacer esa reconciliación de backend vs frontend en mi cabeza, pero es complejo. La alternativa es ir construyendo poco a poco, iterando y ajustando antes de que sea demasiado tarde (y cueste más).

## Acciones necesarias

En cualquier caso, la conclusión para el secuenciador es que necesitamos al menos cuatro acciones:

1. **Actualizar los datos de las órdenes de fabricación**: Consideré actualizarlo en tiempo real, pero la complejidad escala considerablemente y causa efectos extraños en la planificación.
2. **Buscar una solución**: es decir, calcular mediante un algoritmo una solución óptima.
3. **Guardar los cambios hechos a mano**.
4. **Aplicar las fechas objetivo**: es decir, convertir un plan tentativo en realidad.

## Prototipo Inicial

Con esto ya tenemos lo suficiente para empezar a construir un prototipo, que quedaría así:

![Diseño inicial](https://bold-factory.com/_next/image?url=%2Fimages%2Fsequencer-first-ui.webp&w=1920&q=75)

Una primera aproximación a la UI.

Pasamos a ejecutar, y la primera duda es si ya existe algún Gantt para React que podamos utilizar. Tras explorar las funcionalidades que ofrecen, parece que se van a quedar cortos, así que toca construirlo de cero.

Me preocupa la performance, así que lo primero es construir un PoC con _fake data_ para ver qué tal funciona un Gantt con miles de operaciones. Tras validar esto y jugar un poco con estos datos de prueba, me doy cuenta de que me falta información para tomar decisiones.

Por ejemplo, ¿cómo sé qué operaciones están incumpliendo las restricciones de precedencia? ¿O cuáles están haciendo que entregue tarde mis pedidos?

Aparte de mostrar esto como un **indicador visual en las barras**, necesito expandir esa información y poder ver de forma fácil cuántas hay en cada estado.

## Expansión de funcionalidades

Tras unas cuantas horas de programación llegamos a algo como esto.

![Segundo diseño](https://bold-factory.com/_next/image?url=%2Fimages%2Fsequencer-second-ui.webp&w=1920&q=75)

Expandimos con funcionalidades básicas.

Sigue sin ser perfecto, pero es funcional, así que es el momento de pasar al backend y hacer que esto funcione de verdad.

La semana que viene exploraremos la parte del **algoritmo de secuenciación**, una pieza clave para optimizar nuestras operaciones y ofrecer un valor diferencial a nuestros usuarios. ¡No te lo pierdas!

Book a demo

## More articles you may like

[![Article cover image](https://bold-factory.com/_next/image?url=%2Fimages%2Fbuilding-software-iii.webp&w=3840&q=75)\\ \\ 2024-05-29\\ \\ **Construyendo un secuenciador moderno (III)**\\ \\ Optimización del Job Shop: explorando métodos y herramientas para resolver problemas complejos en la producción.](https://bold-factory.com/en/blog/construyendo-un-secuenciador-moderno-iii) [![Article cover image](https://bold-factory.com/_next/image?url=%2Fimages%2Fbuilding-software-i.webp&w=3840&q=75)\\ \\ 2024-05-02\\ \\ **Construyendo un secuenciador moderno (I)**\\ \\ Descubriendo el desarrollo de un secuenciador de producción en Bold: Un viaje desde el concepto hasta el MVP en el que analizaremos las decisiones tomadas.](https://bold-factory.com/en/blog/construyendo-un-secuenciador-moderno-i)