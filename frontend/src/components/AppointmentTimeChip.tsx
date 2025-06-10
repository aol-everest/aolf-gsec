import { Chip } from "@mui/material";
import { formatTime } from "../utils/dateUtils";
import { Appointment } from "../models/types";

export const AppointmentTimeChip = ({ appointment, includeDuration }: { appointment: Appointment, includeDuration: boolean }) => {
    return (
        <Chip
            label={includeDuration ? `${formatTime(appointment.appointment_time)} • ${appointment.duration} mins` : formatTime(appointment.appointment_time)}
            sx={{ fontSize: '0.9rem', fontWeight: 'bold' }}
        />
    );
};