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
 * StatusBadge — Deep Cool Aqua Glass Theme
 * High-contrast, cool tones on dark glass surfaces.
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
          background: 'rgba(14,165,233,0.18)',
          color: '#38BDF8',
          border: '1px solid rgba(14,165,233,0.46)',
        };
      case 'waiting':
        return {
          background: 'rgba(245,158,11,0.18)',
          color: '#FCD34D',
          border: '1px solid rgba(245,158,11,0.46)',
        };
      case 'succeeded':
        return {
          background: 'rgba(0,189,157,0.18)',
          color: '#6EE7C7',
          border: '1px solid rgba(0,189,157,0.46)',
        };
      case 'failed':
        return {
          background: 'rgba(244,63,94,0.18)',
          color: '#FDA4AF',
          border: '1px solid rgba(244,63,94,0.46)',
        };
      case 'pending':
      default:
        return {
          background: 'rgba(73,140,175,0.18)',
          color: '#90C4D8',
          border: '1px solid rgba(73,140,175,0.38)',
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
