import React, { useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  UserCheck,
  Cpu,
  Mail,
  Layers,
  CheckSquare,
  Play,
  Square,
  HelpCircle,
  Eye
} from 'lucide-react';
import { STEP_TYPE_META, normalizeStepType } from '../processViewModel';

export const BpmnProcessMapView = ({ vm, selectedStepId, onSelectStep }) => {
  const [zoom, setZoom] = useState(1.0);

  if (!vm || !vm.bpmnElements) {
    return (
      <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        BPMN Process Map data is unavailable.
      </div>
    );
  }

  const { totalWidth, totalHeight, lanes, tasks, flows } = vm.bpmnElements;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.15, 2.0));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.15, 0.5));
  const handleResetZoom = () => setZoom(1.0);

  const getTaskIcon = (bpmnKind, type) => {
    const norm = normalizeStepType(type);
    if (norm === 'HUMAN_APPROVAL' || bpmnKind === 'userTask') {
      return <UserCheck size={12} color="var(--accent-green)" />;
    }
    if (norm === 'INTEGRATION' || norm === 'AUTOMATION' || bpmnKind === 'serviceTask') {
      return <Cpu size={12} color="#2563EB" />;
    }
    if (norm === 'NOTIFICATION' || bpmnKind === 'sendTask') {
      return <Mail size={12} color="#3B82F6" />;
    }
    if (norm === 'SUB_PROCESS' || bpmnKind === 'subProcess') {
      return <Layers size={12} color="#64748B" />;
    }
    return <CheckSquare size={12} color="var(--accent-amber)" />;
  };

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Map Control Bar */}
      <div
        style={{
          padding: '12px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
            BPMN 2.0 Process Flow Map
          </span>
          <span className="badge badge-gray" style={{ fontSize: '0.68rem' }}>
            {tasks.length} Nodes • {flows.length} Sequence Flows • {lanes.length} Lanes
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: 4 }}>
            Zoom: {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomOut}
            className="btn btn-secondary btn-sm"
            style={{ padding: '4px 8px' }}
            title="Zoom Out"
          >
            <ZoomOut size={13} />
          </button>
          <button
            onClick={handleResetZoom}
            className="btn btn-secondary btn-sm"
            style={{ padding: '4px 8px' }}
            title="Reset Zoom"
          >
            <RotateCcw size={13} />
          </button>
          <button
            onClick={handleZoomIn}
            className="btn btn-secondary btn-sm"
            style={{ padding: '4px 8px' }}
            title="Zoom In"
          >
            <ZoomIn size={13} />
          </button>
        </div>
      </div>

      {/* SVG Canvas Scroll Area */}
      <div
        style={{
          overflow: 'auto',
          maxHeight: '650px',
          minHeight: '440px',
          backgroundColor: 'var(--bg-base)',
          padding: 24,
          position: 'relative'
        }}
      >
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            transition: 'transform 0.15s ease-out',
            display: 'inline-block'
          }}
        >
          <svg
            width={totalWidth}
            height={totalHeight}
            style={{ display: 'block' }}
          >
            <defs>
              {/* Standard Sequence Flow Arrow */}
              <marker
                id="bpmn-arrow"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="var(--text-muted)" />
              </marker>

              {/* Exception Flow Arrow */}
              <marker
                id="bpmn-arrow-exception"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#EF4444" />
              </marker>

              {/* Approval Flow Arrow */}
              <marker
                id="bpmn-arrow-approval"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#10B981" />
              </marker>

              {/* Active Node Drop Shadow */}
              <filter id="bpmn-node-shadow" x="-10%" y="-10%" width="125%" height="125%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.12" />
              </filter>

              {/* Selected Glow */}
              <filter id="bpmn-selected-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="var(--accent-amber)" floodOpacity="0.65" />
              </filter>
            </defs>

            {/* Swimlanes Background & Headers */}
            {lanes.map((lane, idx) => (
              <g key={lane.name}>
                {/* Lane body background */}
                <rect
                  x="50"
                  y={lane.y}
                  width={totalWidth - 70}
                  height={lane.height}
                  fill={idx % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.04)'}
                  stroke="var(--border-subtle)"
                  strokeWidth="1"
                />

                {/* Left lane actor title box */}
                <rect
                  x="10"
                  y={lane.y}
                  width="40"
                  height={lane.height}
                  fill="var(--bg-subtle)"
                  stroke="var(--border-medium)"
                  strokeWidth="1"
                />
                <text
                  x={30}
                  y={lane.y + lane.height / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  transform={`rotate(-90, 30, ${lane.y + lane.height / 2})`}
                  fill="var(--text-secondary)"
                  fontSize="11"
                  fontWeight="700"
                  letterSpacing="0.5"
                >
                  {lane.name}
                </text>
              </g>
            ))}

            {/* Sequence Flows */}
            {flows.map((flow) => {
              const isException = flow.isException;
              const isApproval = flow.isApproval;
              const marker = isException
                ? 'url(#bpmn-arrow-exception)'
                : isApproval
                ? 'url(#bpmn-arrow-approval)'
                : 'url(#bpmn-arrow)';
              const strokeColor = isException
                ? '#EF4444'
                : isApproval
                ? '#10B981'
                : 'var(--border-medium)';

              return (
                <g key={flow.id}>
                  <path
                    d={flow.pathD}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={isException || isApproval ? '2' : '1.75'}
                    strokeDasharray={isException ? '4 3' : undefined}
                    markerEnd={marker}
                  />

                  {/* Flow condition label */}
                  {flow.label && (
                    <g transform={`translate(${flow.midX}, ${flow.midY - 12})`}>
                      <rect
                        x="-45"
                        y="-8"
                        width="90"
                        height="16"
                        rx="3"
                        fill="var(--bg-card)"
                        stroke="var(--border-subtle)"
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="3"
                        textAnchor="middle"
                        fill={isException ? '#EF4444' : isApproval ? '#10B981' : 'var(--text-muted)'}
                        fontSize="8.5"
                        fontWeight="700"
                      >
                        {flow.label.length > 18 ? `${flow.label.slice(0, 16)}…` : flow.label}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Tasks & Events */}
            {tasks.map((node) => {
              const isSelected = selectedStepId === node.id;
              const meta = STEP_TYPE_META[normalizeStepType(node.type)] || STEP_TYPE_META.ACTION;

              if (node.bpmnKind === 'startEvent') {
                return (
                  <g
                    key={node.id}
                    onClick={() => onSelectStep(node.id)}
                    style={{ cursor: 'pointer' }}
                    filter={isSelected ? 'url(#bpmn-selected-glow)' : 'url(#bpmn-node-shadow)'}
                  >
                    <circle
                      cx={node.x + node.width / 2}
                      cy={node.y + node.height / 2}
                      r="18"
                      fill="rgba(16, 185, 129, 0.18)"
                      stroke="#10B981"
                      strokeWidth={isSelected ? '3' : '2'}
                    />
                    <polygon
                      points={`${node.x + node.width / 2 - 4},${node.y + node.height / 2 - 6} ${node.x + node.width / 2 + 6},${node.y + node.height / 2} ${node.x + node.width / 2 - 4},${node.y + node.height / 2 + 6}`}
                      fill="#10B981"
                    />
                    <text
                      x={node.x + node.width / 2}
                      y={node.y + node.height + 14}
                      textAnchor="middle"
                      fill="var(--text-primary)"
                      fontSize="9.5"
                      fontWeight="700"
                    >
                      {node.label.length > 18 ? `${node.label.slice(0, 16)}…` : node.label}
                    </text>
                  </g>
                );
              }

              if (node.bpmnKind === 'endEvent') {
                return (
                  <g
                    key={node.id}
                    onClick={() => onSelectStep(node.id)}
                    style={{ cursor: 'pointer' }}
                    filter={isSelected ? 'url(#bpmn-selected-glow)' : 'url(#bpmn-node-shadow)'}
                  >
                    <circle
                      cx={node.x + node.width / 2}
                      cy={node.y + node.height / 2}
                      r="19"
                      fill="rgba(239, 68, 68, 0.15)"
                      stroke="#EF4444"
                      strokeWidth={isSelected ? '3.5' : '2.5'}
                    />
                    <circle
                      cx={node.x + node.width / 2}
                      cy={node.y + node.height / 2}
                      r="14"
                      fill="none"
                      stroke="#EF4444"
                      strokeWidth="1.5"
                    />
                    <text
                      x={node.x + node.width / 2}
                      y={node.y + node.height + 14}
                      textAnchor="middle"
                      fill="var(--text-primary)"
                      fontSize="9.5"
                      fontWeight="700"
                    >
                      {node.label.length > 18 ? `${node.label.slice(0, 16)}…` : node.label}
                    </text>
                  </g>
                );
              }

              if (node.bpmnKind === 'exclusiveGateway') {
                const cx = node.x + node.width / 2;
                const cy = node.y + node.height / 2;
                const half = 19;
                return (
                  <g
                    key={node.id}
                    onClick={() => onSelectStep(node.id)}
                    style={{ cursor: 'pointer' }}
                    filter={isSelected ? 'url(#bpmn-selected-glow)' : 'url(#bpmn-node-shadow)'}
                  >
                    <polygon
                      points={`${cx},${cy - half} ${cx + half},${cy} ${cx},${cy + half} ${cx - half},${cy}`}
                      fill="rgba(245, 158, 11, 0.16)"
                      stroke="#D97706"
                      strokeWidth={isSelected ? '3' : '2'}
                    />
                    {/* Centered 'X' cross */}
                    <path
                      d={`M ${cx - 6} ${cy - 6} L ${cx + 6} ${cy + 6} M ${cx + 6} ${cy - 6} L ${cx - 6} ${cy + 6}`}
                      stroke="#D97706"
                      strokeWidth="2.5"
                    />
                    <text
                      x={cx}
                      y={cy + half + 14}
                      textAnchor="middle"
                      fill="var(--text-primary)"
                      fontSize="9.5"
                      fontWeight="700"
                    >
                      {node.label.length > 18 ? `${node.label.slice(0, 16)}…` : node.label}
                    </text>
                  </g>
                );
              }

              // Standard BPMN Task
              return (
                <g
                  key={node.id}
                  onClick={() => onSelectStep(node.id)}
                  style={{ cursor: 'pointer' }}
                  filter={isSelected ? 'url(#bpmn-selected-glow)' : 'url(#bpmn-node-shadow)'}
                >
                  {/* Task Card Body */}
                  <rect
                    x={node.x}
                    y={node.y}
                    width={node.width}
                    height={node.height}
                    rx="8"
                    ry="8"
                    fill="var(--bg-surface)"
                    stroke={isSelected ? 'var(--accent-amber)' : 'var(--border-medium)'}
                    strokeWidth={isSelected ? '2' : '1'}
                  />

                  {/* Left color bar */}
                  <rect
                    x={node.x}
                    y={node.y}
                    width="5"
                    height={node.height}
                    rx="2"
                    fill={meta.border}
                  />

                  {/* Task Header: Step # & Type */}
                  <text
                    x={node.x + 12}
                    y={node.y + 16}
                    fill="var(--accent-amber-text)"
                    fontSize="8.5"
                    fontWeight="800"
                  >
                    #{node.stepOrder}
                  </text>

                  <text
                    x={node.x + 32}
                    y={node.y + 16}
                    fill="var(--text-muted)"
                    fontSize="7.5"
                    fontWeight="700"
                  >
                    {node.type}
                  </text>

                  {/* Task Label */}
                  <text
                    x={node.x + 12}
                    y={node.y + 34}
                    fill="var(--text-primary)"
                    fontSize="9.5"
                    fontWeight="700"
                  >
                    {node.label.length > 18 ? `${node.label.slice(0, 17)}…` : node.label}
                  </text>

                  {/* Actor or System Subtitle */}
                  <text
                    x={node.x + 12}
                    y={node.y + 50}
                    fill="var(--text-secondary)"
                    fontSize="8"
                  >
                    {node.system ? `⚙ ${node.system.slice(0, 16)}` : `👤 ${node.actor.slice(0, 16)}`}
                  </text>

                  {/* Semantic mini icon rendered via foreignObject */}
                  <foreignObject
                    x={node.x + node.width - 24}
                    y={node.y + 6}
                    width="18"
                    height="18"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {getTaskIcon(node.bpmnKind, node.type)}
                    </div>
                  </foreignObject>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* BPMN Notation Legend Bar */}
      <div
        style={{
          padding: '10px 20px',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          fontSize: '0.74rem',
          color: 'var(--text-secondary)'
        }}
      >
        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>BPMN 2.0 Legend:</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid #10B981', display: 'inline-block' }} />
            Start Event
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', border: '2.5px double #EF4444', display: 'inline-block' }} />
            End Event
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, border: '1.5px solid #D97706', transform: 'rotate(45deg)', display: 'inline-block' }} />
            Exclusive Gateway (XOR)
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <UserCheck size={12} color="var(--accent-green)" />
            User Task (Approval)
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Cpu size={12} color="#2563EB" />
            Service Task (Integration)
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 16, height: 2, backgroundColor: 'var(--border-medium)', display: 'inline-block' }} />
            Sequence Flow
          </span>
        </div>

        <span style={{ fontStyle: 'italic', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          Click any element to inspect in drawer
        </span>
      </div>
    </div>
  );
};
