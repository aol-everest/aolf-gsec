import React from 'react';
import AppointmentDetail from '../pages/AppointmentDetail';

interface AppointmentDetailDialogProps {
  appointmentId: number | null;
  open: boolean;
  onClose: () => void;
}

const AppointmentDetailDialog: React.FC<AppointmentDetailDialogProps> = ({
  appointmentId,
  open,
  onClose
}) => {
  if (!open || !appointmentId) return null;

  return (
    <AppointmentDetail
      appointmentId={appointmentId}
      isDialog={true}
      onClose={onClose}
    />
  );
};

export default AppointmentDetailDialog; 