import { ReactNode } from 'react';
import { haptic } from '@/utils/haptics';

type SegmentItem<T extends string> = {
  value: T;
  label: string;
  icon?: ReactNode;
};

type SegmentGroupProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  items: SegmentItem<T>[];
};

export function SegmentGroup<T extends string>({ value, onChange, items }: SegmentGroupProps<T>) {
  return (
    <div className="seg">
      {items.map((item) => {
        const isActive = item.value === value;
        return (
        <button
          key={item.value}
          type="button"
          className={`seg-btn${isActive ? ' is-active' : ''}`}
          onClick={() => {
            if (!isActive) {
              haptic('light');
              onChange(item.value);
            }
          }}
        >
          {item.icon ?? item.label}
        </button>
      );
      })}
    </div>
  );
}
