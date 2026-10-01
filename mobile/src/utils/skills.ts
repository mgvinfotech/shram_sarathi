const SKILL_TRANSLATIONS: Record<string, { en: string; hi: string }> = {
  // majdoor
  general_labor: { en: 'General Labor', hi: 'सामान्य मजदूर' },
  construction: { en: 'Construction', hi: 'निर्माण मजदूर' },
  agriculture: { en: 'Agriculture', hi: 'खेती मजदूर' },
  loading_unloading: { en: 'Loading/Unloading', hi: 'लोडिंग/अनलोडिंग' },
  digging: { en: 'Digging', hi: 'खुदाई' },
  cleaning: { en: 'Cleaning', hi: 'सफाई' },

  // karigar
  plumber: { en: 'Plumber', hi: 'प्लंबर' },
  electrician: { en: 'Electrician', hi: 'इलेक्ट्रीशियन' },
  painter: { en: 'Painter', hi: 'पेंटर' },
  carpenter: { en: 'Carpenter', hi: 'बढ़ई' },
  mason: { en: 'Mason', hi: 'राजमिस्त्री' },
  welder: { en: 'Welder', hi: 'वेल्डर' },
  ac_mechanic: { en: 'AC Mechanic', hi: 'AC मैकेनिक' },
  tile_work: { en: 'Tile Work', hi: 'टाइल काम' },

  // thekedar
  building_contractor: { en: 'Building Contractor', hi: 'भवन ठेकेदार' },
  road_contractor: { en: 'Road Contractor', hi: 'सड़क ठेकेदार' },
  labor_contractor: { en: 'Labor Contractor', hi: 'मजदूर ठेकेदार' },
  painting_contractor: { en: 'Painting Contractor', hi: 'पेंटिंग ठेकेदार' },

  // krishi_yantra
  tractor: { en: 'Tractor', hi: 'ट्रैक्टर' },
  harvester: { en: 'Harvester', hi: 'हार्वेस्टर' },
  rotavator: { en: 'Rotavator', hi: 'रोटावेटर' },
  thresher: { en: 'Thresher', hi: 'थ्रेशर' },
  pump_set: { en: 'Pump Set', hi: 'पंप सेट' },
  sprayer: { en: 'Sprayer', hi: 'स्प्रेयर' },

  // nirman_machine
  jcb: { en: 'JCB / Excavator', hi: 'JCB / खुदाई मशीन' },
  concrete_mixer: { en: 'Concrete Mixer', hi: 'कंक्रीट मिक्सर' },
  crane: { en: 'Crane', hi: 'क्रेन' },
  roller: { en: 'Roller', hi: 'रोलर' },

  // taxi
  auto: { en: 'Auto Rickshaw', hi: 'ऑटो रिक्शा' },
  car: { en: 'Car', hi: 'कार' },
  bike_taxi: { en: 'Bike Taxi', hi: 'बाइक टैक्सी' },
  e_rickshaw: { en: 'E-Rickshaw', hi: 'ई-रिक्शा' },

  // transport
  mini_truck: { en: 'Mini Truck', hi: 'मिनी ट्रक' },
  truck: { en: 'Truck', hi: 'ट्रक' },
  tempo: { en: 'Tempo', hi: 'टेम्पो' },
  pickup: { en: 'Pickup', hi: 'पिकअप' },
};

export const getSkillTranslation = (slug: string, lang: 'hi' | 'en'): string => {
  const trans = SKILL_TRANSLATIONS[slug];
  if (trans) {
    return lang === 'hi' ? trans.hi : trans.en;
  }
  return slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};
