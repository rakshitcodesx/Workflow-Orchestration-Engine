import React from 'react';
import {
  Clock,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  HelpCircle,
} from 'lucide-react';
import { getStatusMeta, STEP_STATUSES } from '../utils/status';

/**
 * StatusBadge — Aqua Glass Light Theme
 */
export default function StatusBadge({
  status,
  size = 'md',
  showIcon = true,
  pulse = false,
  className = '',
}) {
  const meta = getStatusMeta(status);

  const renderIcon = () => {
    const sz = size === 'sm' ? 11 : 13;
    switch (status) {
      case 'running':        return <Activity size={sz} className="animate-spin-slow" />;
      case 'waiting_approval': return <ShieldAlert size={sz} className="animate-pulse" />;
      case 'succeeded':      return <CheckCircle2 size={sz} />;
      case 'failed':         return <AlertTriangle size={sz} />;
      case 'pending':        return <Clock size={sz} />;
      default:               return <HelpCircle size={sz} />;
    }
  };

  const getStyle = () => {
    switch (meta.variant) {
      case 'running':
        return {
          background: 'rgba(14,165,233,0.10)',
          color: '#0369A1',
          border: '1px solid rgba(14,165,233,0.30)',
        };
      case 'waiting':
        return {
          background: 'rgba(217,119,6,0.10)',
          color: '#92400E',
          border: '1px solid rgba(217,119,6,0.30)',
        };
      case 'succeeded':
        return {
          background: 'rgba(0,189,157,0.10)',
          color: '#065F46',
          border: '1px solid rgba(0,189,157,0.30)',
        };
      case 'failed':
        return {
          background: 'rgba(225,29,72,0.09)',
          color: '#9F1239',
          border: '1px solid rgba(225,29,72,0.25)',
        };
      case 'pending':
      default:
        return {
          background: 'rgba(101,125,145,0.09)',
          color: '#475569',
          border: '1px solid rgba(101,125,145,0.22)',
        };
    }
  };

  const isPulsing =
    pulse ||
    status === STEP_STATUSES.RUNNING ||
    status === STEP_STATUSES.WAITING_APPROVAL;

  return (
    <span
      className={`glass-badge ${isPulsing ? 'animate-pulse' : ''} ${className}`.trim()}
      style={{
        ...getStyle(),
        fontSize: size === 'sm' ? '10px' : '11px',
        padding: size === 'sm' ? '2px 7px' : '3px 10px',
      }}
      title={meta.description}
    >
      {showIcon && renderIcon()}
      <span>{meta.label}</span>
    </span>
  );
}
