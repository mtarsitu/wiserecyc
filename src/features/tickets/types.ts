// Types for weighing tickets

export interface TicketCompany {
  name: string
  cui: string | null
  regCom: string | null
  address: string | null
  city: string | null
  county: string | null
  phone: string | null
  email: string | null
  logo?: string | null
  weighingLocation?: string | null  // Locatie cantarire (ex: "STUPAREI - VALCEA")
  scaleName?: string | null         // Nume cantar (ex: "SWS")
  scaleAccuracyClass?: string | null // Clasa exactitate (ex: "III")
}

export interface TicketPartner {
  name: string
  cui?: string | null
  regCom?: string | null
  address?: string | null
  city?: string | null
  county?: string | null
  phone?: string | null
  email?: string | null
}

export interface TicketItem {
  materialName: string
  quantity: number
  impuritiesPercent: number
  finalQuantity: number
  pricePerKg: number
  lineTotal: number
}

export interface TicketData {
  type: 'acquisition' | 'sale'
  ticketNumber: string
  weighingDate: string      // Data cantaririi (poate fi editata)
  weighingTimeBrut: string  // Ora cantaririi brut (poate fi editata)
  weighingTimeTara: string  // Ora cantaririi tara (poate fi editata)
  company: TicketCompany
  partner: TicketPartner
  client?: TicketPartner    // Pentru vanzari (clientul)
  items: TicketItem[]
  subtotal: number
  environmentFund?: number  // Doar pentru achizitii
  transportPrice?: number   // Doar pentru vanzari
  total: number
  notes?: string | null
  receiptNumber?: string | null  // Nr bon/factura pentru achizitii
  scaleNumber?: string | null    // Nr cantar pentru vanzari
  createdAt: string         // Data salvarii in DB

  // Weighing ticket specific fields
  generatedBy?: string | null      // Tichet generat de
  weighedBy?: string | null        // Cantarire efectuata de
  vehicleNumber?: string | null    // Nr. auto (ex: "IF 51 MRN")
  vehicleConfig?: string | null    // Configuratie vehicul (ex: "5 axe")
  transporterName?: string | null  // Transportator
  delegateName?: string | null     // Delegat
  avizNumber?: string | null       // Nr. aviz
  weighingType?: string | null     // Tip cantarire (Statica/Dinamica)
  operatorName?: string | null     // Operator cantar

  // Weights
  weightTara?: number | null       // TARA in kg
  weightBrut?: number | null       // BRUT in kg
  weightNet?: number | null        // NET in kg

  // Material description
  materialDescription?: string | null // Tip + Natura materialelor transportate
}

export interface DateTimeEditState {
  date: string
  timeBrut: string
  timeTara: string
}

// ============================================
// Aviz de Insotire a Marfii
// ============================================

export interface AvizData {
  // Numar si data
  avizNumber: string
  avizDate: string

  // Furnizor (expeditor) - compania noastra
  furnizor: {
    name: string
    cui: string | null
    regCom: string | null
    address: string | null
    city: string | null
    county: string | null
    phone: string | null
    bank?: string | null
    iban?: string | null
  }

  // Cumparator (destinatar) - clientul
  cumparator: {
    name: string
    cui: string | null
    regCom: string | null
    address: string | null
    city: string | null
    county: string | null
    phone: string | null
  }

  // Punct de lucru / adresa de livrare
  punctLucruExpeditor?: string | null
  punctLucruDestinatar?: string | null

  // Delegat / sofer
  delegat?: {
    name: string | null
    cnp?: string | null
    vehicleNumber?: string | null
  }

  // Produse
  items: AvizItem[]

  // Transport
  transportType?: string | null  // auto, CFR, etc.

  // Observatii
  notes?: string | null
}

export interface AvizItem {
  name: string           // Denumirea produsului
  um: string             // Unitatea de masura (kg, buc, etc.)
  quantity: number       // Cantitatea
  price?: number         // Pretul unitar (optional pe aviz)
  total?: number         // Total (optional pe aviz)
}

// ============================================
// Anexa 3 - Formular incarcare-descarcare deseuri nepericuloase
// Format oficial conform HG 1061/2008
// ============================================

export interface Anexa3Data {
  // Serie si numar formular
  seria: string
  numar: string

  // INCARCAREA - Date de identificare expeditor
  expeditor: {
    name: string
    cui: string | null
    punctLucru: string | null  // Punct de lucru complet
    autorizatieMediu: string | null  // Nr. autorizatie de mediu
    dataExpirareAutorizatie: string | null
  }

  // DESCARCAREA - Date de identificare destinatar
  destinatar: {
    name: string
    cui: string | null
    punctLucru: string | null
    autorizatieMediu: string | null
    dataExpirareAutorizatie: string | null
    vizaAnuala?: string | null
  }

  // Date de identificare transportator
  transportator: {
    name: string | null
    // Date delegat
    delegatName: string | null
    delegatCI: string | null  // Seria si nr CI
    vehicleNumber: string | null  // Nr inmatriculare auto
    licentaTransport: string | null  // Nr licenta transport marfuri nepericuloase
    dataExpirareTransport: string | null
  }

  // Caracteristici deseuri - array pentru multiple materiale
  deseuri: Array<{
    categorie: string  // ex: "DESEU FIER"
    cod: string        // ex: "19 12 02"
    descriere: string  // ex: "NEPERICULOASE"
    cantitateKg: number  // Cantitatea in kg
    cantitateTone: number  // Cantitatea in tone
    mc?: number | null  // metri cubi (optional)
  }>

  // Destinat (se aplica la toate deseurile)
  destinatie: {
    colectarii: boolean
    stocarii: boolean
    tratarii: boolean
    valorificarii: boolean
    eliminarii: boolean
  }

  // Total cantitate
  totalCantitate: {
    tone: number
    mc?: number | null
  }

  // Date privind punctul de lucru
  punctLucruInfo?: string | null

  // Observatii
  observatii?: string | null

  // Date incarcare/descarcare
  dataIncarcare: string
  dataDescarcare?: string | null
}

export interface Anexa3Deseu {
  codDeseu: string        // Codul deseului (ex: 19 12 02)
  denumire: string        // Denumirea deseului (ex: DESEU FIER)
  descriere: string       // Descriere (ex: NEPERICULOASE)
  cantitate: number       // Cantitatea in tone
  mc?: number | null      // metri cubi (optional)
}
