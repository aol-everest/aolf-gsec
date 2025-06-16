import React from 'react';
import { Box } from '@mui/material';
import PrimaryButton from '../PrimaryButton';
import SecondaryButton from '../SecondaryButton';

interface StepNavigationProps {
  activeStep: number;
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
  onSubmit?: () => void;
  isNextDisabled?: boolean;
  isBackDisabled?: boolean;
  nextButtonText?: string;
  backButtonText?: string;
  isLoading?: boolean;
  hideBack?: boolean;
  customNextButton?: React.ReactNode;
}

export const StepNavigation: React.FC<StepNavigationProps> = ({
  activeStep,
  totalSteps,
  onNext,
  onBack,
  onSubmit,
  isNextDisabled = false,
  isBackDisabled = false,
  nextButtonText,
  backButtonText = 'Back',
  isLoading = false,
  hideBack = false,
  customNextButton
}) => {
  const isLastStep = activeStep === totalSteps - 1;
  const defaultNextText = isLastStep ? 'Submit' : 'Next';
  
  const handleNext = () => {
    if (isLastStep && onSubmit) {
      onSubmit();
    } else {
      onNext();
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, gap: 2 }}>
      {!hideBack && activeStep > 0 && (
        <SecondaryButton 
          onClick={onBack} 
          disabled={isBackDisabled || isLoading}
        >
          {backButtonText}
        </SecondaryButton>
      )}
      
      {customNextButton || (
        <PrimaryButton
          onClick={handleNext}
          disabled={isNextDisabled || isLoading}
        >
          {nextButtonText || defaultNextText}
        </PrimaryButton>
      )}
    </Box>
  );
};

export default StepNavigation; 