/**
 * REAL radio stations — popular stations from around the world
 * These are publicly available stream URLs
 */
const RADIO_STATIONS = {
  // UK STATIONS
  'virgin': {
    name: '📻 Virgin Radio UK',
    url: 'http://icecast.unitedradio.it/Virgin.mp3',
    genre: 'Pop / Rock (Virgin Radio)',
    description: 'Virgin Radio - rock & pop hits',
  },
  'virgin-anthems': {
    name: '🎸 Virgin Radio Rock',
    url: 'http://icecast.unitedradio.it/VirginRock.mp3',
    genre: 'Rock (Virgin Radio)',
    description: 'Rock anthems',
  },
  'virgin-chilled': {
    name: '🌊 Radio Monte Carlo',
    url: 'http://edge.radiomontecarlo.net/RMC.mp3',
    genre: 'Chill / Easy Listening',
    description: 'Smooth, relaxed hits',
  },
  'virgin-80s': {
    name: '📼 Virgin Radio 80s',
    url: 'http://icecast.unitedradio.it/Virgin80.mp3',
    genre: '80s Hits (Virgin Radio)',
    description: '80s classics',
  },

  'bbc1': {
    name: '🇬🇧 BBC Radio 1',
    url: 'http://bbcmedia.ic.llnwd.net/stream/bbcmedia_radio1_mf_p',
    genre: 'Pop / New Music (UK)',
    description: 'The biggest new music',
  },
  'bbc1xtra': {
    name: '🎤 BBC Radio 1Xtra',
    url: 'http://bbcmedia.ic.llnwd.net/stream/bbcmedia_radio1xtra_mf_p',
    genre: 'Hip Hop / R&B / Grime (UK)',
    description: 'Hip hop, R&B, grime, Afrobeats',
  },
  'bbc2': {
    name: '🎵 BBC Radio 2',
    url: 'http://bbcmedia.ic.llnwd.net/stream/bbcmedia_radio2_mf_p',
    genre: 'Adult Contemporary (UK)',
    description: 'Classic hits & adult pop',
  },
  'bbc6': {
    name: '🎸 BBC Radio 6 Music',
    url: 'http://bbcmedia.ic.llnwd.net/stream/bbcmedia_6music_mf_p',
    genre: 'Alternative / Indie (UK)',
    description: 'Alternative, indie, eclectic',
  },

  // CANADA STATIONS
  'cbc-music': {
    name: '🇨🇦 CBC Music (Pacific/Vancouver)',
    url: 'http://cbcmp3.ic.llnwd.net/stream/cbcmp3_cbc_r2_vcr',
    genre: 'Eclectic / Canadian Music',
    description: 'Canada\'s best - all genres',
  },
  'cbc-radio1': {
    name: '🇨🇦 CBC Radio One (Toronto)',
    url: 'http://cbcmp3.ic.llnwd.net/stream/cbcmp3_cbc_r1_tor',
    genre: 'News / Talk / Music (Canada)',
    description: 'CBC flagship station',
  },

  // FRANCE / NRJ
  'nrj': {
    name: '⚡ NRJ (Hit Music Only)',
    url: 'https://scdn.nrjaudio.fm/adwz2/fr/30001/mp3_128.mp3',
    genre: 'Pop Hits (France)',
    description: 'Europe\'s #1 hit music station',
  },
  'nrj-dance': {
    name: '💃 NRJ Dance',
    url: 'https://scdn.nrjaudio.fm/adwz2/fr/30617/mp3_128.mp3',
    genre: 'Dance / Electronic (France)',
    description: 'Best dance hits',
  },
  'nrj-hiphop': {
    name: '🎤 NRJ Hip Hop',
    url: 'https://scdn.nrjaudio.fm/adwz2/fr/30619/mp3_128.mp3',
    genre: 'Hip Hop (France)',
    description: 'Hip hop & rap',
  },

  // US STATIONS
  'kexp': {
    name: '🎵 KEXP 90.3 FM (Seattle)',
    url: 'https://kexp-mp3-128.streamguys1.com/kexp128.mp3',
    genre: 'Indie / Alternative (Seattle)',
    description: 'Best independent music station in the US',
  },
  'kcrw': {
    name: '🌴 KCRW (Los Angeles)',
    url: 'http://kcrw.streamguys1.com/kcrw_192k_mp3_e24_internet_radio',
    genre: 'Eclectic / Indie (LA)',
    description: 'LA\'s iconic eclectic station',
  },

  // INTERNATIONAL
  'nts': {
    name: '🎧 NTS Radio (London)',
    url: 'https://stream-relay-geo.ntslive.net/stream',
    genre: 'Underground / Eclectic (London)',
    description: 'London underground music',
  },
  'triplej': {
    name: '🇦🇺 Triple J (Australia)',
    url: 'https://live-radio01.mediahubaustralia.com/2TJW/mp3/',
    genre: 'Alternative / Youth (Australia)',
    description: 'Australia\'s youth station',
  },
  'worldwide': {
    name: '🌍 Worldwide FM',
    url: 'http://worldwidefm.out.airtime.pro:8000/worldwidefm_a',
    genre: 'World / Soul / Jazz',
    description: 'Gilles Peterson\'s global station',
  },

  // ITALY
  'virgin-italy': {
    name: '🇮🇹 Virgin Radio Italy',
    url: 'http://icecast.unitedradio.it/Virgin.mp3',
    genre: 'Rock / Hits (Italy)',
    description: 'Virgin Radio Italia - rock hits',
  },
  'radio105': {
    name: '🇮🇹 Radio 105',
    url: 'http://icecast.105.net/105.mp3',
    genre: 'Pop / Hits (Italy)',
    description: 'Italy\'s popular hit station',
  },
  'rmc': {
    name: '🇲🇨 Radio Monte Carlo',
    url: 'http://edge.radiomontecarlo.net/RMC.mp3',
    genre: 'Easy Listening / Pop',
    description: 'Radio Monte Carlo - smooth hits',
  },

  // SOMAFM (ad-free, curated)
  'somafm-groove': {
    name: '🕺 SomaFM Groove Salad',
    url: 'https://ice4.somafm.com/groovesalad-128-aac',
    genre: 'Ambient / Downtempo',
    description: 'Chill electronic vibes',
  },
  'somafm-indie': {
    name: '🎸 SomaFM Indie Pop Rocks',
    url: 'https://ice4.somafm.com/indiepop-128-aac',
    genre: 'Indie Pop / Rock',
    description: 'Indie pop and rock',
  },
  'somafm-soul': {
    name: '🎷 SomaFM Seven Inch Soul',
    url: 'http://ice4.somafm.com/7soul-128-aac',
    genre: 'Soul / R&B / Funk',
    description: '60s & 70s soul & funk',
  },
  'somafm-defcon': {
    name: '⚡ SomaFM DEF CON',
    url: 'https://ice4.somafm.com/defcon-128-aac',
    genre: 'Synthwave / Dark Electronic',
    description: 'Hacker music',
  },
  'somafm-metal': {
    name: '🤘 SomaFM Metal Detector',
    url: 'https://ice4.somafm.com/metal-128-aac',
    genre: 'Heavy Metal',
    description: 'From black to doom to sludge',
  },

  // GENRE STATIONS (24/7, no talk)
  'lofi': {
    name: '🎧 SomaFM Lo-Fi',
    url: 'https://ice4.somafm.com/vaporwaves-128-aac',
    genre: 'Lo-fi / Vaporwave',
    description: 'Lo-fi, vaporwave, future funk',
  },
  'pop': {
    name: '🌟 Pop Hits FM',
    url: 'http://stream.laut.fm/pop',
    genre: 'Pop',
    description: '24/7 pop hits',
  },
  'rock': {
    name: '🎸 Classic Rock FM',
    url: 'http://stream.laut.fm/classicrock',
    genre: 'Classic Rock',
    description: '24/7 classic rock',
  },
  'metal': {
    name: '🤘 Metal FM',
    url: 'http://stream.laut.fm/metal',
    genre: 'Metal',
    description: '24/7 metal',
  },
  'hiphop': {
    name: '🎤 Hip Hop FM',
    url: 'http://stream.laut.fm/hiphop',
    genre: 'Hip Hop',
    description: '24/7 hip hop',
  },
  'rnb': {
    name: '💜 R&B FM',
    url: 'http://stream.laut.fm/rnb',
    genre: 'R&B / Soul',
    description: '24/7 R&B',
  },
  'house': {
    name: '🏠 Deep House FM',
    url: 'http://stream.laut.fm/deephouse',
    genre: 'Deep House',
    description: '24/7 deep house',
  },
  'techno': {
    name: '🔊 Techno FM',
    url: 'http://stream.laut.fm/techno',
    genre: 'Techno',
    description: '24/7 techno',
  },
  'indie': {
    name: '🎵 Indie FM',
    url: 'http://stream.laut.fm/indierock',
    genre: 'Indie Rock',
    description: '24/7 indie rock',
  },
  'reggae': {
    name: '🌴 Reggae FM',
    url: 'http://stream.laut.fm/reggae',
    genre: 'Reggae',
    description: '24/7 reggae',
  },
  'blues': {
    name: '🎺 Blues FM',
    url: 'http://stream.laut.fm/blues',
    genre: 'Blues',
    description: '24/7 blues',
  },
  '80s': {
    name: '📼 80s Hits FM',
    url: 'http://stream.laut.fm/80er',
    genre: '80s',
    description: '24/7 80s hits',
  },
  '90s': {
    name: '💿 90s Hits FM',
    url: 'http://stream.laut.fm/90er',
    genre: '90s',
    description: '24/7 90s hits',
  },
  'jazz': {
    name: '🎷 KJAZZ 88.1 FM (LA)',
    url: 'http://1.ice1.firststreaming.com/kkjz_fm.aac',
    genre: 'Jazz (Los Angeles)',
    description: 'Full-time jazz station',
  },
  'jazz-nola': {
    name: '🎺 WWOZ (New Orleans)',
    url: 'https://wwoz-sc.streamguys1.com/wwoz-hi.mp3',
    genre: 'Jazz / Blues / Zydeco (NOLA)',
    description: 'New Orleans jazz & more',
  },
  'classical': {
    name: '🎻 WQXR (New York)',
    url: 'https://stream.wqxr.org/wqxr-web',
    genre: 'Classical (NYC)',
    description: 'New York\'s classical station',
  },
  'ambient': {
    name: '🌙 Ambient FM',
    url: 'http://stream.laut.fm/ambient',
    genre: 'Ambient / Sleep',
    description: 'Relaxing ambient music',
  },
};


/**
 * Get a radio station by name
 */
function getStation(name) {
  return RADIO_STATIONS[name.toLowerCase()] || null;
}

/**
 * Get all available stations
 */
function getAllStations() {
  return RADIO_STATIONS;
}

/**
 * Search stations by genre, name, or description
 */
function searchStations(query) {
  const q = query.toLowerCase();
  return Object.entries(RADIO_STATIONS).filter(
    ([key, station]) =>
      key.includes(q) ||
      station.name.toLowerCase().includes(q) ||
      station.genre.toLowerCase().includes(q) ||
      station.description.toLowerCase().includes(q)
  );
}

module.exports = { getStation, getAllStations, searchStations, RADIO_STATIONS };
