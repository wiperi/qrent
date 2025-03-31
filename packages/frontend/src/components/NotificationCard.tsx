import React from 'react';

interface NotificationCardProps {
  message: string;
  description: string;
  type: 'success' | 'error';
}

const NotificationCard: React.FC<NotificationCardProps> = ({ message, description, type }) => {
  // Declare style type as React.CSSProperties
  const cardStyle: React.CSSProperties = {
    padding: '20px',
    borderRadius: '10px',
    margin: '10px 0',
    backgroundColor: type === 'success' ? '#4CAF50' : '#F44336', // Green for success, Red for error
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
  };

  return (
    <div style={cardStyle}>
      <strong>{message}</strong>
      <p>{description}</p>
    </div>
  );
};

export default NotificationCard;
