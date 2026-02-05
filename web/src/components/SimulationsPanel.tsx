import React from 'react';
import { Play } from 'lucide-react';

export const SimulationsPanel: React.FC = () => {
    return (
        <div className="p-4 flex flex-col gap-3">
            <div>
                <h3 className="font-semibold mb-2 text-sm">Multi-Simulations</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                    Configure and run multiple simulation scenarios with different parameters, compare results side-by-side.
                </p>
            </div>

            <div className="p-3 bg-muted/50 rounded-lg border">
                <p className="text-xs text-muted-foreground">
                    <Play className="w-3.5 h-3.5 inline mr-1" />
                    Click the <strong>Play icon</strong> on the left to open the full Multi-Simulations Manager
                </p>
            </div>
        </div>
    );
};
