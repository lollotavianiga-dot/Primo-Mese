import React from 'react';
import styled from 'styled-components';

interface LogoProps {
  size?: number;
  className?: string;
  fill?: boolean;
}

// Styled SVG component
const StyledSvg = styled.svg`
  /* Inherit color from parent or className by default */
  color: currentColor;
`;

// Styled path for optional fill effect
const FilledPath = styled.path<{ $filled: boolean }>`
  stroke: currentColor;
  stroke-width: 2;
  
  ${props => props.$filled && `
    fill: currentColor;
    opacity: 0.2;
  `}
  
  ${props => !props.$filled && `
    fill: none;
  `}
`;

export const Logo: React.FC<LogoProps> = ({ size = 24, className = "text-blue-500", fill = false }) => {
  return (
    <StyledSvg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
    >
      <FilledPath 
        d="M6 3H18C19.6569 3 21 4.34315 21 6V18C21 19.6569 19.6569 21 18 21H6C4.34315 21 3 19.6569 3 18V6C3 4.34315 4.34315 3 6 3Z" 
        $filled={fill}
      />
      <path 
        d="M10 8L15 12L10 16" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
    </StyledSvg>
  );
};

export default Logo;