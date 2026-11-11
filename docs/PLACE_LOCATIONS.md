# Ubicaciones de las fichas de etapa 9

Coordenadas consultadas el 10 de noviembre de 2026 en las páginas de Wikipedia siguientes. Se convirtieron las coordenadas sexagesimales mostradas y se redondearon a cuatro decimales. Los números de JSON pueden omitir ceros finales. Cada `location` guarda `{ label, lat, lng, mapsQuery }` en ambas versiones de la ficha.

| Ficha | label / mapsQuery | Coordenadas publicadas | lat, lng guardadas | Fuente |
| --- | --- | --- | --- | --- |
| Ciudad Colonial | Ciudad Colonial de Santo Domingo / Ciudad Colonial, Santo Domingo | 18°29′N, 69°55′W | 18.4833, -69.9167 | [Ciudad Colonial](https://en.wikipedia.org/wiki/Ciudad_Colonial_(Santo_Domingo)) |
| Los Haitises | Parque Nacional Los Haitises | 19°00′24″N, 69°38′31″W | 19.0067, -69.6419 | [Los Haitises National Park](https://en.wikipedia.org/wiki/Los_Haitises_National_Park) |
| Ballenas jorobadas de Samaná | Bahía de Samaná | 19°10′N, 69°25′W | 19.1667, -69.4167 | [Samaná Bay](https://en.wikipedia.org/wiki/Saman%C3%A1_Bay) |
| Altos de Chavón | Altos de Chavón / Altos de Chavón, La Romana | 18°25′13″N, 68°53′23″W | 18.4203, -68.8897 | [Altos de Chavón](https://en.wikipedia.org/wiki/Altos_de_Chav%C3%B3n) |
| Congos de Villa Mella | Villa Mella / Villa Mella, Santo Domingo Norte | 18°33′N, 69°54′W | 18.5500, -69.9000 | [Villa Mella](https://en.wikipedia.org/wiki/Villa_Mella) |
| Carnaval de La Vega | La Vega / La Vega, República Dominicana | 19°13′12″N, 70°31′48″W | 19.2200, -70.5300 | [La Vega](https://en.wikipedia.org/wiki/La_Vega,_Dominican_Republic) |

La Bahía de Samaná aparece expresamente en el texto ES/EN de Ballenas. Villa Mella y La Vega aparecen en el título y texto de sus respectivas fichas. Estos puntos representan la bahía o localidad vinculada. El parque y la Ciudad Colonial son áreas amplias. Los enlaces permiten buscar esos puntos en Maps. La aplicación muestra el nombre vinculado y deja la navegación al servicio de mapas.

Merengue, Bachata, Mangú, Larimar y Ámbar mantienen `location = null`. Aunque las fichas de Larimar y Ámbar mencionan regiones o museos, esta etapa presenta el material. Cocolo mantiene `location = null`, pues el texto actual del seed no menciona San Pedro de Macorís.

`src/location.ts` acepta únicamente números finitos, latitud entre -90 y 90 y longitud entre -180 y 180. Construye `https://www.google.com/maps/search/?api=1&query=<lat>,<lng>`. El texto `mapsQuery` queda como dato editorial. La URL usa exclusivamente las coordenadas. Las imágenes y las ubicaciones se incorporan a la respuesta después de validar las citas publicadas del catálogo en el servidor.
