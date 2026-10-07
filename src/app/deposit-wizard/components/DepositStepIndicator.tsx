import React from 'react';
import { Check } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: number;
  steps: string[];
}

export default function DepositStepIndicator({ currentStep, steps }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((label, i) => {
        const step = i + 1;
        const isDone = step < currentStep;
        const isActive = step === currentStep;
        return (
          <React.Fragment key={`step-${step}`}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 ${
                  isDone
                    ? 'bg-accent text-white'
                    : isActive
                    ? 'bg-primary text-white ring-4 ring-primary/20' :'bg-secondary text-muted-foreground border border-border'
                }`}
              >
                {isDone ? <Check size={14} /> : step}
              </div>
              <span className={`text-xs font-medium whitespace-nowrap ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mb-5 transition-all duration-300 ${isDone ? 'bg-accent' : 'bg-border'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}