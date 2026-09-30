import React from 'react';
import { HALAGEL_LOGO } from '../../assets/logo';

interface HalagelLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
}

export const HalagelLogo: React.FC<HalagelLogoProps> = ({
  className = '',
  size = 'md',
  showTagline = false,
}) => {
  const sizeClasses = {
    sm: 'h-8 sm:h-9',
    md: 'h-11 sm:h-13',
    lg: 'h-16 sm:h-20',
    xl: 'h-24 sm:h-28',
  };

  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      <img
        src={HALAGEL_LOGO}
        alt="Halagel Logo"
        className={`${sizeClasses[size]} w-auto object-contain drop-shadow-md transition-transform duration-300 hover:scale-[1.02]`}
      />
      {showTagline && (
        <span className="text-[11px] font-bold tracking-widest text-[#588517] uppercase mt-1">
          Halagel (M) Sdn Bhd
        </span>
      )}
    </div>
  );
};
