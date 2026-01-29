// Mapare nume materiale din CSV la nume in baza de date
export const materialMapping: Record<string, string> = {
  // Feroase
  'FIER': 'Fier',
  'INOX': 'Otel inoxidabil',
  'SPAN FIER': 'Span fier', // material nou
  'STANTA': 'Fier',

  // Neferoase - Cupru
  'CUPRU': 'Cupru',
  'CABLURI CUPRU': 'Cablu cupru',
  'CABLU CUPRU': 'Cablu cupru',
  'CABLU CUPRU/PLUMB': 'Cablu cupru', // varianta
  'CABLURI CUPRU/FIER': 'Cablu cupru', // varianta
  'RADIATOARE CUPRU': 'Radiatoare cupru',
  'RADIATOR CUPRU': 'Radiatoare cupru',

  // Neferoase - Aluminiu
  'ALUMINIU': 'Aluminiu',
  'CABLURI ALUMINIU': 'Cablu aluminiu',
  'CABLU ALUMINIU': 'Cablu aluminiu',
  'RADIATOR ALUMINIU': 'Radiatoare aluminiu',
  'RADIATOARE ALUMINIU': 'Radiatoare aluminiu',
  'RADIATOARE CUPRU/ALUMINIU': 'Radiatoare cupru/aluminiu', // material nou
  'RADIATOR ALAMA': 'Radiatoare cupru', // mapam la cupru
  'SPAN ALUMINIU': 'Span aluminiu', // material nou
  'ALUMINIU PROFILE': 'Aluminiu',
  'ALUMINIU GENTI': 'Aluminiu genti', // material nou
  'ALUMINIU BOBINE': 'Aluminiu',
  'ALUMINIU SARMA': 'Aluminiu',

  // Neferoase - Alte
  'ALAMA': 'Alama',
  'BRONZ': 'Bronz',
  'ZINC': 'Zinc',
  'PLUMB': 'Plumb',
  'NICHEL': 'Nichel',
  'Zamac': 'Zamac', // material nou
  'ZAMAC': 'Zamac',

  // DEEE
  'DEEE': 'Electronice (DEEE)',
  'BATERII AUTO': 'Baterii auto',
  'CIRCUITE IMPRIMATE': 'Electronice (DEEE)',
  'PLACI': 'Electronice (DEEE)',
  'MOTOARE DIN MASINI': 'Motoare electrice',
  'CATALIZATOR': 'Catalizator', // material nou
  'HARDURI': 'Electronice (DEEE)',
  'SURSE': 'Electronice (DEEE)',
  'BOBINE': 'Electronice (DEEE)',
  'CONDENSATORI NON PCB': 'Electronice (DEEE)',

  // Altele
  'PLASTIC': 'Plastic',
  'HARTIE': 'Hartie/Carton',
  'LEMN': 'Lemn', // material nou
  'STICLA': 'Sticla', // material nou
  'STICLA CIOB': 'Sticla',
  'GUNOI': 'Gunoi', // material nou
  'RABLA AMESTEC': 'Rabla amestec', // material nou
  'FOLIE': 'Plastic',
  'ANVELOPE': 'Anvelope', // material nou
}

// Materiale care trebuie adaugate in baza de date
export const newMaterials = [
  { name: 'Span fier', unit: 'kg', category: 'feros' },
  { name: 'Span aluminiu', unit: 'kg', category: 'neferos' },
  { name: 'Aluminiu genti', unit: 'kg', category: 'neferos' },
  { name: 'Radiatoare cupru/aluminiu', unit: 'kg', category: 'neferos' },
  { name: 'Zamac', unit: 'kg', category: 'neferos' },
  { name: 'Catalizator', unit: 'kg', category: 'neferos' },
  { name: 'Lemn', unit: 'kg', category: 'altele' },
  { name: 'Sticla', unit: 'kg', category: 'altele' },
  { name: 'Gunoi', unit: 'kg', category: 'altele' },
  { name: 'Rabla amestec', unit: 'kg', category: 'altele' },
  { name: 'Anvelope', unit: 'kg', category: 'altele' },
]

// Functie pentru normalizarea numelui materialului
export function normalizeMaterialName(name: string): string {
  const normalized = name.trim().toUpperCase()
  return materialMapping[normalized] || materialMapping[name.trim()] || name.trim()
}
