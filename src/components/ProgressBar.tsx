import React from 'react';

interface ProgressBarProps {
  progress: number; // 0-100
  message?: string;
  showPercentage?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ 
  progress, 
  message = "Génération de l'audio en cours...", 
  showPercentage = true 
}) => {
  return (
    <div className="progress-container">
      <div className="progress-message">{message}</div>
      <div className="progress-bar-wrapper">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
        {showPercentage && (
          <div className="progress-percentage">{Math.round(progress)}%</div>
        )}
      </div>
      
      <style>{`
        .progress-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          padding: 1.5rem;
          background: rgba(210, 180, 140, 0.1);
          border-radius: 12px;
          margin: 1rem 0;
          backdrop-filter: blur(5px);
        }
        
        .progress-message {
          color: #5d4037;
          font-size: 1.1rem;
          font-weight: 500;
          text-align: center;
          text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.8);
        }
        
        .progress-bar-wrapper {
          display: flex;
          align-items: center;
          gap: 1rem;
          width: 100%;
          max-width: 400px;
        }
        
        .progress-bar {
          flex: 1;
          height: 8px;
          background: rgba(93, 64, 55, 0.2);
          border-radius: 4px;
          overflow: hidden;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #d2b48c, #8d6e63);
          border-radius: 4px;
          transition: width 0.3s ease-out;
          box-shadow: 0 2px 4px rgba(210, 180, 140, 0.4);
          position: relative;
          overflow: hidden;
        }
        
        .progress-fill::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.3),
            transparent
          );
          animation: shimmer 2s infinite;
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .progress-percentage {
          color: #5d4037;
          font-size: 0.9rem;
          font-weight: bold;
          min-width: 40px;
          text-align: right;
          text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.8);
        }
        
        @media (max-width: 768px) {
          .progress-container {
            padding: 1rem;
          }
          
          .progress-bar-wrapper {
            max-width: 300px;
          }
          
          .progress-message {
            font-size: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default ProgressBar;
