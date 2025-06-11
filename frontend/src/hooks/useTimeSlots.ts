import { useState, useCallback } from 'react';
import { useApi } from './useApi';
import { useSnackbar } from 'notistack';
import { AppointmentTimeSlotDetailsMap } from '../models/types';
import { addDays, subDays, format } from 'date-fns';

interface UseTimeSlotsReturn {
  timeSlotDetailsMap: AppointmentTimeSlotDetailsMap | null;
  isLoadingTimeSlots: boolean;
  fetchTimeSlotData: (date?: string, locationId?: number) => Promise<void>;
  checkTimeSlotAvailability: (
    date: string,
    time: string,
    currentAppointmentId?: number
  ) => { isAvailable: boolean; appointments: number };
  getTimeSlotOccupancy: (
    date: string,
    timeSlot: string,
    duration?: number,
    currentAppointmentId?: number
  ) => { appointment_count: number; people_count: number };
}

export const useTimeSlots = (): UseTimeSlotsReturn => {
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();
  const [timeSlotDetailsMap, setTimeSlotDetailsMap] = useState<AppointmentTimeSlotDetailsMap | null>(null);
  const [isLoadingTimeSlots, setIsLoadingTimeSlots] = useState(false);

  const fetchTimeSlotData = useCallback(async (dateStr?: string, locationId?: number) => {
    try {
      setIsLoadingTimeSlots(true);
      
      const selectedDate = dateStr || format(new Date(), 'yyyy-MM-dd');
      const startDate = format(subDays(new Date(selectedDate), 15), 'yyyy-MM-dd');
      const endDate = format(addDays(new Date(selectedDate), 45), 'yyyy-MM-dd');
      
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate
      });
      
      // NOTE: We are not filtering by location here because we want to show all time slots for the selected date
      // Add location filter if needed in the future
      // if (locationId) {
      //   params.append('location_id', locationId.toString());
      // }
      
      const { data: combinedData } = await api.get<AppointmentTimeSlotDetailsMap>(
        `/admin/stats/appointments/detailed?${params.toString()}`
      );
      
      setTimeSlotDetailsMap(combinedData);
      
    } catch (error) {
      console.error('Error fetching time slot data:', error);
      enqueueSnackbar('Failed to load time slot availability data', { variant: 'error' });
    } finally {
      setIsLoadingTimeSlots(false);
    }
  }, [api, enqueueSnackbar]);

  const checkTimeSlotAvailability = useCallback((
    date: string,
    time: string,
    currentAppointmentId?: number
  ): { isAvailable: boolean; appointments: number } => {
    if (!timeSlotDetailsMap || !timeSlotDetailsMap.dates || !timeSlotDetailsMap.dates[date]) {
      return { isAvailable: true, appointments: 0 };
    }

    const dateData = timeSlotDetailsMap.dates[date];
    if (!dateData.time_slots || !dateData.time_slots[time]) {
      return { isAvailable: true, appointments: 0 };
    }

    const timeSlotData = dateData.time_slots[time];
    
    const appointmentIds = Object.keys(timeSlotData).map(id => parseInt(id, 10));
    const filteredAppointments = currentAppointmentId 
      ? appointmentIds.filter(id => id !== currentAppointmentId)
      : appointmentIds;
    
    return { isAvailable: filteredAppointments.length === 0, appointments: filteredAppointments.length };
  }, [timeSlotDetailsMap]);

  const getTimeSlotOccupancy = useCallback((
    date: string,
    timeSlot: string,
    duration: number = 15,
    currentAppointmentId?: number
  ): { appointment_count: number; people_count: number } => {
    const defaultData = { appointment_count: 0, people_count: 0 };
    
    if (!timeSlotDetailsMap || !timeSlotDetailsMap.dates[date]) {
      return defaultData;
    }
    
    const dateData = timeSlotDetailsMap.dates[date];
    
    // Calculate overlapping time slots
    const overlappingSlots = new Set<string>();
    const [startHour, startMinute] = timeSlot.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = startMinutes + duration;
    
    // Check all 15-minute slots that fall within our duration
    for (let minute = startMinutes; minute < endMinutes; minute += 15) {
      const slotHour = Math.floor(minute / 60);
      const slotMinute = minute % 60;
      const slot = `${slotHour.toString().padStart(2, '0')}:${slotMinute.toString().padStart(2, '0')}`;
      if (dateData.time_slots[slot]) {
        overlappingSlots.add(slot);
      }
    }
    
    // Count unique appointments and people across all overlapping slots
    const appointmentIds = new Set<number>();
    let totalPeopleCount = 0;
    const seenAppointments = new Set<number>();

    overlappingSlots.forEach(slot => {
      const timeSlotData = dateData.time_slots[slot];
      Object.entries(timeSlotData).forEach(([appointmentId, count]) => {
        const id = parseInt(appointmentId, 10);
        if (currentAppointmentId && id === currentAppointmentId) {
          return;
        }
        appointmentIds.add(id);
        if (!seenAppointments.has(id)) {
          totalPeopleCount += count;
          seenAppointments.add(id);
        }
      });
    });
    
    return {
      appointment_count: appointmentIds.size,
      people_count: totalPeopleCount
    };
  }, [timeSlotDetailsMap]);

  return {
    timeSlotDetailsMap,
    isLoadingTimeSlots,
    fetchTimeSlotData,
    checkTimeSlotAvailability,
    getTimeSlotOccupancy,
  };
};

export default useTimeSlots; 