/**
 * Knowledge Base Button Component
 * 
 * A button that opens the Cloud Knowledge Base panel.
 * Shows stats about imported providers and servers.
 */

import React, { useState, useEffect } from 'react'

interface KBButtonProps {
  onClick: () => void
  providerCount?: number
  serverCount?: number
  isActive?: boolean
}

export const KBButton: React.FC<KBButtonProps> = ({
  onClick,
  providerCount = 0,
  serverCount = 0,
  isActive = false,
}) => {
  const [isHovered, setIsHovered] = useState(false)
  
  const hasData = providerCount > 0 || serverCount > 0
  
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={hasData 
        ? `Knowledge Base: ${providerCount} providers, ${serverCount} servers` 
        : 'Knowledge Base - Import your infrastructure docs'
      }
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        background: isActive 
          ? 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)'
          : isHovered 
            ? 'rgba(236, 72, 153, 0.2)' 
            : 'rgba(255, 255, 255, 0.1)',
        border: isActive 
          ? '2px solid #ec4899' 
          : '2px solid transparent',
        borderRadius: '12px',
        color: '#fff',
        fontSize: '14px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        position: 'relative',
      }}
    >
      {/* Icon */}
      <span style={{ fontSize: '18px' }}>📚</span>
      
      {/* Label */}
      <span>KB</span>
      
      {/* Badge showing count */}
      {hasData && (
        <span
          style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            background: '#22c55e',
            color: '#fff',
            fontSize: '10px',
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: '10px',
            minWidth: '18px',
            textAlign: 'center',
          }}
        >
          {providerCount + serverCount}
        </span>
      )}
    </button>
  )
}

/**
 * Compact KB button for smaller spaces
 */
export const KBButtonCompact: React.FC<KBButtonProps> = ({
  onClick,
  providerCount = 0,
  serverCount = 0,
  isActive = false,
}) => {
  const [isHovered, setIsHovered] = useState(false)
  
  const hasData = providerCount > 0 || serverCount > 0
  
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={hasData 
        ? `Knowledge Base: ${providerCount} providers, ${serverCount} servers` 
        : 'Knowledge Base'
      }
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '40px',
        height: '40px',
        background: isActive 
          ? 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)'
          : isHovered 
            ? 'rgba(236, 72, 153, 0.2)' 
            : 'transparent',
        border: 'none',
        borderRadius: '8px',
        color: isActive ? '#fff' : '#888',
        fontSize: '20px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        position: 'relative',
      }}
    >
      📚
      
      {/* Badge */}
      {hasData && (
        <span
          style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            background: '#22c55e',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
          }}
        />
      )}
    </button>
  )
}

export default KBButton

