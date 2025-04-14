import { Chip } from "@mui/material";
import { formatTime } from "../utils/dateUtils";
import { Appointment } from "../models/types";

export const AppointmentTimeChip = ({ appointment }: { appointment: Appointment }) => {
    return (
        <Chip
            label={formatTime(appointment.appointment_time)}
            sx={{ fontSize: '0.9rem', fontWeight: 'bold' }}
        />
    );
};