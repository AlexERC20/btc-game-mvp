import React from 'react';
import DownloadIcon from '../icons/DownloadIcon';

export const BOTTOM_BAR_H = 86;

type Props = {
  onOpenExport: () => void;
  disabledExport?: boolean;
};

export default function BottomBar({ onOpenExport, disabledExport }: Props) {
  return (
    <div
      className="bottom-bar toolbar"
      style={{
        height: BOTTOM_BAR_H,
        zIndex: 40,
        ['--bottom-bar-h' as any]: `${BOTTOM_BAR_H}px`,
      }}
    >
      <button
        type="button"
        className="toolbar__btn"
        onClick={onOpenExport}
        aria-label="Export"
        disabled={disabledExport}
      >
        <span className="toolbar__icon">
          <DownloadIcon />
        </span>
        <span className="toolbar__label">Export</span>
      </button>
    </div>
  );
}
