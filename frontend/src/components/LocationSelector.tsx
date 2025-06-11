import React from 'react';
import {
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Chip,
} from '@mui/material';
import { Controller, Control, useWatch } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../hooks/useApi';
import { Location, MeetingPlace } from '../models/types';

interface ValidationErrors {
  location_id?: string;
  meeting_place_id?: string;
}

interface LocationSelectorProps {
  control: Control<any>;
  validationErrors: ValidationErrors;
  locations: Location[];
  showMeetingPlace?: boolean;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  control,
  validationErrors,
  locations,
  showMeetingPlace = true,
}) => {
  const api = useApi();
  
  // Watch the selected location ID to fetch meeting places
  const watchLocationId = useWatch({
    control,
    name: 'location_id',
  });

  // Fetch meeting places for the selected location
  const { data: meetingPlaces = [], isLoading: isLoadingMeetingPlaces } = useQuery<MeetingPlace[]>({
    queryKey: ['meeting-places', watchLocationId],
    queryFn: async () => {
      if (!watchLocationId) return [];
      const { data } = await api.get<MeetingPlace[]>(`/admin/locations/${watchLocationId}/meeting-places`);
      return data;
    },
    enabled: !!watchLocationId,
  });

  return (
    <>
      {/* Location */}
      <Grid item xs={12} md={6} lg={4}>
        <Controller
          name="location_id"
          control={control}
          defaultValue={null}
          render={({ field }) => (
            <FormControl fullWidth error={!!validationErrors.location_id}>
              <InputLabel>Location</InputLabel>
              <Select
                {...field}
                value={field.value || ''}
                label="Location"
                onChange={(e) => {
                  const value = e.target.value === '' ? null : e.target.value;
                  field.onChange(value);
                }}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {locations.map((location) => (
                  <MenuItem key={location.id} value={location.id}>
                    {`${location.name} - ${location.city}, ${location.state}, ${location.country}`}
                  </MenuItem>
                ))}
              </Select>
              {validationErrors.location_id && (
                <FormHelperText error>{validationErrors.location_id}</FormHelperText>
              )}
            </FormControl>
          )}
        />
      </Grid>

      {/* Meeting Place - Show only when showMeetingPlace is true */}
      {showMeetingPlace && (
        <Grid item xs={12} md={6} lg={4}>
          <Controller
            name="meeting_place_id"
            control={control}
            defaultValue={null}
            render={({ field }) => (
              <FormControl fullWidth error={!!validationErrors.meeting_place_id}>
                <InputLabel>Meeting Place</InputLabel>
                <Select
                  {...field}
                  value={field.value || ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? null : e.target.value;
                    field.onChange(value);
                  }}
                  label="Meeting Place"
                  disabled={!watchLocationId || isLoadingMeetingPlaces}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {meetingPlaces.map((meetingPlace) => (
                    <MenuItem key={meetingPlace.id} value={meetingPlace.id}>
                      {meetingPlace.name}
                      {meetingPlace.is_default && (
                        <Chip
                          label="Default"
                          size="small"
                          color="primary"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </MenuItem>
                  ))}
                </Select>
                {isLoadingMeetingPlaces && watchLocationId && (
                  <FormHelperText>Loading meeting places...</FormHelperText>
                )}
                {!isLoadingMeetingPlaces && watchLocationId && meetingPlaces.length === 0 && (
                  <FormHelperText>No meeting places available for this location</FormHelperText>
                )}
                {!watchLocationId && (
                  <FormHelperText>Select a location first</FormHelperText>
                )}
                {validationErrors.meeting_place_id && (
                  <FormHelperText error>{validationErrors.meeting_place_id}</FormHelperText>
                )}
              </FormControl>
            )}
          />
        </Grid>
      )}
    </>
  );
};

export default LocationSelector; 