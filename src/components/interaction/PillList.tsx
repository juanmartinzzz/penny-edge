import { useState } from 'react';
import Pill from './Pill';

interface PillListProps {
  options: string[];
  selected?: string[];
  onChange?: (selected: string[]) => void;
  variant?: 'single' | 'multiple';
  className?: string;
  disabled?: boolean;
}

const PillList: React.FC<PillListProps> = ({
  options,
  selected = [],
  onChange,
  variant = 'single',
  className = '',
  disabled = false
}) => {
  const [internalSelected, setInternalSelected] = useState<string[]>(selected);

  const currentSelected = selected !== undefined ? selected : internalSelected;

  const handlePillClick = (option: string) => {
    if (disabled) return;

    let newSelected: string[];

    if (variant === 'single') {
      newSelected = currentSelected.includes(option) ? [] : [option];
    } else {
      newSelected = currentSelected.includes(option)
        ? currentSelected.filter(item => item !== option)
        : [...currentSelected, option];
    }

    if (selected === undefined) {
      setInternalSelected(newSelected);
    }
    onChange?.(newSelected);
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {options.map((option) => (
        <Pill
          key={option}
          label={option}
          selected={currentSelected.includes(option)}
          onClick={() => handlePillClick(option)}
          disabled={disabled}
        />
      ))}
    </div>
  );
};

export default PillList;