import React, { useState, useCallback } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

interface GoalData {
  id: string;
  name: string;
  description: string;
  success_criteria: string[];
  priority: 'low' | 'medium' | 'high';
  assigned_to: string[];
}

const GoalNode: React.FC<NodeProps<GoalData>> = ({ data, isConnectable }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(data.name);

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    console.log('Goal updated:', { id: data.id, name });
  }, [data.id, name]);

  const priorityColor = {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#ef4444',
  }[data.priority];

  return (
    <div
      style={{
        padding: '15px',
        borderRadius: '8px',
        minWidth: '150px',
        minHeight: '80px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#059669',
        color: 'white',
        border: `3px solid ${priorityColor}`,
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        cursor: 'pointer',
      }}
      onDoubleClick={handleDoubleClick}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        style={{ background: '#047857' }}
      />
      
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
        <>
          <div style={{ fontWeight: 'bold', fontSize: '14px', textAlign: 'center', marginBottom: '4px' }}>
            {data.name}
          </div>
          {data.assigned_to && data.assigned_to.length > 0 && (
            <div style={{ fontSize: '10px', opacity: 0.8 }}>
              → {data.assigned_to.length} actors
            </div>
          )}
        </>
      )}
      
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        style={{ background: '#047857' }}
      />
    </div>
  );
};

export default GoalNode;
