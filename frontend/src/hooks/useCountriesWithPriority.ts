import { useMemo } from 'react';

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
 * Custom hook to sort countries with priority countries (US, Canada) at the top
 * @param countries - Array of countries from API
 * @param priorityCountries - Array of ISO2 codes to prioritize (default: ['US', 'CA'])
 * @returns Sorted array with priority countries first, then others alphabetically
 */
export const useCountriesWithPriority = (
  countries: Country[], 
  priorityCountries: string[] = ['US', 'CA']
) => {
  return useMemo(() => {
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
  }, [countries, priorityCountries]);
};

export default useCountriesWithPriority; 