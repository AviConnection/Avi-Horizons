export const FLEET = {
  carrier: { name: 'HORIZONS 1', role: 'Nave nodriza', image: 'assets/horizons-1.webp', note: 'Sostiene el viaje interplanetario y el enlace orbital.' },
  shuttle: { name: 'HORIZONS 2', role: 'Explorador de superficie', image: 'assets/horizons-2.webp', note: 'Desciende con los instrumentos para investigar Faro 7.' },
};

export function shipImage(key, className = '') {
  const ship = FLEET[key];
  return `<img class="${className}" src="${ship.image}" alt="${ship.name}">`;
}

export function fleetCards() {
  return `<div class="fleet-cards">${Object.entries(FLEET).map(([key, ship]) =>
    `<article class="fleet-card fleet-${key}">${shipImage(key)}<div><strong>${ship.name}</strong><span>${ship.role}</span><p>${ship.note}</p></div></article>`
  ).join('')}</div>`;
}
