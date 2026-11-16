"""Build the Spanish illustrated campaign catalogue from attributed assets."""
from pathlib import Path
import json,random
r=Path(__file__).resolve().parents[1];a=json.loads((r/'docs/visual-sources.json').read_text())
labels={
'earth':('COMPOSICIÓN OBSERVACIONAL','La Tierra en Blue Marble 2012: mosaico de observaciones de Suomi NPP.'),
'moon':('FOTOGRAFÍA','La Luna llena fotografiada desde la Tierra.'),
'venus':('RECONSTRUCCIÓN CON RADAR','Globo de Venus reconstruido con datos de radar; no representa el color visible de sus nubes.'),
'mars':('MOSAICO OBSERVACIONAL','El hemisferio de Valles Marineris en un mosaico de imágenes de Marte.'),
'jupiter':('OBSERVACIÓN · HUBBLE','Júpiter e Ío en una imagen del telescopio Hubble.'),
'europa':('OBSERVACIÓN · GALILEO','Detalles de la superficie helada de Europa.'),
'saturn':('COMPOSICIÓN OBSERVACIONAL','Saturno observado por Cassini.'),
'titan':('OBSERVACIÓN · CASSINI','Titán en una vista monocroma de Cassini.'),
'alpha':('OBSERVACIÓN · HUBBLE','Alfa Centauri A y B; los rayos luminosos son efectos ópticos de la imagen.'),
'proxima':('OBSERVACIÓN · HUBBLE','Próxima Centauri aparece como un punto luminoso, no como un disco resuelto.'),
'sirius':('OBSERVACIÓN · HUBBLE','Sirio A y Sirio B; la imagen de A está sobreexpuesta para revelar a su compañera.'),
'orion':('OBSERVACIÓN','La nebulosa de Orión y estructuras de gas en una región de formación estelar.'),
'betelgeuse':('OBSERVACIÓN INFRARROJA','El entorno de Betelgeuse en infrarrojo; no es una fotografía de su superficie.'),
'vy':('OBSERVACIÓN · HUBBLE','Material expulsado por la hipergigante VY Canis Majoris.'),
'milky':('ILUSTRACIÓN CIENTÍFICA','Representación de la estructura de la Vía Láctea. No es una fotografía tomada desde fuera.'),
'lmc':('FOTOGRAFÍA DESDE LA ISS','Las Nubes de Magallanes, fotografiadas desde la Estación Espacial Internacional.'),
'andromeda':('MOSAICO OBSERVACIONAL · HUBBLE','Región de Andrómeda en un mosaico del telescopio Hubble.'),
'crab':('MOSAICO OBSERVACIONAL · HUBBLE','Nebulosa del Cangrejo, remanente de supernova que contiene un púlsar.'),
'neutron':('ILUSTRACIÓN DE UNA HIPÓTESIS','Posible disco de polvo alrededor de RX J0806.4−4123. Esta interpretación no está demostrada por la ilustración.'),
'sagittarius':('OBSERVACIÓN EN RAYOS X · CHANDRA','Gas del entorno del centro galáctico y Sagitario A*. No es una fotografía de su horizonte.'),
'm87':('OBSERVACIÓN INFRARROJA · SPITZER','Galaxia M87 y su chorro. No es la reconstrucción de la sombra de M87* del EHT.'),
'quasar':('ILUSTRACIÓN CIENTÍFICA','Cuásar ilustrativo similar a APM 08279+5255. No representa una observación de TON 618.'),
'ton':('VISUALIZACIÓN CIENTÍFICA · NASA','Comparación ilustrada de escalas de agujeros negros; la fuente incluye TON 618.'),
'attractor':('OBSERVACIÓN · HUBBLE','Campo de galaxias en la región del Gran Atractor; no es un único objeto que atraiga todo el universo.'),
'darkmatter':('COMPOSICIÓN MULTIBANDA','Cúmulo Abell 1689. Las observaciones permiten estudiar la masa por sus efectos gravitatorios.'),
'cmb':('VISUALIZACIÓN DE DATOS · PLANCK','Polarización del fondo cósmico de microondas. No representa el dipolo de temperatura.'),
'dipole':('MAPAS OBSERVACIONALES · COBE/DMR','Arriba: brillo casi uniforme. Centro: contraste del dipolo. Abajo: señal tras sustraer el dipolo, con emisión galáctica aún visible.'),
'woh':('OBSERVACIÓN INTERFEROMÉTRICA','WOH G64 y su envoltura de polvo reconstruidas con GRAVITY/VLTI; colores de representación.')}
labels['tarantula']=('OBSERVACIÓN · ESO','Nebulosa de la Tarántula en la Gran Nube de Magallanes.')
for k,v in a.items():v.update(label=labels[k][0],caption=labels[k][1]);v.pop('description',None)
a['woh']['credit']='ESO/K. Ohnaka et al. · CC BY 4.0';a['proxima']['credit']='NASA y ESA';a['vy']['credit']='NASA, ESA, Roberta Humphreys (UMN)';a['neutron']['credit']='NASA, ESA y N. Tr’Ehnl (Pennsylvania State University)';a['attractor']['credit']='ESA/Hubble y NASA';a['ton']['credit']='NASA’s Goddard Space Flight Center';a['sirius']['credit']='NASA, ESA, H. Bond (STScI), M. Barstow (University of Leicester)';a['earth']['credit']='NASA/NOAA/GSFC/Suomi NPP/VIIRS/Norman Kuring'
random.seed(41);svg=['<svg xmlns="http://www.w3.org/2000/svg" width="900" height="540" viewBox="0 0 900 540"><rect width="900" height="540" fill="#080c1a"/>']
for i in range(500):
 x,y=random.uniform(30,870),random.uniform(30,490)
 if ((x-450)/200)**2+((y-255)/160)**2<1 and random.random()>.035:continue
 svg.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{random.uniform(.7,2.8):.1f}" fill="#c6b0eb" opacity="{random.uniform(.3,.9):.2f}"/>')
svg.append('<ellipse cx="450" cy="255" rx="200" ry="160" fill="none" stroke="#8876b5" stroke-dasharray="5 9"/><text x="450" y="250" text-anchor="middle" fill="#d9c9ed" font-family="Arial" font-size="20">REGIÓN DE MENOR DENSIDAD</text><text x="450" y="520" text-anchor="middle" fill="#9b8db5" font-family="Arial" font-size="16">ESQUEMA CONCEPTUAL · NO ES UN MAPA DEL VACÍO DE BOÖTES</text></svg>');(r/'dist/assets/atlas/void.svg').write_text(''.join(svg))
svg=['<svg xmlns="http://www.w3.org/2000/svg" width="900" height="540" viewBox="0 0 900 540"><rect width="900" height="540" fill="#080c1a"/><text x="450" y="65" text-anchor="middle" fill="#dfccff" font-size="24" font-family="Arial">EXPANSIÓN DEL ESPACIO</text>']
for i,step in enumerate([25,45,70]):
 cx=150+i*300;svg.append(f'<rect x="{cx-135}" y="120" width="270" height="290" rx="12" fill="#17142a" stroke="#65527f"/>')
 for xx,yy in [(-1,-1),(1,-1),(0,0),(-1,1),(1,1)]:svg.append(f'<ellipse cx="{cx+xx*step}" cy="{265+yy*step}" rx="9" ry="4" fill="#ddbbff"/>')
 svg.append(f'<text x="{cx}" y="450" text-anchor="middle" fill="#c2aedb" font-size="18" font-family="Arial">ETAPA {i+1}</text>')
svg.append('<text x="450" y="505" text-anchor="middle" fill="#9b8db5" font-size="14" font-family="Arial">ESQUEMA CUALITATIVO · SIN ESCALA · GALAXIAS NO LIGADAS ENTRE SÍ</text></svg>');(r/'dist/assets/atlas/expansion.svg').write_text(''.join(svg))
a['void']=dict(image='assets/atlas/void.svg',label='ESQUEMA CONCEPTUAL',caption='Región ilustrativa de menor densidad. No es un mapa observado del Vacío de Boötes.',credit='Diagrama AVI CONNECTION',source='https://science.nasa.gov/universe/galaxies/large-scale-structures/')
a['expansion']=dict(image='assets/atlas/expansion.svg',label='ESQUEMA CONCEPTUAL',caption='Separaciones crecientes entre galaxias no ligadas. No representa datos ni una escala temporal.',credit='Diagrama AVI CONNECTION',source='https://science.nasa.gov/dark-energy/')
a['hero']=dict(image='assets/hero.webp',label='ESCENA ARTÍSTICA · IA',caption='CONNECTION SPACE sobre la Tierra, escenario ficticio de AVI HORIZONS.',credit='AVI CONNECTION · imagen generada con IA',source='#credits-dialog')
a['surface']=dict(image='assets/mars-surface.png',label='ESCENA ARTÍSTICA · IA',caption='Paisaje de exploración marciana del juego; no es una fotografía de Marte.',credit='AVI CONNECTION · imagen generada con IA',source='#credits-dialog')
def L(name,images,description,challenge,science,playable=True):return dict(name=name,images=images.split(),description=description,challenge=challenge,science=science,playable=playable)
def M(short,title,zone,story,levels):return dict(short=short,title=title,zone=zone,story=story,levels=levels)
m=[M('Sistema solar','Los mundos de nuestro Sol','VECINDARIO SOLAR','Lyra reúne a la tripulación para construir la primera sección del Atlas: explorar sin perder el contacto con nuestro hogar.',[
L('Primera salida','earth moon','Tierra y Luna: el comienzo de la exploración.','Preparar navegación y comunicaciones.','Órbitas, referencias y propagación de señales.'),
L('Bajo las nubes','venus','Venus obliga a mirar más allá de nuestros ojos.','Elegir instrumentos para estudiar superficie y atmósfera.','Radar y límites de cada instrumento.'),
L('Ecos de Marte','mars surface','Prepara HORIZON-01, viaja a Marte y reúne datos científicos con AVI o MAQUI.','Resolver una incidencia, aterrizar, explorar y transmitir resultados.','Recursos, transferencia orbital ideal y latencia de comunicación.',True),
L('Entre gigantes','jupiter europa','Júpiter y Europa plantean preguntas sobre ambientes extremos.','Planear observaciones sin confundir imágenes con pruebas de vida.','Radiación, lunas heladas y habitabilidad.'),
L('Camino exterior','saturn titan','Los anillos de Saturno y la atmósfera de Titán amplían el horizonte.','Decidir qué estudiar con energía limitada.','Anillos, espectros y exploración lejana.')]),
M('Otras estrellas','Entre otras estrellas','VÍA LÁCTEA','Nova propone comparar sistemas estelares: una estrella cercana puede ser muy distinta del Sol.',[
L('La vecina roja','proxima','Próxima Centauri abre la sección interestelar del Atlas.','Separar observaciones de hipótesis.','Enanas rojas y distancias interestelares.'),
L('Dos soles','alpha','Alfa Centauri A y B forman un sistema binario.','Distinguir estrellas y referencias de navegación.','Sistemas binarios y dinámica gravitatoria.'),
L('La compañera de Sirio','sirius','Sirio B es una enana blanca junto a Sirio A.','Separar la luz de objetos con brillos muy distintos.','Evolución estelar y contraste.'),
L('Cuna de estrellas','orion','Orión conserva pistas de estrellas en formación.','Comparar imágenes y seleccionar regiones de interés.','Gas, polvo y formación estelar.'),
L('Gigantes de luz','betelgeuse vy','Betelgeuse y VY Canis Majoris muestran estrellas evolucionadas.','Comparar tamaños estimados sin presentar récords definitivos.','Pérdida de masa e incertidumbre de las mediciones.')]),
M('Otras galaxias','Más allá de la Vía Láctea','GRUPO LOCAL Y ENTORNO','Una nueva perspectiva de nuestra galaxia y de los relojes que llevamos a bordo.',[
L('Nuestro lugar','milky','Explora el halo y la estructura de la Vía Láctea.','Situar nuestro sistema solar en una representación galáctica.','Disco, halo y escalas; la vista exterior es una ilustración.'),
L('La nube vecina','lmc tarantula','La Gran Nube de Magallanes y la Tarántula albergan regiones de formación estelar.','Relacionar nebulosas y galaxias anfitrionas.','Jerarquía entre estrellas, nebulosas y galaxias.'),
L('Una estrella extragaláctica','woh','WOH G64 se observa a través de su envoltura de polvo.','Distinguir estructuras reconstruidas de ilustraciones.','Interferometría y resolución.'),
L('Horizonte de Andrómeda','andromeda','Andrómeda permite estudiar movimientos y distribución de masa.','Comparar modelos y observaciones.','La materia oscura se infiere por efectos gravitatorios.'),
L('La fecha del regreso','earth milky','Dos relojes pueden acumular tiempos diferentes durante un viaje ideal.','Comparar el reloj de referencia y el tiempo propio en el laboratorio.','La dilatación depende del movimiento y la gravedad; salir de una galaxia no la causa por sí solo.')]),
M('Entornos extremos','Al borde del horizonte','PÚLSARES Y AGUJEROS NEGROS','Teo y Nova preparan observaciones remotas de los ambientes más extremos.',[
L('El faro del Cangrejo','crab','Un púlsar vive en un remanente de supernova.','Relacionar pulsos periódicos y rotación.','Estrellas de neutrones y remanentes de supernova.'),
L('Un resplandor inesperado','neutron','RX J0806.4−4123 plantea preguntas sobre emisión infrarroja extendida.','Comparar explicaciones y proponer nuevas observaciones.','Una anomalía no equivale a una señal artificial.'),
L('El corazón de la galaxia','sagittarius','Sagitario A* ocupa el entorno central de nuestra galaxia.','Estudiar gas cercano y relojes en un modelo ideal.','Horizonte de sucesos y dilatación gravitatoria bajo supuestos explícitos.'),
L('El chorro de M87','m87','M87 alberga un agujero negro supermasivo y un chorro prominente.','Distinguir galaxia, chorro y sombra del agujero negro.','Acreción y técnicas de observación.'),
L('La escala de TON 618','ton quasar','TON 618 permite explorar la escala de agujeros negros extremadamente masivos asociados a cuásares.','Comparar escalas y reconocer incertidumbres.','Cuásares y discos de acreción. No existe una fotografía de cerca de TON 618.')]),
M('Grandes misterios','El universo que todavía desconocemos','COSMOLOGÍA','El Atlas termina con preguntas abiertas: la siguiente aventura comienza con una nueva observación.',[
L('El Vacío de Boötes','void','Una gran región con relativamente pocas galaxias.','Reconocer regiones de baja densidad en la red cósmica.','Estructura a gran escala; el esquema no es un mapa observado.'),
L('Hacia el Gran Atractor','attractor','Los movimientos de galaxias revelan concentraciones de materia.','Separar expansión y velocidades peculiares.','Una región de concentración de masa, no un agujero negro universal.'),
L('Lo que no vemos','darkmatter','Las lentes gravitatorias ayudan a investigar la masa de cúmulos.','Comparar materia visible y modelos de lente gravitatoria.','Evidencias gravitatorias de materia oscura; su naturaleza sigue abierta.'),
L('Una dirección en el fondo','dipole cmb','El dipolo del fondo cósmico ayuda a estudiar nuestro movimiento respecto a ese fondo.','Distinguir dipolo de temperatura, polarización y otras fluctuaciones.','Movimiento del observador y señales cosmológicas.'),
L('Un horizonte en expansión','expansion','La expansión acelerada impulsa el estudio de la energía oscura.','Comparar modelos y sus predicciones observables.','Materia oscura y energía oscura son conceptos distintos.')])]
(r/'dist/atlas-data.js').write_text('export const IMAGES = '+json.dumps(a,ensure_ascii=False,indent=2)+';\nexport const ATLAS = '+json.dumps(m,ensure_ascii=False,indent=2)+';\n')
(r/'docs/IMAGENES.md').write_text('# Imágenes y atribuciones\n\nImágenes redimensionadas y convertidas a WebP. Los diagramas son cualitativos y no representan datos observados.\n\n'+'\n'.join(f"- **{k}**: {v['label']}. {v['caption']} Crédito: {v['credit']}. Fuente: {v['source']}" for k,v in a.items()))
print(len(a),'images;',sum(len(x['levels']) for x in m),'levels')
