import React, { useState, useCallback } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

interface TaskData {
  id: string;
  name: string;
  description: string;
  required_abilities: string[];
  composed_of: string[];
  goal_ids: string[];
}

const TaskNode: React.FC<NodeProps<TaskData>> = ({ data, isConnectable }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(data.name);

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    console.log('Task updated:', { id: data.id, name });
  }, [data.id, name]);

  return (
    <div
      style={{
        padding: '15px',
        borderRadius: '4px',
        minWidth: '130px',
        minHeight: '70px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#7C3AED',
        color: 'white',
        border: '2px solid #6d28d9',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        cursor: 'pointer',
        clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
      }}
      onDoubleClick={handleDoubleClick}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        style={{ background: '#6d28d9' }}
      />
      
      <div style={{ padding: '10px' }}>
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
            <div style={{ fontWeight: 'bold', fontSize: '13px', textAlign: 'center', marginBottom: '4px' }}>
              {data.name}
            </div>
            {data.composed_of && data.composed_of.length > 0 && (
              <div style={{ fontSize: '10px', opacity: 0.8, textAlign: 'center' }}>
                {data.composed_of.length} interactions
              </div>
            )}
          </>
        )}
      </div>
      
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        style={{ background: '#6d28d9' }}
      />
    </div>
  );
};

export default TaskNode;
