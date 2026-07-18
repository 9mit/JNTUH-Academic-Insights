import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  'aria-label': string;
}

const MENU_ITEM_HEIGHT = 38;
const MENU_PADDING = 8;
const MENU_MAX_HEIGHT = 260;

export default function FilterSelect({ value, onChange, options, 'aria-label': ariaLabel }: FilterSelectProps) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selected = options.find(o => o.value === value) ?? options[0];

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const estimatedHeight = Math.min(
      options.length * MENU_ITEM_HEIGHT + MENU_PADDING,
      MENU_MAX_HEIGHT,
    );
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUp = spaceBelow < estimatedHeight + 12 && spaceAbove > estimatedHeight + 12;
    const maxHeight = Math.min(
      MENU_MAX_HEIGHT,
      openUp ? spaceAbove - 16 : spaceBelow - 16,
      window.innerHeight - 24,
    );

    setMenuStyle({
      top: openUp ? Math.max(8, rect.top - Math.min(estimatedHeight, maxHeight) - 6) : rect.bottom + 6,
      left: rect.left,
      width: rect.width,
      maxHeight: Math.max(120, maxHeight),
    });
  }, [options.length]);

  useEffect(() => {
    if (!open) return;

    updateMenuPosition();

    const onOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if ((target as Element).closest?.('.filter-select-menu-portal')) return;
      setOpen(false);
    };

    const onReposition = () => updateMenuPosition();

    document.addEventListener('mousedown', onOutside);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);

    return () => {
      document.removeEventListener('mousedown', onOutside);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open, updateMenuPosition]);

  const menu = open && menuStyle
    ? createPortal(
        <ul
          className="filter-select-menu filter-select-menu-portal"
          role="listbox"
          style={{
            position: 'fixed',
            top: menuStyle.top,
            left: menuStyle.left,
            width: menuStyle.width,
            maxHeight: menuStyle.maxHeight,
            zIndex: 9999,
          }}
        >
          {options.map(opt => (
            <li key={opt.value || '__all'} role="option" aria-selected={opt.value === value}>
              <button
                type="button"
                className={`filter-select-option ${opt.value === value ? 'filter-select-option-active' : ''}`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>,
        document.body,
      )
    : null;

  return (
    <div ref={rootRef} className="filter-select">
      <button
        ref={triggerRef}
        type="button"
        className="filter-select-trigger"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => {
          if (open) {
            setOpen(false);
          } else {
            updateMenuPosition();
            setOpen(true);
          }
        }}
      >
        <span className="truncate">{selected.label}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {menu}
    </div>
  );
}
