
import React from 'react';

export const UKFlagIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 36" {...props}>
    <clipPath id="a">
      <path d="M0 0h60v36H0z"/>
    </clipPath>
    <clipPath id="b">
      <path d="M30 18h30v18H30zm-30 0h30v18H0zM30 0h30v18H30zM0 0h30v18H0z"/>
    </clipPath>
    <g clipPath="url(#a)">
      <path d="M0 0v36h60V0z" fill="#012169"/>
      <path d="m0 0 60 36m0-36L0 36" stroke="#fff" strokeWidth="6"/>
      <path d="m0 0 60 36m0-36L0 36" clipPath="url(#b)" stroke="#C8102E" strokeWidth="4"/>
      <path d="M30 0v36M0 18h60" stroke="#fff" strokeWidth="10"/>
      <path d="M30 0v36M0 18h60" stroke="#C8102E" strokeWidth="6"/>
    </g>
  </svg>
);
