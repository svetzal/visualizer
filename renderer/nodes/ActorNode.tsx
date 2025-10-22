import React, { useState, useCallback } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

interface ActorData {
  id: string;
  name: string;
  description: string;
  abilities: string[];
  constraints: string[];
}

const ActorNode: React.FC<NodeProps<ActorData>> = ({ data, isConnectable }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(data.name);
  const [description, setDescription] = useState(data.description);

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    // TODO: Save changes via IPC
    console.log('Actor updated:', { id: data.id, name, description });
  }, [data.id, name, description]);

  return (
    <div
      style={{
        padding: '15px',
        borderRadius: '50%',
        width: '120px',
        height: '120px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#2563EB',
        color: 'white',
        border: '2px solid #1e40af',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        cursor: 'pointer',
      }}
      onDoubleClick={handleDoubleClick}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        style={{ background: '#1e40af' }}
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
          {data.abilities && data.abilities.length > 0 && (
            <div style={{ fontSize: '10px', opacity: 0.8 }}>
              {data.abilities.length} abilities
            </div>
          )}
        </>
      )}
      
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        style={{ background: '#1e40af' }}
      />
    </div>
  );
};

export default ActorNode;
