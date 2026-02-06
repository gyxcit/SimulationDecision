import React, { useState, useRef, useEffect } from 'react';

interface MentionInputProps {
    value: string;
    onChange: (value: string) => void;
    options: string[];
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export const MentionInput: React.FC<MentionInputProps> = ({
    value,
    onChange,
    options,
    placeholder,
    className = "",
    disabled = false
}) => {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestionIndex, setSuggestionIndex] = useState(0);
    const [filterText, setFilterText] = useState('');
    const [cursorPosition, setCursorPosition] = useState(0);
    const [mentionStartPos, setMentionStartPos] = useState(-1);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Filter options based on text after @
    const filteredOptions = options.filter(opt =>
        opt.toLowerCase().includes(filterText.toLowerCase())
    ).slice(0, 8); // Limit to 8 suggestions

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        const newCursorPos = e.target.selectionStart;
        onChange(newValue);
        setCursorPosition(newCursorPos);

        // Check for @ mention trigger - look backwards from cursor
        const textBeforeCursor = newValue.substring(0, newCursorPos);
        const lastAt = textBeforeCursor.lastIndexOf('@');

        if (lastAt !== -1) {
            // @ can be at start (position 0) or preceded by space/newline
            const charBeforeAt = lastAt > 0 ? textBeforeCursor[lastAt - 1] : ' ';
            const isValidTrigger = lastAt === 0 || charBeforeAt === ' ' || charBeforeAt === '\n';
            
            if (isValidTrigger) {
                const query = textBeforeCursor.substring(lastAt + 1);
                // Check if query contains space (would end the mention)
                if (!query.includes(' ') && !query.includes('\n')) {
                    setFilterText(query);
                    setMentionStartPos(lastAt);
                    setShowSuggestions(true);
                    setSuggestionIndex(0);
                    return;
                }
            }
        }

        setShowSuggestions(false);
        setMentionStartPos(-1);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (!showSuggestions || filteredOptions.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSuggestionIndex(prev => (prev + 1) % filteredOptions.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSuggestionIndex(prev => (prev - 1 + filteredOptions.length) % filteredOptions.length);
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            if (filteredOptions[suggestionIndex]) {
                e.preventDefault();
                selectOption(filteredOptions[suggestionIndex]);
            }
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
        }
    };

    const selectOption = (option: string) => {
        if (mentionStartPos === -1) return;
        
        const prefix = value.substring(0, mentionStartPos);
        const suffix = value.substring(cursorPosition);
        const newValue = `${prefix}@${option} ${suffix}`;
        onChange(newValue);
        setShowSuggestions(false);
        setMentionStartPos(-1);

        // Restore focus and set cursor after insertion
        setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.focus();
                const newPos = mentionStartPos + option.length + 2; // +2 for @ and space
                inputRef.current.setSelectionRange(newPos, newPos);
            }
        }, 0);
    };

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={containerRef} className="relative w-full">
            <textarea
                ref={inputRef}
                value={value}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className={`w-full min-h-[80px] p-2 border rounded-md text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
                disabled={disabled}
            />

            {showSuggestions && filteredOptions.length > 0 && (
                <div 
                    data-mention-suggestions="true"
                    className="absolute z-[10000] bg-white border border-slate-200 rounded-md shadow-lg max-h-[200px] overflow-y-auto w-full mt-1 left-0"
                >
                    {filteredOptions.map((opt, idx) => (
                        <button
                            key={opt}
                            type="button"
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center gap-2 ${idx === suggestionIndex ? 'bg-blue-100' : ''}`}
                            onMouseDown={(e) => {
                                e.preventDefault(); // Prevent blur
                                selectOption(opt);
                            }}
                        >
                            <span className="text-blue-500 font-medium">@</span>
                            <span className="font-mono">{opt}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
