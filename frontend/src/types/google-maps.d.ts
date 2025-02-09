declare namespace google.maps {
  class places {
    static AutocompleteService: {
      new(): AutocompleteService;
    };
  }

  interface AutocompleteService {
    getPlacePredictions(
      request: AutocompletionRequest,
      callback?: (predictions: AutocompletePrediction[], status: PlacesServiceStatus) => void
    ): Promise<AutocompleteResponse>;
  }

  interface AutocompletePrediction {
    description: string;
    place_id: string;
    structured_formatting: {
      main_text: string;
      secondary_text: string;
    };
    terms: {
      offset: number;
      value: string;
    }[];
    types: string[];
  }

  interface AutocompletionRequest {
    input: string;
    types?: string[];
    componentRestrictions?: {
      country?: string | string[];
    };
  }

  interface AutocompleteResponse {
    predictions: AutocompletePrediction[];
  }

  type PlacesServiceStatus = 'OK' | 'ZERO_RESULTS' | 'OVER_QUERY_LIMIT' | 'REQUEST_DENIED' | 'INVALID_REQUEST';
} 