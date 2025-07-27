import React from 'react'

interface AllCourtsLogoProps {
  size?: number
  backgroundColor?: string
  courtColor?: string
  className?: string
}

export default function AllCourtsLogo({ 
  size = 60, 
  backgroundColor = '#00A86B',
  courtColor = 'white',
  className 
}: AllCourtsLogoProps) {
  return (
    <svg 
      viewBox="0 0 120 120" 
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      className={className}
    >
      {/* Фон с закругленными углами */}
      <rect x="0" y="0" width="120" height="120" rx="24" fill={backgroundColor}/>
      {/* Корт */}
      <rect x="20" y="20" width="80" height="80" rx="8" fill="none" stroke={courtColor} strokeWidth="3"/>
      {/* Центральная линия */}
      <line x1="20" y1="60" x2="100" y2="60" stroke={courtColor} strokeWidth="3"/>
      {/* Вертикальная линия */}
      <line x1="60" y1="20" x2="60" y2="100" stroke={courtColor} strokeWidth="3"/>
    </svg>
  )
}

// Цветовая схема
export const AllCourtsColors = {
  primary: '#00A86B',        // Зеленый
  primaryDark: '#007A4D',    // Темно-зеленый
  primaryLight: '#33C18A',   // Светло-зеленый
  tennis: '#00A86B',         // Зеленый
  padel: '#2E86AB',          // Синий
  badminton: '#FF6B6B',      // Красный
}