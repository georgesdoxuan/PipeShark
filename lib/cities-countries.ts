/**
 * City lists aligned with n8n webhook (by population size).
 * Used for "Random City Draw" in the campaign form.
 */
export interface CityCountry {
  city: string;
  country: string;
}

// Helper: wrap city names with country for a given country code
function withCountry(cities: string[], country: string): CityCountry[] {
  return cities.map((city) => ({ city, country }));
}

// 1M+ (same order as n8n)
const cities1MPlus: CityCountry[] = [
  ...withCountry(['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose'], 'USA'),
  ...withCountry(['Toronto', 'Montreal', 'Vancouver'], 'Canada'),
  ...withCountry(['London', 'Birmingham'], 'UK'),
  ...withCountry(['Sydney', 'Melbourne'], 'Australia'),
];

// 500K–1M
const cities500K_1M: CityCountry[] = [
  ...withCountry(['Austin', 'Jacksonville', 'Fort Worth', 'Columbus', 'San Francisco', 'Charlotte', 'Indianapolis', 'Seattle', 'Denver', 'Washington', 'Boston', 'Nashville'], 'USA'),
  ...withCountry(['Calgary', 'Edmonton'], 'Canada'),
  ...withCountry(['Manchester', 'Glasgow'], 'UK'),
  ...withCountry(['Brisbane', 'Perth', 'Adelaide'], 'Australia'),
  ...withCountry(['Auckland'], 'New Zealand'),
];

// 250K–500K
const cities250K_500K: CityCountry[] = [
  ...withCountry(['Detroit', 'Portland', 'Memphis', 'Oklahoma City', 'Las Vegas', 'Louisville', 'Baltimore', 'Milwaukee', 'Albuquerque', 'Tucson', 'Fresno', 'Sacramento', 'Kansas City', 'Mesa', 'Atlanta', 'Miami', 'Cleveland', 'Virginia Beach', 'Omaha', 'Oakland'], 'USA'),
  ...withCountry(['Ottawa', 'Winnipeg', 'Quebec City', 'Hamilton', 'Kitchener'], 'Canada'),
  ...withCountry(['Leeds', 'Sheffield', 'Bradford', 'Liverpool', 'Edinburgh', 'Bristol', 'Leicester', 'Coventry'], 'UK'),
  ...withCountry(['Dublin'], 'Ireland'),
  ...withCountry(['Gold Coast', 'Newcastle'], 'Australia'),
  ...withCountry(['Wellington', 'Christchurch'], 'New Zealand'),
];

// 100K–250K (USA, Canada, UK, Ireland, Australia, NZ – same names as n8n)
const cities100K_250K: CityCountry[] = [
  ...withCountry(['Raleigh', 'Long Beach', 'Colorado Springs', 'Arlington', 'Tampa', 'Anaheim', 'Bakersfield', 'Aurora', 'Honolulu', 'Santa Ana', 'Riverside', 'Corpus Christi', 'Lexington', 'Stockton', 'St. Paul', 'Cincinnati', 'Pittsburgh', 'Anchorage', 'Henderson', 'Greensboro', 'Plano', 'Newark', 'Lincoln', 'Toledo', 'Orlando', 'Chula Vista', 'Irvine', 'Fort Wayne', 'Jersey City', 'Durham', 'St. Petersburg', 'Laredo', 'Buffalo', 'Madison', 'Lubbock', 'Chandler', 'Scottsdale', 'Glendale', 'Reno', 'Norfolk', 'Winston-Salem', 'North Las Vegas', 'Irving', 'Chesapeake', 'Gilbert', 'Hialeah', 'Garland', 'Fremont', 'Baton Rouge', 'Richmond'], 'USA'),
  ...withCountry(['London', 'Victoria', 'Windsor', 'Saskatoon', 'Regina', 'Sherbrooke', 'Barrie', 'Kelowna', 'Abbotsford', 'Kingston'], 'Canada'),
  ...withCountry(['Nottingham', 'Newcastle', 'Belfast', 'Brighton', 'Hull', 'Plymouth', 'Stoke', 'Wolverhampton', 'Derby', 'Southampton', 'Portsmouth', 'York', 'Peterborough', 'Aberdeen', 'Dundee', 'Swansea', 'Cardiff', 'Cambridge', 'Bournemouth', 'Swindon'], 'UK'),
  ...withCountry(['Cork', 'Limerick'], 'Ireland'),
  ...withCountry(['Canberra', 'Sunshine Coast', 'Wollongong', 'Geelong', 'Hobart', 'Townsville', 'Cairns', 'Darwin', 'Toowoomba', 'Ballarat', 'Bendigo', 'Albury', 'Launceston', 'Mackay', 'Rockhampton'], 'Australia'),
  ...withCountry(['Hamilton', 'Tauranga', 'Dunedin', 'Palmerston North', 'Napier'], 'New Zealand'),
];

// 50K–100K (same names as n8n)
const cities50K_100K: CityCountry[] = [
  ...withCountry(['Des Moines', 'Grand Rapids', 'Salt Lake City', 'Tallahassee', 'Worcester', 'Grand Prairie', 'Brownsville', 'Huntsville', 'Mobile', 'Shreveport', 'Knoxville', 'Providence', 'Newport News', 'Chattanooga', 'Tempe', 'Fort Lauderdale', 'Cary', 'Eugene', 'Springfield', 'Pembroke Pines', 'Salem', 'Santa Rosa', 'Rancho Cucamonga', 'Oceanside', 'Garden Grove', 'Fort Collins', 'Ontario', 'Lancaster', 'Elk Grove', 'Corona', 'Palmdale', 'Salinas', 'Pomona', 'Hayward', 'Escondido', 'Rockford', 'Alexandria', 'Kansas City', 'Joliet', 'Sunnyvale', 'Torrance', 'Bridgeport', 'Lakewood', 'Hollywood', 'Paterson', 'Syracuse', 'Naperville', 'Mesquite', 'Dayton', 'Savannah', 'Clarksville', 'Orange', 'Pasadena', 'Fullerton', 'Killeen', 'Frisco', 'Hampton', 'McAllen', 'Warren', 'Bellevue', 'West Valley City', 'Columbia', 'Olathe', 'Sterling Heights', 'New Haven', 'Miramar', 'Waco', 'Thousand Oaks', 'Cedar Rapids', 'Charleston', 'Visalia', 'Topeka', 'Elizabeth', 'Gainesville', 'Thornton', 'Roseville', 'Carrollton', 'Coral Springs', 'Stamford', 'Simi Valley'], 'USA'),
  ...withCountry(['Guelph', 'Sudbury', 'Thunder Bay', 'Moncton', 'Saint John', 'Red Deer', 'Lethbridge', 'Kamloops', 'Nanaimo', 'Fredericton', 'Chilliwack', 'Brantford', 'Prince George', 'Sarnia', 'Peterborough'], 'Canada'),
  ...withCountry(['Oxford', 'Northampton', 'Luton', 'Reading', 'Bolton', 'Preston', 'Milton Keynes', 'Sunderland', 'Norwich', 'Middlesbrough', 'Blackpool', 'Ipswich', 'Huddersfield', 'Gloucester', 'Slough', 'Telford', 'Exeter', 'Cheltenham', 'Basildon', 'Colchester', 'Crawley', 'Gillingham', 'Solihull', 'Bath', 'Warrington'], 'UK'),
  ...withCountry(['Galway', 'Waterford', 'Drogheda'], 'Ireland'),
  ...withCountry(['Gold Coast-Tweed Heads', 'Bunbury', 'Bundaberg', 'Hervey Bay', 'Wagga Wagga', 'Mildura', 'Shepparton', 'Port Macquarie', 'Tamworth', 'Orange', 'Dubbo', 'Geraldton', 'Nowra', 'Bathurst', 'Gladstone', 'Lismore', 'Warrnambool', 'Kalgoorlie', 'Albany', 'Devonport'], 'Australia'),
  ...withCountry(['New Plymouth', 'Rotorua', 'Whangarei', 'Nelson', 'Invercargill', 'Whanganui', 'Gisborne', 'Blenheim'], 'New Zealand'),
];

const all1MPlus = cities1MPlus;
const all500KPlus: CityCountry[] = [...cities1MPlus, ...cities500K_1M];
const all250KPlus: CityCountry[] = [...cities1MPlus, ...cities500K_1M, ...cities250K_500K];
const all100KPlus: CityCountry[] = [...cities1MPlus, ...cities500K_1M, ...cities250K_500K, ...cities100K_250K];
const allCities: CityCountry[] = [...cities1MPlus, ...cities500K_1M, ...cities250K_500K, ...cities100K_250K, ...cities50K_100K];

/**
 * Returns the list of cities (with country) for the given citySize.
 * Matches n8n webhook logic.
 */
export function getCitiesBySize(citySize: string): CityCountry[] {
  switch (citySize) {
    case '1M+':
      return all1MPlus;
    case '500K-1M':
      return cities500K_1M;
    case '500K+':
      return all500KPlus;
    case '250K-500K':
      return cities250K_500K;
    case '250K+':
      return all250KPlus;
    case '100K-250K':
      return cities100K_250K;
    case '100K+':
      return all100KPlus;
    case '50K-100K':
      return cities50K_100K;
    case 'all':
    default:
      return allCities;
  }
}

/**
 * Draws a random city (and country) from the list for the given citySize.
 * Use this in the form when "Draw a city and a country" is clicked.
 */
export function drawRandomCityCountry(citySize: string): CityCountry {
  const list = getCitiesBySize(citySize);
  const index = Math.floor(Math.random() * list.length);
  return list[index];
}
