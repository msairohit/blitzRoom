/**
 * Word pool data for Find the Impostor
 * Rich collection of secret words, categories, generic hints for impostors, and decoys.
 */

import type { SecretWordItem, ImpostorCategory } from './types';

export const SECRET_WORD_POOL: SecretWordItem[] = [
  // ==========================================
  // Locations & Places
  // ==========================================
  {
    id: 'loc_airport',
    category: 'locations',
    word: 'Airport',
    hint: 'A large facility dealing with high-speed travel and security checks.',
    decoys: ['Train Station', 'Harbor', 'Bus Terminal'],
  },
  {
    id: 'loc_space_station',
    category: 'locations',
    word: 'Space Station',
    hint: 'A high-tech habitat operating in zero gravity.',
    decoys: ['Submarine', 'Observatory', 'Antarctic Base'],
  },
  {
    id: 'loc_submarine',
    category: 'locations',
    word: 'Submarine',
    hint: 'A pressurized vessel submerged beneath intense depth.',
    decoys: ['Space Station', 'Cruise Ship', 'Deep Sea Lab'],
  },
  {
    id: 'loc_amusement_park',
    category: 'locations',
    word: 'Amusement Park',
    hint: 'A bustling outdoor venue filled with thrill rides and snacks.',
    decoys: ['Carnival', 'Water Park', 'Zoo'],
  },
  {
    id: 'loc_casino',
    category: 'locations',
    word: 'Casino',
    hint: 'A flashy entertainment venue with card tables, slot machines and dice.',
    decoys: ['Nightclub', 'Luxury Hotel', 'Arcade'],
  },
  {
    id: 'loc_hospital',
    category: 'locations',
    word: 'Hospital',
    hint: 'A sterile facility where medical emergencies and surgeries happen.',
    decoys: ['Pharmacy', 'Dentist Clinic', 'Veterinary Clinic'],
  },
  {
    id: 'loc_museum',
    category: 'locations',
    word: 'Museum',
    hint: 'A quiet cultural building housing ancient relics and artwork.',
    decoys: ['Art Gallery', 'Library', 'Antique Shop'],
  },
  {
    id: 'loc_pirate_ship',
    category: 'locations',
    word: 'Pirate Ship',
    hint: 'A wooden vessel sailing the open seas hunting for treasure.',
    decoys: ['Submarine', 'Navy Destroyer', 'Yacht'],
  },
  {
    id: 'loc_haunted_house',
    category: 'locations',
    word: 'Haunted Mansion',
    hint: 'A spooky, abandoned estate known for eerie noises and ghosts.',
    decoys: ['Escape Room', 'Graveyard', 'Old Castle'],
  },
  {
    id: 'loc_circus',
    category: 'locations',
    word: 'Circus Tent',
    hint: 'A colorful big-top tent with acrobats, clowns and performances.',
    decoys: ['Theater', 'Concert Hall', 'Amusement Park'],
  },
  {
    id: 'loc_library',
    category: 'locations',
    word: 'Library',
    hint: 'A peaceful building full of towering bookshelves and silence rules.',
    decoys: ['Bookstore', 'Study Hall', 'University'],
  },
  {
    id: 'loc_police_station',
    category: 'locations',
    word: 'Police Station',
    hint: 'A municipal building with holding cells, sirens, and patrol officers.',
    decoys: ['Firehouse', 'Courthouse', 'Security Office'],
  },
  {
    id: 'loc_ski_resort',
    category: 'locations',
    word: 'Ski Resort',
    hint: 'A snowy mountain getaway with chairlifts and steep slopes.',
    decoys: ['Ice Rink', 'Mountain Cabin', 'Winter Lodge'],
  },
  {
    id: 'loc_bakery',
    category: 'locations',
    word: 'Bakery',
    hint: 'A warm shop filled with the scent of fresh bread and pastries.',
    decoys: ['Cafe', 'Pizzeria', 'Candy Shop'],
  },
  {
    id: 'loc_movie_theater',
    category: 'locations',
    word: 'Movie Theater',
    hint: 'A dark auditorium with a giant screen, surround sound, and popcorn.',
    decoys: ['Broadway Stage', 'Planetarium', 'Auditorium'],
  },
  {
    id: 'loc_pyramids',
    category: 'locations',
    word: 'Ancient Pyramids',
    hint: 'Massive stone monuments standing in the desert sands for millennia.',
    decoys: ['Colosseum', 'Taj Mahal', 'Stonehenge'],
  },

  // ==========================================
  // Occupations & Jobs
  // ==========================================
  {
    id: 'job_astronaut',
    category: 'occupations',
    word: 'Astronaut',
    hint: 'A specialist trained to venture beyond Earth into outer space.',
    decoys: ['Pilot', 'Astronomer', 'Rocket Scientist'],
  },
  {
    id: 'job_spy',
    category: 'occupations',
    word: 'Secret Agent / Spy',
    hint: 'An operative working undercover to gather top-secret intelligence.',
    decoys: ['Bodyguard', 'Detective', 'Bounty Hunter'],
  },
  {
    id: 'job_chef',
    category: 'occupations',
    word: 'Executive Chef',
    hint: 'A culinary master commanding the kitchen and designing recipes.',
    decoys: ['Baker', 'Food Critic', 'Barista'],
  },
  {
    id: 'job_diver',
    category: 'occupations',
    word: 'Deep Sea Diver',
    hint: 'An underwater explorer wearing heavy suits or scuba gear.',
    decoys: ['Marine Biologist', 'Lifeguard', 'Sailor'],
  },
  {
    id: 'job_firefighter',
    category: 'occupations',
    word: 'Firefighter',
    hint: 'A brave first responder battling blazes and rescuing citizens.',
    decoys: ['Paramedic', 'Police Officer', 'Coast Guard'],
  },
  {
    id: 'job_magician',
    category: 'occupations',
    word: 'Stage Magician',
    hint: 'A performer who deceives the audience with sleight of hand and illusions.',
    decoys: ['Actor', 'Stand-up Comedian', 'Hypnotist'],
  },
  {
    id: 'job_archaeologist',
    category: 'occupations',
    word: 'Archaeologist',
    hint: 'A scientist who digs up ancient tombs, bones, and lost civilizations.',
    decoys: ['Geologist', 'Historian', 'Museum Curator'],
  },
  {
    id: 'job_pilot',
    category: 'occupations',
    word: 'Airline Pilot',
    hint: 'A licensed captain who navigates airplanes through clouds and turbulence.',
    decoys: ['Flight Attendant', 'Astronaut', 'Helicopter Pilot'],
  },
  {
    id: 'job_surgeon',
    category: 'occupations',
    word: 'Brain Surgeon',
    hint: 'A highly trained specialist performing delicate operations in scrubs.',
    decoys: ['Dentist', 'Anesthesiologist', 'Cardiologist'],
  },
  {
    id: 'job_dj',
    category: 'occupations',
    word: 'Festival DJ',
    hint: 'A music performer spinning tracks, mixing beats, and hyping crowds.',
    decoys: ['Radio Host', 'Music Producer', 'Concert Singer'],
  },
  {
    id: 'job_detective',
    category: 'occupations',
    word: 'Private Detective',
    hint: 'An investigator tracking clues, questioning suspects, and solving crimes.',
    decoys: ['Police Chief', 'Journalist', 'Security Guard'],
  },

  // ==========================================
  // Everyday Objects
  // ==========================================
  {
    id: 'obj_microwave',
    category: 'objects',
    word: 'Microwave',
    hint: 'A common kitchen appliance that reheats leftovers in minutes.',
    decoys: ['Toaster', 'Air Fryer', 'Refrigerator'],
  },
  {
    id: 'obj_umbrella',
    category: 'objects',
    word: 'Umbrella',
    hint: 'A collapsible canopy designed to protect you from downpours.',
    decoys: ['Raincoat', 'Tent', 'Sunshade'],
  },
  {
    id: 'obj_skateboard',
    category: 'objects',
    word: 'Skateboard',
    hint: 'A short wooden board with four polyurethane wheels for tricks.',
    decoys: ['Rollerblades', 'Scooter', 'Surfboard'],
  },
  {
    id: 'obj_sunglasses',
    category: 'objects',
    word: 'Sunglasses',
    hint: 'Tinted eyewear that shields your eyes from bright glare and UV rays.',
    decoys: ['Goggles', 'Binoculars', 'Reading Glasses'],
  },
  {
    id: 'obj_guitar',
    category: 'objects',
    word: 'Electric Guitar',
    hint: 'A stringed musical instrument plugged into an amplifier to rock out.',
    decoys: ['Bass Guitar', 'Violin', 'Keyboard'],
  },
  {
    id: 'obj_drone',
    category: 'objects',
    word: 'Camera Drone',
    hint: 'A remote-controlled multi-rotor flying craft capturing aerial footage.',
    decoys: ['RC Helicopter', 'GoPro', 'Satellite'],
  },
  {
    id: 'obj_smartwatch',
    category: 'objects',
    word: 'Smartwatch',
    hint: 'A wrist wearable tracking your heart rate, steps, and notifications.',
    decoys: ['Fitness Tracker', 'Compass', 'Stopwatch'],
  },
  {
    id: 'obj_headphone',
    category: 'objects',
    word: 'Noise-Canceling Headphones',
    hint: 'Over-ear audio cups that block out external world chatter.',
    decoys: ['Earbuds', 'Microphone', 'Speaker'],
  },

  // ==========================================
  // Food & Cuisine
  // ==========================================
  {
    id: 'food_pizza',
    category: 'food',
    word: 'Pepperoni Pizza',
    hint: 'A beloved baked dough circle covered in melted cheese and savory toppings.',
    decoys: ['Calzone', 'Lasagna', 'Flatbread'],
  },
  {
    id: 'food_sushi',
    category: 'food',
    word: 'Sushi Roll',
    hint: 'A Japanese delicacy featuring seasoned vinegared rice and fresh seafood.',
    decoys: ['Sashimi', 'Poke Bowl', 'Ramen'],
  },
  {
    id: 'food_tacos',
    category: 'food',
    word: 'Street Tacos',
    hint: 'Folded corn tortillas loaded with grilled meats, cilantro, and salsa.',
    decoys: ['Burrito', 'Quesadilla', 'Nachos'],
  },
  {
    id: 'food_fondue',
    category: 'food',
    word: 'Chocolate Fountain',
    hint: 'A cascading tower of molten sweet treat for dipping fruits and marshmallows.',
    decoys: ['Cheese Fondue', 'Ice Cream Sundae', 'Crepe Station'],
  },
  {
    id: 'food_burger',
    category: 'food',
    word: 'Gourmet Cheeseburger',
    hint: 'A juicy grilled patty nestled inside a toasted bun with melted cheese.',
    decoys: ['Hot Dog', 'Chicken Sandwich', 'Sliders'],
  },
  {
    id: 'food_cotton_candy',
    category: 'food',
    word: 'Cotton Candy',
    hint: 'Spun sugar clouds served on a stick at fairs and carnivals.',
    decoys: ['Lollipop', 'Caramel Popcorn', 'Churros'],
  },

  // ==========================================
  // Pop Culture & Themes
  // ==========================================
  {
    id: 'pop_jurassic',
    category: 'pop_culture',
    word: 'Jurassic Park',
    hint: 'A disaster theme park where extinct prehistoric monsters break free.',
    decoys: ['King Kong Island', 'Godzilla Metropolis', 'Avatar Pandora'],
  },
  {
    id: 'pop_hogwarts',
    category: 'pop_culture',
    word: 'Hogwarts Wizard School',
    hint: 'A magical Scottish castle with moving staircases, wands, and houses.',
    decoys: ['Narnia', 'Middle-earth', 'Neverland'],
  },
  {
    id: 'pop_batcave',
    category: 'pop_culture',
    word: 'The Batcave',
    hint: 'A subterranean lair filled with supercomputers, vehicles, and dark tech.',
    decoys: ['Avengers Tower', 'Fortress of Solitude', 'Stark Workshop'],
  },
  {
    id: 'pop_lightsaber',
    category: 'pop_culture',
    word: 'Jedi Lightsaber',
    hint: 'An elegant glowing plasma weapon wielded in a galaxy far, far away.',
    decoys: ['Magic Wand', 'Laser Blaster', 'Infinity Gauntlet'],
  },
  {
    id: 'pop_zombie',
    category: 'pop_culture',
    word: 'Zombie Apocalypse',
    hint: 'A worldwide outbreak where survivors barricade against the undead.',
    decoys: ['Alien Invasion', 'Nuclear Fallout', 'Robot Uprising'],
  },

  // ==========================================
  // Animals & Creatures
  // ==========================================
  {
    id: 'anim_penguin',
    category: 'animals',
    word: 'Emperor Penguin',
    hint: 'A flightless bird waddling in tuxedo colors across Antarctic ice.',
    decoys: ['Puffin', 'Albatross', 'Seal'],
  },
  {
    id: 'anim_chameleon',
    category: 'animals',
    word: 'Chameleon',
    hint: 'A stealthy reptile famous for changing colors and 360-degree eyes.',
    decoys: ['Gecko', 'Iguana', 'Komodo Dragon'],
  },
  {
    id: 'anim_octopus',
    category: 'animals',
    word: 'Giant Octopus',
    hint: 'A super-intelligent sea creature with eight tentacles and ink defense.',
    decoys: ['Squid', 'Jellyfish', 'Cuttlefish'],
  },
  {
    id: 'anim_dragon',
    category: 'animals',
    word: 'Fire-Breathing Dragon',
    hint: 'A mythical winged serpent perched upon hoards of gold.',
    decoys: ['Phoenix', 'Griffin', 'Hydra'],
  },
];

/**
 * Filter word pool based on category selection.
 */
export function getWordPool(
  category: ImpostorCategory,
  customWords?: SecretWordItem[]
): SecretWordItem[] {
  let pool = [...SECRET_WORD_POOL];

  if (category !== 'all') {
    pool = pool.filter((w) => w.category === category);
  }

  if (customWords && customWords.length > 0) {
    if (category === 'all') {
      pool = [...customWords, ...pool];
    } else {
      pool = [...customWords.filter((w) => w.category === category), ...pool];
    }
  }

  return pool;
}
