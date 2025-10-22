import React, { useState, useCallback } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

interface InteractionData {
  id: string;
  name: string;
  description: string;
  preconditions: string[];
  effects: string[];
}

const InteractionNode: React.FC<NodeProps<InteractionData>> = ({ data, isConnectable }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(data.name);

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    console.log('Interaction updated:', { id: data.id, name });
  }, [data.id, name]);

  return (
    <div
      style={{
        padding: '15px',
        minWidth: '120px',
        minHeight: '120px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#EA580C',
        color: 'white',
        border: '2px solid #c2410c',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        cursor: 'pointer',
        transform: 'rotate(45deg)',
      }}
      onDoubleClick={handleDoubleClick}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        style={{ background: '#c2410c', transform: 'rotate(-45deg)' }}
      />
      
      <div style={{ transform: 'rotate(-45deg)' }}>
        {isEditing ? (
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleBlur}
            autoFocus
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.9)',
              color: '#1f2937',
              border: 'none',
              borderRadius: '4px',
              padding: '4px',
              fontSize: '12px',
              textAlign: 'center',
            }}
          />
        ) : (
          <div style={{ fontWeight: 'bold', fontSize: '13px', textAlign: 'center' }}>
            {data.name}
          </div>
        )}
      </div>
      
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        style={{ background: '#c2410c', transform: 'rotate(-45deg)' }}
      />
    </div>
  );
};

export default InteractionNode;
