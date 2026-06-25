# Source: https://www.bold-factory.com/blog/construyendo-un-secuenciador-moderno-i

# Construyendo un secuenciador moderno (I)

![Pablo López](https://www.bold-factory.com/_next/image?url=%2Fimages%2Fpablo.webp&w=640&q=75)

Pablo López

2024-05-02

![Post cover image](https://www.bold-factory.com/_next/image?url=%2Fimages%2Fbuilding-software-i.webp&w=2048&q=75)

Share on:

Este mes de mayo vamos a implementar un secuenciador de la producción en Bold, y me he propuesto compartir cómo es todo el proceso de desarrollo de una funcionalidad así. Este será el primer post de una serie de artículos en los que iremos analizando las decisiones tomadas y el porqué de las mismas.

## Entendiendo el problema a resolver

Por motivos de brevedad vamos a obviar el proceso de decidir si esta es la funcionalidad que deberíamos estar implementando ahora o no, y supondremos que esa decisión ya está tomada.

**La complejidad de este tipo de problema es infinita**. De hecho, forma parte de su propia categoría de software denominada Advanced Planning and Scheduling (APS). Por tanto, el enfoque que vamos a seguir es el de timeboxear el desarrollo a un mes (mayo), y sacar un MVP sobre el que luego podamos iterar con feedback real de los clientes.

Si echamos un vistazo a la competencia, podemos encontrar incluso entre los líderes del mercado (Siemens Opcenter, SAP, Oracle...) **auténticas monstruosidades con decenas de botones** y opciones que hacen que implantar un software así sin un consultor que te acompañe sea imposible.

![OpCenter](https://www.bold-factory.com/_next/image?url=%2Fimages%2Fopcenter.webp&w=1920&q=75)

Vaya! Parece muy intuitivo todo.

Entiendo que años de evolución y de nuevos casos de uso les ha llevado a añadir semejante complejidad, pero al menos tenemos claro que eso **NO** es lo que queremos construir en Bold.

**La experiencia de usuario debe primar**, idealmente un encargado de planificación debería poder usar la herramienta sin siquiera recibir formación.

## Hablemos de funcionalidades

Entonces, ¿qué es **lo mínimo** que necesita una fábrica de un secuenciador de la producción?

Para responder a esta pregunta vamos a ampliar el _scope_ y listar primero todo lo que debería hacer el secuenciador perfecto, e ir analizando una a una impacto y complejidad, para ver por dónde debemos empezar.

### Visualizar fácilmente toda la planificación

Actualmente, en Bold las operaciones de fabricación se visualizan en forma de lista ordenada, donde es fácil modificar la prioridad, pero lo haces máquina por máquina, por lo que te pierdes la visión global.

**No es suficiente**, así que es fundamental una interfaz más consolidada donde sea sencillo hacer cambios entre máquinas y ver las dependencias entre las operaciones.

### Trasladar el plan a los operarios de forma automática

Esto en sistemas APS independientes del MES puede ser más complejo, pero **en Bold es trivial**. Sí que debería haber una opción para estar trabajando sobre un plan antes de aplicarlo al mundo real, para evitar que los operarios se vuelvan locos.

### Calcular de forma automática la secuencia óptima de fabricación

Esto es la funcionalidad _core_ a desarrollar, **sin un algoritmo automático no aporta valor**. Ahora bien, el algoritmo puede ser más o menos complejo, veamos a qué restricciones debería estar sometido a la hora de planificar:

#### Relaciones de precedencia

Es decir, poder fijar que la operación B no se puede empezar hasta que la operación A haya sido completada. **Absolutamente necesario**, pues sin esto el plan no tendría sentido.

#### Las fechas de disponibilidad de materia prima

Estaría bien, ya que si no podemos planificar cosas urgentes para hacerlas ya cuando aún no tenemos material suficiente. Por suerte, **esto en Bold nos sale también muy barato** al estar ya implementado.

#### Restricciones de máquinas

Otra cosa fundamental, si no restringimos en qué máquinas se puede realizar cada operación, no aporta valor suficiente.

Un extra que estaría bien tener, es distinta eficiencia por máquina para la misma tarea. Esto lo podemos aplicar sobre el concepto de _Máquina/Tipo de proceso_ que ya tenemos en Bold.

#### Los tiempos de no-producción (pausas, turnos que no se trabaja, máquinas averiadas, etc.)

Necesitamos al menos un calendario global por planta para respetar fines de semana, noches (si no se trabaja), etc.

Idealmente, este calendario se podría personalizar por máquina, para representar averías o secciones de la planta que permanecen cerrados en ciertos turnos.

#### Restricciones de mano de obra

Aquí el valor aportado es alto, ya que si no, el sistema va a suponer con capacidad humana infinita, y **a menudo será uno de los factores restrictivos clave**. El problema aquí es que aún no tenemos desarrollado un sistema de gestión de turnos, calendarios, habilidades de los operarios, etc.

Deberíamos tenerlo, pero lo añadiremos después que las restricciones que hemos visto hasta ahora.

#### Los tiempos de cambio entre productos

Esto es algo sumamente complejo que requiere de matrices enormes y datos que la mayoría de empresas no disponen. Para calcularlo hace falta muchísimo dato histórico.

Lo haremos, sin duda, pero **no para el MVP**.

### Poder ajustar manualmente el plan

Tenemos que asumir que el algoritmo no va a ser perfecto el día 1, así que **debemos proporcionar una forma de manipular manualmente el plan** resultante.

Además, esa manipulación debería resaltar las restricciones que se dejan de cumplir y los impactos en las fechas de entrega estimadas.

### Comparar escenarios "what-if..."

Hemos dicho que vamos a tener al menos un plan que editar y un botón de "aplicar" a las OFs actuales, así que al menos **comparar estas dos cosas debería salirnos relativamente barato**, aunque sea en pestañas diferentes del navegador.

Otra cosa es el hecho de poder guardar más de un plan y comparar entre ellos sin haberlos aplicado. Eso parece interesante, pero los casos de uso que se me ocurren son más nicho, lo dejamos para más adelante.

### Bloquear el horizonte de planificación más a corto plazo

Esto parece muy útil para no disrumpir continuamente el corto plazo de los operarios.

Idealmente, también podríamos bloquear ciertas operaciones en cierto momento y forzar a que el algoritmo busque una solución teniendo en cuenta esas restricciones fijas.

### Utilizar diferentes criterios de optimización

Para un planificador avanzado, puede ser interesante, pero en este momento del desarrollo, con tener un solo algoritmo que funcione, debería ser suficiente.

Habrá que pensar en un criterio de optimización que se pueda "configurar" de algún modo (y se me ocurre trasladar todo a euros y minimizar coste)

### Trasladar las fechas previstas hasta los pedidos de venta, para obtener fechas de entrega estimadas

Esto nos viene gratis en Bold :D

## Nuestro MVP

Entonces Pablo, ¿qué features vas a incluir en el MVP?

Pues la respuesta es que... **aún no lo sé**! Dado que la capacidad (coste) que tenemos disponible es fija, y vamos a dedicar un tiempo fijo (un mes), solo queda una variable libre, el _scope_ (o en castellano, qué funcionalidades se incluyen).

![Project management triangle](https://www.bold-factory.com/_next/image?url=%2Fimages%2Fproject-management-triangle.png&w=1920&q=75)

No se puede tener todo en esta vida.

Así que empezaremos a desarrollar lo más crítico y continuaremos hasta que se acabe el tiempo, eso será el MVP.

Seguimos en el siguiente artículo hablando sobre el diseño.

Book a demo

## More articles you may like

[![Article cover image](https://www.bold-factory.com/_next/image?url=%2Fimages%2Fbuilding-software-ii.webp&w=3840&q=75)\\ \\ 2024-05-15\\ \\ **Construyendo un secuenciador moderno (II)**\\ \\ Analizando la UI/UX de un secuenciador: innovación y funcionalidad en el diseño de herramientas de gestión.](https://www.bold-factory.com/en/blog/construyendo-un-secuenciador-moderno-ii) [![Article cover image](https://www.bold-factory.com/_next/image?url=%2Fimages%2Fsinergia-tecnologica.webp&w=3840&q=75)\\ \\ 2024-03-20\\ \\ **Sinergia Tecnológica: Integrando MES con ERP y Otros Sistemas de TI**\\ \\ La integración de sistemas MES con ERP y otras soluciones de TI es una vía para mejorar la gestión de las empresas. Descubre cómo hacerlo de forma efectiva.](https://www.bold-factory.com/en/blog/sinergia-tecnologica)