# Source: https://bold-factory.com/en/blog/asistente-virtual-en-un-dia

# Cómo implementar un asistente virtual con conocimiento de negocio en un día

![Pablo López](https://bold-factory.com/_next/image?url=%2Fimages%2Fpablo.webp&w=640&q=75)

Pablo López

2023-12-19

![Post cover image](https://bold-factory.com/_next/image?url=%2Fimages%2Fvirtual-assistant.webp&w=2048&q=75)

Share on:

Parece increíble que hace tan solo un año ni siquiera se había lanzado ChatGPT, y hoy parece que los LLM (Large Language Model) se han convertido en una _commodity_. Salvo que encuentres a alguien muy fuera del mundo tecnológico, el factor sorpresa ha desaparecido.

Sin embargo, eso no quiere decir que no podamos encontrar nuevas formas de aportar valor a nuestros usuarios utilizando estas tecnologías. De hecho, para mí había un gran problema sin resolver, y es que el entrenamiento que han recibido estos modelos se basa en información estática (de ahí la P de pre-trained) y la **ventana de contexto** que se les puede facilitar tenía un tamaño **insuficiente** para que el modelo tuviese información particular de cada negocio.

Pero llegó OpenAI este mismo lunes (6/nov) a cambiar las reglas una vez más. Con el lanzamiento de la API de [Assistants](https://platform.openai.com/docs/assistants/how-it-works 'Assistants'), es posible **cargar una serie de archivos con todo el conocimiento de tu negocio** o aplicación, y OpenAI los procesará e implementará [búsqueda vectorial](https://platform.openai.com/docs/assistants/tools/knowledge-retrieval 'búsqueda vectorial') para poder responder con información relevante a las preguntas de los usuarios.

Así que he aprovechado este fin de semana para hacer una **prueba de concepto** con esta tecnología, y me ha convencido tanto el resultado que ya está **puesta en producción** para los usuarios de Bold.

Puede que no sea perfecto el diseño, que no estén perfectamente controladas todas las posibles excepciones, pero **es funcional y aporta valor** desde hoy. Hace unos días me preguntaba un cliente por una duda habitual y tenía que esperar hasta que alguien le diese respuesta. **Hoy, Boldy es capaz de solucionarle el problema en segundos**.

Boldy, el nuevo asistente de Bold Factory en acción

## La parte técnica

### Creando un chat desde cero

La primera duda que me surgió fue si tenía sentido comunicar directamente con OpenAI **desde el front o pasar la petición por mi back**, a pesar de que no tenía intención de guardar las conversaciones en una base de datos.

La respuesta a la que llegué fue que era mejor pasar por el backend, y es por la existencia de los _function\_calls_. Esto es una funcionalidad relativamente nueva mediante la cual el modelo puede concluir que necesita más información y, por tanto, la solicita antes de llegar a una respuesta.

**¿Y dónde va a residir esa información?** Pues en nuestro backend, claro. Así que mejor localizarlo ahí para evitar hacer más viajes de la cuenta, ya que esto puede ocurrir multiples veces por petición.

Otro problema es que anteriormente tú mandabas un mensaje por HTTP y esperabas la respuesta, **ahora ya no es así**.

Necesitas estar **comprobando el estado de la ejecución del modelo repetidamente** hasta tener una respuesta, así que bloquear la petición hasta tenerla no parecía muy buena idea, ya que esto en ocasiones puede llevar unos cuantos segundos, dependiendo de la saturación de los servidores de OpenAI.

La solución pasa por el uso de WebSockets para comunicar esa respuesta desde el backend, una vez la tengamos. En el caso de Bold, como usamos .NET, utilicé [SignalR](https://learn.microsoft.com/es-es/aspnet/core/signalr/introduction?view=aspnetcore-7.0 'SignalR'), pero cualquier versión de WebSockets nos valdría.

Con **React** y **Tailwind**, crear un componente de Chat que luzca medianamente bonito con animaciones de apertura y cierre es bastante trivial y se puede conseguir en unos minutos.

Algo más complicado es orquestar todas las llamadas al backend y tratar las respuestas. Para simplificar esto usé una store de [Zustand](https://github.com/pmndrs/zustand 'Zustand'), que te permite centralizar toda esa gestión de estado y lo que es posible hacer en torno al chat.

Con el front listo, pasamos a hablar del back y de la interacción con OpenAI.

### Nueva API Assistants de OpenAI

El primer problema es que los clientes oficiales de OpenAI solo están disponibles en Python y en Node. Azure ha sacado los suyos para .NET, pero no estaban actualizados (recordemos que esta feature había salido hace literalmente 4 días). Así que **me tocó implementar mi propio cliente**.

Hasta ahora, con la API de Chats, **cada mensaje era independiente** y tenías que facilitarle todo el contexto.

Eso **ha cambiado** con la introducción de los Threads y los Assistants.

La cosa funciona de la siguiente manera: cada conversación es **un thread que OpenAI almacena en sus servidores**. La única interacción relevante con el thread es añadir un mensaje del usuario.

Una vez añadido el mensaje, toca lanzar un Run (algo así como procesar el thread para dar con una respuesta).

El resultado de esto puede ser un mensaje del asistente o una petición de ejecutar una función para obtener más información.

Por el momento **he ignorado la opción de añadir funciones al assistant**, ya que era complicarlo demasiado para un MVP, pero no lo descarto en el futuro.

El caso es que una vez lanzas el run, hay que estar comprobando el estado de ejecución regularmente (en mi caso lo hago cada 500 ms), lo cual no parece muy eficaz. **Sería de agradecer que implementasen webhooks** o similar.

Una vez hay respuesta hay que obtener de nuevo todos los mensajes del thread, y pasarlo al cliente usando SignalR.

### Aportando contexto

Para que todo esto tenga sentido, **hay que subirle documentación al Assistant** a cargo de procesar las peticiones.

Por suerte, admiten una barbaridad de formatos y uno de ellos es _markdown_, que es cómo teníamos en Bold la documentación de las funcionalidades. **Unos clics y estaba todo list**o.

Pero faltaba una cosa, ahora **el Bot tenía conocimiento del negocio, pero estaba ciego** a lo que estaba haciendo el usuario, a menos que este se lo indicase.

Para solucionarlo, desde el front **en cada navegación me guardo en el store el contexto**, a saber, el título de la página que está viendo el usuario y cualquier dato en json que venga del back para esa página.

Esto viaja con cada mensaje y se utiliza para **enriquecer el prompt de sistema** (que se puede pasar como parámetro en cada run) con la información contextual.

Esto permite que el bot conteste sobre lo que está viendo el usuario sin tener que hacer nada adicional.

![Boldy](https://bold-factory.com/_next/image?url=%2Fimages%2Fboldy-context.webp&w=1080&q=75)

Boldy, utilizando información contextual

## Oportunidades de mejora

Las **functions** son el camino obvio a seguir, ya que permitirían a GPT obtener más datos para responder las preguntas del usuario, o más aún, ejecutar acciones en la propia aplicación, con una interfaz de texto.

Tengo mis dudas sobre si debería exponer toda la API de Bold a GPT para consulta de datos, ya que parece un poco overkill y sé que **Microsoft está haciendo cosas en el Q&A de PowerBI**, y seguramente lo hagan mejor que yo.

En cualquier caso, aún es pronto para evaluar el rendimiento del modelo en este escenario, de hecho la API aún está en Beta, pero **lo importante es lanzar cuanto antes**, ponerlo en manos del usuario, ver cómo interactúan y qué valor le aporta, y con esa información **seguir iterando**.

Book a demo

## More articles you may like

[![Article cover image](https://bold-factory.com/_next/image?url=%2Fimages%2Fmes.jpg&w=3840&q=75)\\ \\ 2024-01-16\\ \\ **¿Qué es un sistema MES?**\\ \\ Todo el mundo habla de los Manufacturing Execution Systems, pero ¿qué son y cuándo son necesarios?](https://bold-factory.com/en/blog/que-es-un-mes) [![Article cover image](https://bold-factory.com/_next/image?url=%2Fimages%2Fsaas.jpg&w=3840&q=75)\\ \\ 2023-11-14\\ \\ **SaaS en la industria: la revolución ágil**\\ \\ Descubre cómo el SaaS transforma la industria, reduciendo costes y adaptándose ágilmente a las demandas modernas.](https://bold-factory.com/en/blog/ventajas-saas-industria)