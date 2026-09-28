export type Weather = 'clear' | 'cloudy' | 'rain' | 'thunderstorm' | 'snow'

const WEATHER_KEY = 'loft-weather-v1'
const weatherValues: Weather[] = ['clear', 'cloudy', 'rain', 'thunderstorm', 'snow']

function isSouthernHemisphere(timeZone: string) {
  return /^(Australia\/|Antarctica\/(?!Troll)|Pacific\/(Auckland|Chatham|Fiji|Apia|Tongatapu|Port_Moresby|Noumea|Guadalcanal|Port_Vila|Funafuti|Nauru|Tarawa|Wallis|Majuro|Pohnpei|Chuuk|Efate)|America\/(Argentina|Sao_Paulo|Campo_Grande|Bahia|Belem|Fortaleza|Maceio|Recife|Porto_Velho|Manaus|Boa_Vista|Cuiaba|Eirunepe|Rio_Branco|Montevideo|Santiago|Punta_Arenas|Asuncion|Paramaribo|Cayenne)|Africa\/(Johannesburg|Maputo|Harare|Lusaka|Windhoek|Gaborone|Blantyre|Mbabane|Maseru))/.test(timeZone)
}

function chooseWeighted(entries: [Weather, number][]): Weather {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0)
  let remaining = Math.random() * total
  for (const [weather, weight] of entries) {
    remaining -= weight
    if (remaining < 0) return weather
  }
  return entries[entries.length - 1][0]
}

export function getVisitWeather(): Weather {
  // Local art-direction preview; production always uses the per-visit selection.
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const preview = new URLSearchParams(window.location.search).get('weather')
    if (preview && weatherValues.includes(preview as Weather)) return preview as Weather
  }
  let storage: Storage | null = null
  try {
    storage = typeof window === 'undefined' ? null : window.sessionStorage
    const saved = storage?.getItem(WEATHER_KEY)
    if (saved && weatherValues.includes(saved as Weather)) return saved as Weather
  } catch {
    // Some privacy modes block session storage; this visit still keeps its choice in React state.
  }

  let weights: [Weather, number][] = [
    ['clear', 40],
    ['cloudy', 35],
    ['rain', 15],
    ['thunderstorm', 10],
  ]
  try {
    const now = new Date()
    const month = now.getMonth()
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const northernWinter = (month === 10 || month === 11 || month === 0 || month === 1) && !isSouthernHemisphere(timeZone)
    if (northernWinter) weights = [['clear', 35], ['cloudy', 30], ['rain', 15], ['thunderstorm', 10], ['snow', 10]]
  } catch {
    // Fall back to the all-season distribution when locale data is unavailable.
  }

  const weather = chooseWeighted(weights)
  try {
    storage?.setItem(WEATHER_KEY, weather)
  } catch {
    // App state still makes the choice stable during this mounted visit.
  }
  return weather
}
