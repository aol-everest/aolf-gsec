interface Country {
  iso2_code: string;
  name: string;
  iso3_code: string;
  region?: string;
  sub_region?: string;
  intermediate_region?: string;
  country_groups?: string[];
  alt_names?: string[];
  is_enabled: boolean;
}

/**
 * Utility function to sort countries with priority countries at the top
 * @param countries - Array of countries to sort
 * @param priorityCountries - Array of ISO2 codes to prioritize (default: ['US', 'CA'])
 * @returns Sorted array with priority countries first, then others alphabetically
 */
export const sortCountriesWithPriority = (
  countries: Country[], 
  priorityCountries: string[] = ['US', 'CA']
): Country[] => {
  if (!countries || countries.length === 0) {
    return [];
  }

  // Separate priority and other countries
  const priority = countries.filter(country => 
    priorityCountries.includes(country.iso2_code)
  );
  
  const others = countries.filter(country => 
    !priorityCountries.includes(country.iso2_code)
  );

  // Sort priority countries in the order specified in priorityCountries array
  const sortedPriority = priority.sort((a, b) => {
    const indexA = priorityCountries.indexOf(a.iso2_code);
    const indexB = priorityCountries.indexOf(b.iso2_code);
    return indexA - indexB;
  });

  // Sort other countries alphabetically
  const sortedOthers = others.sort((a, b) => a.name.localeCompare(b.name));

  return [...sortedPriority, ...sortedOthers];
};

/**
 * Predefined common priority country sets for different regions/use cases
 */
export const COMMON_PRIORITY_SETS = {
  NORTH_AMERICA: ['US', 'CA'],
  NORTH_AMERICA_EXTENDED: ['US', 'CA', 'MX'],
  EU_MAJOR: ['GB', 'DE', 'FR', 'IT', 'ES'],
  ASIA_PACIFIC: ['JP', 'CN', 'IN', 'AU', 'SG'],
  ENGLISH_SPEAKING: ['US', 'GB', 'CA', 'AU', 'NZ']
} as const;

export default sortCountriesWithPriority; 