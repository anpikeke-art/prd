'use client';

import ReactFlow, { Background, Controls, MiniMap, type Edge, type Node } from 'reactflow';
import 'reactflow/dist/style.css';

type Props = {
  nodes: Node[];
  edges: Edge[];
};

import { useEffect, useRef } from 'react';
import type { ReactFlowInstance } from 'reactflow';

export function ProjectDiagram({ nodes, edges }: Props) {
  const rf = useRef<ReactFlowInstance | null>(null);
  useEffect(() => { if (rf.current) setTimeout(() => rf.current?.fitView({ duration: 200 }), 50); }, [nodes.length, edges.length]);
  return (
    <div className="h-[70vh] min-h-[500px] w-full overflow-hidden rounded-card border border-border bg-surface/88 shadow-card backdrop-blur-xl">
      <ReactFlow nodes={nodes} edges={edges} fitView onInit={i => { rf.current = i; }}>
        <MiniMap />
        <Controls />
        <Background gap={16} />
      </ReactFlow>
    </div>
  );
}
