import React, { useState } from 'react';
import { TopBar } from './components/TopBar';
import { Navigator } from './components/Navigator';
import { Flow } from './components/canvas/Flow';
import { Inspector } from './components/Inspector';
import { ResultsPanel } from './components/ResultsPanel';
import { useStore } from './store/useStore';
import { Wand2 } from 'lucide-react';

function App() {
  const { model, generateModel, isLoading } = useStore();
  const [prompt, setPrompt] = useState('');
  const [showPrompt, setShowPrompt] = useState(!model); // Show if no model

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    await generateModel(prompt);
    setShowPrompt(false);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Top Bar */}
      <TopBar />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Navigator (now self-managing width) */}
        <div className="flex flex-col">
          <Navigator />
          <div className="p-4 border-t border-r bg-card">
            <button
              onClick={() => setShowPrompt(true)}
              className="w-full flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground py-2 rounded-md text-sm font-medium transition-colors"
            >
              <Wand2 className="w-4 h-4" />
              New Model
            </button>
          </div>
        </div>

        {/* Center: Canvas & Bottom Results */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 relative">
            <Flow />

            {/* Generator Overlay */}
            {showPrompt && (
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-card w-full max-w-lg p-6 rounded-xl shadow-2xl border">
                  <h2 className="text-2xl font-bold mb-2">Generate System Model</h2>
                  <p className="text-muted-foreground mb-4 text-sm">
                    Describe your dynamic system in plain English. The AI will convert it into a simulated model.
                  </p>
                  <form onSubmit={handleGenerate}>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="w-full h-32 p-3 rounded-md border bg-background mb-4 focus:ring-2 ring-primary outline-none resize-none"
                      placeholder="e.g. A predator-prey system with Rabbits and Foxes. Rabbits reproduce rapidly but are eaten by Foxes..."
                    />
                    <div className="flex justify-end gap-3">
                      {model && (
                        <button
                          type="button"
                          onClick={() => setShowPrompt(false)}
                          className="px-4 py-2 text-sm font-medium hover:bg-accent rounded-md"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={isLoading || !prompt.trim()}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                      >
                        {isLoading && <span className="animate-spin">⏳</span>}
                        {isLoading ? 'Generating...' : 'Generate Model'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Results Panel */}
          <div className="h-64 border-t bg-card">
            <ResultsPanel />
          </div>
        </div>

        {/* Right Sidebar: Inspector */}
        <div className="w-80 border-l bg-card">
          <Inspector />
        </div>
      </div>
    </div>
  );
}

export default App;
