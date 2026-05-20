import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, Check, X } from "lucide-react";

export function SearchableDropdown({
  label,
  options,
  value,
  onChange,
  multi = false,
}: {
  label: string;
  options: string[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  multi?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selectedValues = multi ? (value as string[]) : [];
  const singleValue = !multi ? (value as string) : "";
  const isActive = multi ? selectedValues.length > 0 : !!singleValue;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const q = searchTerm.toLowerCase();
    return options.filter((opt) => opt.toLowerCase().includes(q));
  }, [options, searchTerm]);

  const handleMultiSelect = (opt: string) => {
    const current = value as string[];
    if (current.includes(opt)) {
      onChange(current.filter((v) => v !== opt));
    } else {
      onChange([...current, opt]);
    }
  };

  const displayLabel = useMemo(() => {
    if (!multi) return singleValue || label;
    if (selectedValues.length === 0) return label;
    if (selectedValues.length === 1) return selectedValues[0];
    return `${selectedValues.length} selected`;
  }, [multi, singleValue, label, selectedValues]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`bg-white border rounded-lg px-3 py-2 text-xs flex items-center gap-2 whitespace-nowrap transition-colors ${
          isActive
            ? "border-indigo-300 text-indigo-700 bg-indigo-50"
            : "border-slate-300 text-slate-900"
        }`}
      >
        <span className="truncate max-w-[120px]">{displayLabel}</span>

        {/* Clear button for multi-select */}
        {multi && selectedValues.length > 0 && (
          <span
            role="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange([]);
            }}
            className="ml-auto text-indigo-400 hover:text-rose-500 transition-colors"
          >
            <X className="w-3 h-3" />
          </span>
        )}

        <ChevronDown
          className={`w-3 h-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg">
          {/* Search input */}
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Search ${label.toLowerCase()}...`}
                className="w-full pl-7 pr-2 py-1.5 text-xs border border-slate-200 rounded-md outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Multi-select selected count + clear */}
          {multi && selectedValues.length > 0 && (
            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-indigo-600 font-medium">
                {selectedValues.length} brand{selectedValues.length !== 1 ? "s" : ""} selected
              </span>
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[10px] text-rose-500 hover:text-rose-700 font-medium"
              >
                Clear all
              </button>
            </div>
          )}

          <div className="max-h-48 overflow-y-auto">
            {/* Single-select: show "All" reset option */}
            {!multi && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                  setSearchTerm("");
                }}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 ${
                  !singleValue ? "bg-indigo-50 text-indigo-700 font-medium" : ""
                }`}
              >
                {label}
              </button>
            )}

            {filteredOptions.map((opt) => {
              const isSelected = multi
                ? selectedValues.includes(opt)
                : singleValue === opt;

              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    if (multi) {
                      handleMultiSelect(opt);
                    } else {
                      onChange(opt);
                      setOpen(false);
                      setSearchTerm("");
                    }
                  }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 transition-colors ${
                    isSelected ? "bg-indigo-50 text-indigo-700 font-medium" : "text-slate-700"
                  }`}
                >
                  {/* Checkbox for multi-select */}
                  {multi && (
                    <span
                      className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? "bg-indigo-600 border-indigo-600"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                    </span>
                  )}
                  <span className="truncate">{opt}</span>
                </button>
              );
            })}

            {filteredOptions.length === 0 && (
              <div className="px-3 py-4 text-xs text-slate-400 text-center">
                No results
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}