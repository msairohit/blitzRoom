/**
 * Who Am I? — Persona Database
 * Rich collection of famous personas, fictional characters, superheroes,
 * gaming legends, historical figures, and iconic animals.
 */

import type { PersonaItem, WhoAmICategory } from './types';

export const PERSONA_POOL: PersonaItem[] = [
  // ==========================================
  // Movie Characters & Superheroes
  // ==========================================
  {
    id: 'char_spiderman',
    category: 'characters',
    name: 'Spider-Man',
    tagline: 'Marvel Superhero / Peter Parker',
    hints: [
      'Gained superhuman abilities from an accidental scientific encounter.',
      'Known for quick witty humor and balancing high school/college life.',
      'Shoots webs, climbs walls, and lives by "With great power comes great responsibility".',
    ],
    icon: 'spider',
    decoys: ['Batman', 'Iron Man', 'Deadpool'],
  },
  {
    id: 'char_batman',
    category: 'characters',
    name: 'Batman',
    tagline: 'The Dark Knight / Bruce Wayne',
    hints: [
      'Has no actual supernatural powers, relying on extreme training and wealth.',
      'Operates mostly at night from a secret subterranean cavern.',
      'A billionaire vigilante protecting Gotham City with a bat-themed suit and gadgets.',
    ],
    icon: 'bat',
    decoys: ['Spider-Man', 'Iron Man', 'Wolverine'],
  },
  {
    id: 'char_harry_potter',
    category: 'characters',
    name: 'Harry Potter',
    tagline: 'The Boy Who Lived / Wizard',
    hints: [
      'Discovered a hidden magical heritage on his 11th birthday.',
      'Attends an ancient boarding school with four rival student houses.',
      'Has round spectacles, a lightning-bolt forehead scar, and a wand.',
    ],
    icon: 'wizard-hat',
    decoys: ['Percy Jackson', 'Frodo Baggins', 'Luke Skywalker'],
  },
  {
    id: 'char_darth_vader',
    category: 'characters',
    name: 'Darth Vader',
    tagline: 'Sith Lord / Star Wars',
    hints: [
      'Fell from a heroic order to become an enforcer of an evil galactic empire.',
      'Breathes with a distinct mechanical rasp inside full cybernetic armor.',
      'Wields a crimson red lightsaber and delivered the iconic line "I am your father".',
    ],
    icon: 'sword-cross',
    decoys: ['Kylo Ren', 'Voldemort', 'Thanos'],
  },
  {
    id: 'char_elsa',
    category: 'characters',
    name: 'Elsa',
    tagline: 'Snow Queen of Arendelle / Frozen',
    hints: [
      'Struggled for years to suppress magical powers she feared would harm others.',
      'Has a younger sister named Anna and a talking snowman companion.',
      'Built an entire glowing ice palace and sang the anthem "Let It Go".',
    ],
    icon: 'snowflake',
    decoys: ['Cinderella', 'Rapunzel', 'Moana'],
  },
  {
    id: 'char_sherlock',
    category: 'characters',
    name: 'Sherlock Holmes',
    tagline: 'World’s Greatest Consulting Detective',
    hints: [
      'Resides at 221B Baker Street in Victorian London.',
      'Accompanied by faithful chronicler Dr. John Watson.',
      'Famous for smoking a pipe, using deductive reasoning, and saying "Elementary".',
    ],
    icon: 'magnify',
    decoys: ['Hercule Poirot', 'James Bond', 'Batman'],
  },
  {
    id: 'char_iron_man',
    category: 'characters',
    name: 'Iron Man',
    tagline: 'Billionaire Genius / Tony Stark',
    hints: [
      'Genius inventor whose life changed after being trapped in a cave.',
      'Powered originally by a glowing arc reactor chest piece.',
      'Flies around in a red and gold powered armor suit.',
    ],
    icon: 'robot-outline',
    decoys: ['Captain America', 'Thor', 'Black Panther'],
  },

  // ==========================================
  // Celebrities & Stars
  // ==========================================
  {
    id: 'celeb_taylor_swift',
    category: 'celebrities',
    name: 'Taylor Swift',
    tagline: 'Global Pop & Country Superstar',
    hints: [
      'Started music career as a country prodigy with an acoustic guitar in Nashville.',
      'Has passionate fans known globally as "Swifties".',
      'Created the record-shattering worldwide "Eras Tour".',
    ],
    icon: 'music-clef-treble',
    decoys: ['Beyoncé', 'Ariana Grande', 'Billie Eilish'],
  },
  {
    id: 'celeb_messi',
    category: 'celebrities',
    name: 'Lionel Messi',
    tagline: 'Football Legend / 8-Time Ballon d’Or Winner',
    hints: [
      'Known affectionately as "La Pulga" due to his agile low center of gravity.',
      'Spent the prime of his club career breaking every scoring record at FC Barcelona.',
      'Captained Argentina to win the dramatic 2022 FIFA World Cup.',
    ],
    icon: 'soccer',
    decoys: ['Cristiano Ronaldo', 'Neymar Jr', 'Kylian Mbappé'],
  },
  {
    id: 'celeb_ronaldo',
    category: 'celebrities',
    name: 'Cristiano Ronaldo',
    tagline: 'Football Superstar / CR7',
    hints: [
      'Portuguese athletic icon known for legendary physical fitness and header jumps.',
      'Starred for Manchester United, Real Madrid, Juventus and Al-Nassr.',
      'Famous worldwide for his jumping "SIUUUU!" goal celebration.',
    ],
    icon: 'soccer',
    decoys: ['Lionel Messi', 'Zlatan Ibrahimović', 'David Beckham'],
  },
  {
    id: 'celeb_elon_musk',
    category: 'celebrities',
    name: 'Elon Musk',
    tagline: 'Tech Billionaire / SpaceX & Tesla CEO',
    hints: [
      'South African born entrepreneur deeply obsessed with Mars colonization.',
      'Commands electric vehicle maker Tesla and acquired social network X (Twitter).',
      'Founder and chief engineer of private spaceflight company SpaceX.',
    ],
    icon: 'rocket-launch',
    decoys: ['Jeff Bezos', 'Mark Zuckerberg', 'Bill Gates'],
  },
  {
    id: 'celeb_the_rock',
    category: 'celebrities',
    name: 'Dwayne "The Rock" Johnson',
    tagline: 'WWE Champion & Hollywood Action Star',
    hints: [
      'Rose to stardom in professional wrestling with catchphrases like "Can you smell what...".',
      'Famous for his signature arched eyebrow and massive workout regime.',
      'Starred in Jumanji, Moana (as Maui), and the Fast & Furious franchise.',
    ],
    icon: 'dumbbell',
    decoys: ['John Cena', 'Arnold Schwarzenegger', 'Vin Diesel'],
  },
  {
    id: 'celeb_beyonce',
    category: 'celebrities',
    name: 'Beyoncé',
    tagline: 'Queen Bey / Cultural Icon',
    hints: [
      'First gained fame as the lead singer of girl group Destiny’s Child.',
      'One of the most Grammy-awarded musical artists in recording history.',
      'Creator of albums like Lemonade, Renaissance, and Cowboy Carter.',
    ],
    icon: 'crown',
    decoys: ['Rihanna', 'Lady Gaga', 'Nicki Minaj'],
  },

  // ==========================================
  // Gaming & Anime Icons
  // ==========================================
  {
    id: 'game_pikachu',
    category: 'gaming_anime',
    name: 'Pikachu',
    tagline: 'Electric Mouse Pokémon / Franchise Mascot',
    hints: [
      'Yellow creature with red cheek pouches that store electric charges.',
      'The faithful loyal companion of Pokémon trainer Ash Ketchum.',
      'Speaks by repeating variations of its own name and attacks with "Thunderbolt".',
    ],
    icon: 'lightning-bolt',
    decoys: ['Sonic', 'Charmander', 'Eevee'],
  },
  {
    id: 'game_mario',
    category: 'gaming_anime',
    name: 'Super Mario',
    tagline: 'Nintendo Italian Plumber Hero',
    hints: [
      'Wears blue overalls, a red shirt, white gloves, and a bushy mustache.',
      'Eats super mushrooms to grow big and jumps on Goombas and Koopas.',
      'Spends his adventures rescuing Princess Peach from the clutches of Bowser.',
    ],
    icon: 'mushroom',
    decoys: ['Luigi', 'Sonic', 'Donkey Kong'],
  },
  {
    id: 'game_sonic',
    category: 'gaming_anime',
    name: 'Sonic the Hedgehog',
    tagline: 'Sega Blue Blur / Supersonic Speed',
    hints: [
      'Bright blue anthropomorphic animal obsessed with chili dogs.',
      'Collects golden spinning rings while dashing through loop-de-loops.',
      'Battles the villainous mustachioed inventor Dr. Ivo "Eggman" Robotnik.',
    ],
    icon: 'run-fast',
    decoys: ['Mario', 'Crash Bandicoot', 'Mega Man'],
  },
  {
    id: 'game_goku',
    category: 'gaming_anime',
    name: 'Son Goku',
    tagline: 'Saiyan Warrior / Dragon Ball Z',
    hints: [
      'Sent to Earth as a baby with a monkey tail and tremendous appetite.',
      'Trained in martial arts under Master Roshi and seeks out 7 orange dragon balls.',
      'Transforms into a Super Saiyan with spiky golden hair and fires "Kamehameha".',
    ],
    icon: 'fire',
    decoys: ['Vegeta', 'Naruto Uzumaki', 'Luffy'],
  },
  {
    id: 'game_naruto',
    category: 'gaming_anime',
    name: 'Naruto Uzumaki',
    tagline: 'Hidden Leaf Ninja / Seventh Hokage',
    hints: [
      'Grew up as a village outcast carrying a nine-tailed beast sealed inside.',
      'Deeply loves ramen from Ichiraku and shouts "Believe it!" / "Dattebayo!".',
      'Masters Shadow Clone Jutsu and the spinning blue sphere Rasengan.',
    ],
    icon: 'ninja',
    decoys: ['Sasuke Uchiha', 'Goku', 'Monkey D. Luffy'],
  },

  // ==========================================
  // Historical Icons
  // ==========================================
  {
    id: 'hist_einstein',
    category: 'historical',
    name: 'Albert Einstein',
    tagline: 'Theoretical Physicist / Theory of Relativity',
    hints: [
      'Famous 20th-century German-born patent clerk turned Nobel Prize winner.',
      'Instantly recognizable by wild white bushy hair and sticking out his tongue.',
      'Formulated the universe’s most famous mass-energy equation: E = mc².',
    ],
    icon: 'atom',
    decoys: ['Isaac Newton', 'Nikola Tesla', 'Stephen Hawking'],
  },
  {
    id: 'hist_cleopatra',
    category: 'historical',
    name: 'Cleopatra',
    tagline: 'Last Active Pharaoh of Ptolemaic Egypt',
    hints: [
      'Legendary ruler who aligned politically and romantically with Julius Caesar and Mark Antony.',
      'Governed Alexandria and Egypt in exquisite royal majesty before Roman conquest.',
      'According to legend, took her own life through the venomous bite of an asp.',
    ],
    icon: 'pyramid',
    decoys: ['Nefertiti', 'Queen Elizabeth I', 'Joan of Arc'],
  },
  {
    id: 'hist_davinci',
    category: 'historical',
    name: 'Leonardo da Vinci',
    tagline: 'Renaissance Polymath & Genius',
    hints: [
      'Mastered anatomy, painting, engineering, and mirror-script notebook sketching.',
      'Designed flying machine concepts centuries before the airplane was invented.',
      'Painted the enigmatic smiling Mona Lisa and The Last Supper.',
    ],
    icon: 'palette',
    decoys: ['Michelangelo', 'Raphael', 'Vincent van Gogh'],
  },
  {
    id: 'hist_shakespeare',
    category: 'historical',
    name: 'William Shakespeare',
    tagline: 'The Bard of Avon / Greatest Playwright',
    hints: [
      'Wrote plays in Stratford-upon-Avon and performed at the Globe Theatre.',
      'Invented hundreds of words and phrases still used in modern English.',
      'Authored Romeo and Juliet, Hamlet ("To be or not to be"), and Macbeth.',
    ],
    icon: 'book-open-page-variant',
    decoys: ['Charles Dickens', 'Mark Twain', 'Homer'],
  },

  // ==========================================
  // Animals & Inventions
  // ==========================================
  {
    id: 'anim_trex',
    category: 'animals_objects',
    name: 'Tyrannosaurus Rex',
    tagline: 'Apex Predator of the Cretaceous Era',
    hints: [
      'A ferocious carnivorous dinosaur that walked on two powerful hind legs.',
      'Possessed bone-crushing jaw bite force but comically tiny two-fingered arms.',
      'The star terror roaring through the rain in Jurassic Park.',
    ],
    icon: 'bone',
    decoys: ['Velociraptor', 'Brachiosaurus', 'Stegosaurus'],
  },
  {
    id: 'obj_smartphone',
    category: 'animals_objects',
    name: 'Smartphone',
    tagline: 'Pocket Supercomputer of the Modern Era',
    hints: [
      'Introduced to mainstream society in the late 2000s with a multitouch glass screen.',
      'Nearly every person carries one everywhere every hour of the day.',
      'Runs apps, takes 4K photos, connects to 5G, and needs constant battery charging.',
    ],
    icon: 'cellphone',
    decoys: ['Laptop', 'Smartwatch', 'Television'],
  },
];

/**
 * Filter persona pool by category.
 */
export function getPersonaPool(
  category: WhoAmICategory,
  customPersonas?: PersonaItem[]
): PersonaItem[] {
  let pool = [...PERSONA_POOL];

  if (category !== 'all') {
    pool = pool.filter((p) => p.category === category);
  }

  if (customPersonas && customPersonas.length > 0) {
    if (category === 'all') {
      pool = [...customPersonas, ...pool];
    } else {
      pool = [...customPersonas.filter((p) => p.category === category), ...pool];
    }
  }

  return pool;
}
