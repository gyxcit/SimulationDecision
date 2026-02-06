import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../store/useStore';
import { VIEW_MODE_CONFIGS } from '../lib/viewModes';
import type { ViewMode } from '../lib/viewModes';
import {
    Briefcase,
    Code,
    Sliders,
    Search,
    ChevronDown,
    Check,
    Eye
} from 'lucide-react';
import { cn } from '../lib/utils';

const VIEW_MODE_ICONS: Record<ViewMode, React.ReactNode> = {
    executive: <Briefcase className="w-4 h-4" />,
    levers: <Sliders className="w-4 h-4" />,
    analyst: <Search className="w-4 h-4" />,
    technical: <Code className="w-4 h-4" />
};

const VIEW_MODE_COLORS: Record<ViewMode, string> = {
    executive: 'text-blue-500',
    levers: 'text-green-500',
    analyst: 'text-amber-500',
    technical: 'text-cyan-500'
};

export const ViewModeSelector: React.FC = () => {
    const { viewMode, setViewMode } = useStore();
    const [isOpen, setIsOpen] = useState(false);
    const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);
    const buttonRef = React.useRef<HTMLButtonElement>(null);

    const currentConfig = VIEW_MODE_CONFIGS[viewMode];

    const handleOpen = () => {
        if (buttonRef.current) {
            setButtonRect(buttonRef.current.getBoundingClientRect());
        }
        setIsOpen(true);
    };

    const handleSelect = (mode: ViewMode) => {
        setViewMode(mode);
        setIsOpen(false);
    };

    return (
        <>
            <button
                ref={buttonRef}
                onClick={handleOpen}
                className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all",
                    "hover:bg-accent hover:border-primary/30",
                    "focus:outline-none focus:ring-2 focus:ring-primary/20"
                )}
            >
                <Eye className="w-4 h-4 text-muted-foreground" />
                <span className={cn("font-medium", VIEW_MODE_COLORS[viewMode])}>
                    {VIEW_MODE_ICONS[viewMode]}
                </span>
                <span className="text-sm font-medium hidden lg:inline">
                    {currentConfig.label.split(' / ')[0]}
                </span>
                <ChevronDown className={cn(
                    "w-3 h-3 text-muted-foreground transition-transform",
                    isOpen && "rotate-180"
                )} />
            </button>

            {isOpen && createPortal(
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-[9998]"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Dropdown Menu */}
                    <div
                        className="fixed z-[9999] w-80 bg-popover border rounded-xl shadow-xl overflow-hidden"
                        style={{
                            top: buttonRect ? buttonRect.bottom + 8 : 0,
                            left: buttonRect ? Math.min(buttonRect.left, window.innerWidth - 340) : 0
                        }}
                    >
                        <div className="p-3 border-b bg-muted/30">
                            <div className="flex items-center gap-2">
                                <Eye className="w-4 h-4 text-primary" />
                                <span className="font-semibold text-sm">View Mode</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Adapt graphs and values for your audience
                            </p>
                        </div>

                        <div className="p-2">
                            {(Object.keys(VIEW_MODE_CONFIGS) as ViewMode[]).map((mode) => {
                                const config = VIEW_MODE_CONFIGS[mode];
                                const isSelected = mode === viewMode;

                                return (
                                    <button
                                        key={mode}
                                        onClick={() => handleSelect(mode)}
                                        className={cn(
                                            "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all",
                                            isSelected
                                                ? "bg-primary/10 border border-primary/30"
                                                : "hover:bg-accent border border-transparent"
                                        )}
                                    >
                                        <div className={cn(
                                            "p-2 rounded-lg",
                                            isSelected ? "bg-primary/20" : "bg-muted"
                                        )}>
                                            <span className={VIEW_MODE_COLORS[mode]}>
                                                {VIEW_MODE_ICONS[mode]}
                                            </span>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    "font-medium text-sm",
                                                    isSelected && "text-primary"
                                                )}>
                                                    {config.label}
                                                </span>
                                                <span className="text-xs px-1.5 py-0.5 bg-muted rounded-full text-muted-foreground">
                                                    L{config.level}
                                                </span>
                                                {isSelected && (
                                                    <Check className="w-4 h-4 text-primary" />
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                                {config.description}
                                            </p>

                                            {/* Mode features */}
                                            <div className="flex gap-2 mt-2 flex-wrap">
                                                {config.showTrendArrows && (
                                                    <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded">
                                                        Trends
                                                    </span>
                                                )}
                                                {config.showRawValues && (
                                                    <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded">
                                                        Raw Data
                                                    </span>
                                                )}
                                                {config.showFormulas && (
                                                    <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded">
                                                        Formulas
                                                    </span>
                                                )}
                                                <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded capitalize">
                                                    {config.valueFormat}
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="p-3 border-t bg-muted/20">
                            <p className="text-[10px] text-muted-foreground text-center">
                                This affects all graphs, values, and labels in the system
                            </p>
                        </div>
                    </div>
                </>,
                document.body
            )}
        </>
    );
};
