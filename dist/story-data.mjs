export const RELAY_CASES = Object.freeze({
  close: {
    label: 'Acercamiento de Marte · 31 jul. 2018',
    distanceKm: 57_600_000,
    source: 'https://science.nasa.gov/resource/mars-apparent-brightness-increases-as-it-gets-closer-to-earth/',
    credit: 'NASA/JPL-Caltech',
  },
  insight: {
    label: 'Aterrizaje de InSight · 26 nov. 2018',
    distanceKm: 146_000_000,
    source: 'https://solarsystem.nasa.gov/system/downloadable_items/2706_mars_insight_landing_presskit.pdf',
    credit: 'NASA/JPL-Caltech · guía de prensa de InSight',
  },
});

export const ECHO_WINDOW = 720;
export const CONTROL_PROCESSING = 120;
export const ECHO_LOCAL_COST = 35;
export const ECHO_LINK_COST = 5;

export const STORY_CHAPTERS = [
  'El agua y la energía escasean en la Tierra. Alex recibe un fragmento del archivo de Faro 7 y pide que lo verifiques antes de recomendar una nueva expedición.',
  'El archivo de Marte ha cambiado la pregunta del programa. Antes de buscar un nuevo hogar, Alex quiere averiguar qué riesgos esconden las estrellas que podrían iluminarlo.',
  'La tripulación de relevo envía su fecha de encuentro. La nave y la Tierra cuentan años distintos en el simulador. Ayuda a Alex a fijar un regreso que ambas tripulaciones puedan interpretar.',
  'Un pulso regular y un resplandor infrarrojo llegan al archivo. Alex propone comparar las observaciones antes de darles un origen, y probar cómo la gravedad afecta a los relojes.',
  'Cuando se agotan las rutas conocidas, el Atlas se convierte en una guía para quien siga investigando. Alex necesita que documentes qué se midió, qué se calculó y qué sigue abierto.',
];

export const STORY_EPILOGUE = 'Alex adjunta las 25 observaciones al mensaje de regreso. «La Tierra preguntó qué encontramos. También voy a enviar lo que aún no sabemos. Quien viaje después de nosotros merece tener las dos cosas».';

export const RECOMMENDATIONS = Object.freeze({
  survey: { label: 'Recomendar un reconocimiento sin tripulación', requiredEvidence: 'La Tierra debe recibir el registro de Faro 7 y una observación con instrumento.' },
  measure: { label: 'Solicitar una medición adicional', requiredEvidence: 'La evidencia recibida debe dejar pendiente la validación del hallazgo o la observación instrumental.' },
  defer: { label: 'Aplazar y revisar el plan', requiredEvidence: 'La misión debe haber sido interrumpida o haber terminado sin evidencia confirmada en la Tierra.' },
});
