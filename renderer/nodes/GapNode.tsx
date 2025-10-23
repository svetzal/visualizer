import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

interface GapData {
  id: string;
  originalId: string;
  expected_type: 'actor' | 'goal' | 'task' | 'interaction';
  referenced_by: string[];
}

const GapNode: React.FC<NodeProps<GapData>> = ({ data, isConnectable }) => {
  return (
    <div
      style={{
        padding: '15px',
        borderRadius: '50%',
        width: '90px',
        height: '90px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'white',
        color: '#DC2626',
        border: '3px dashed #DC2626',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        cursor: 'help',
      }}
      title={`Missing ${data.expected_type}\nReferenced by ${data.referenced_by.length} entities`}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        style={{ background: '#DC2626' }}
      />
      
      <div style={{ fontSize: '32px', fontWeight: 'bold' }}>?</div>
      <div style={{ fontSize: '10px', marginTop: '4px' }}>{data.expected_type}</div>
      
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        style={{ background: '#DC2626' }}
      />
    </div>
  );
};

export default GapNode;
