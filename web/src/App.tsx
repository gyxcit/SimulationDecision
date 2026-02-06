import React, { useState } from 'react';
import { TopBar } from './components/TopBar';
import { Navigator } from './components/Navigator';
import { Flow } from './components/canvas/Flow';
import { Inspector } from './components/Inspector';
import { SimulationResults } from './components/SimulationResults';
import { SimulationsManager } from './components/SimulationsManager';
import { VisualizationView } from './components/VisualizationPanel';
import { AIChatPanel } from './components/AIChatPanel';
import { useStore } from './store/useStore';
import { Wand2, X, ChevronUp, ChevronDown, Bot } from 'lucide-react';

function App() {
  const { model, generateModel, isLoading, useV7, toggleV7 } = useStore();
  const [prompt, setPrompt] = useState('');
  const [showPrompt, setShowPrompt] = useState(!model); // Show if no model
  const [inspectorVisible, setInspectorVisible] = useState(true);
  const [activeView, setActiveView] = useState<'canvas' | 'simulations' | 'visualization'>('canvas');
  const [resultsPanelState, setResultsPanelState] = useState<'collapsed' | 'normal' | 'expanded'>('normal');
  const [aiPanelState, setAiPanelState] = useState<'collapsed' | 'normal' | 'expanded'>('collapsed');

  const resultsPanelHeight = {
    collapsed: 40,
    normal: 256,
    expanded: 500,
  };

  const aiPanelWidth = {
    collapsed: 48,
    normal: 380,
    expanded: 550,
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    await generateModel(prompt);
    setShowPrompt(false);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Top Bar */}
      <TopBar
        currentView={activeView}
        onNavigateHome={() => setActiveView('canvas')}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Navigator - Always visible */}
        <div className="flex flex-col border-r">
          <Navigator
            onViewChange={setActiveView}
            currentView={activeView}
          />
          <div className="p-2 border-t bg-card flex items-center justify-center">
            <button
              onClick={() => setShowPrompt(true)}
              className="w-8 h-8 flex items-center justify-center rounded-md transition-colors hover:bg-accent text-muted-foreground"
              title="New Model"
            >
              <Wand2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Center: Canvas & Bottom Results OR Simulations Full Page */}
        <div className="flex-1 flex flex-col min-w-0">
          {activeView === 'canvas' ? (
            <>
              <div className="flex-1 relative">
                {/* Inspector Toggle Button */}
                <button
                  onClick={() => setInspectorVisible(!inspectorVisible)}
                  className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg flex items-center justify-center transition-all hover:scale-110"
                  title={inspectorVisible ? "Masquer l'inspecteur" : "Afficher l'inspecteur"}
                >
                  {inspectorVisible ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                  )}
                </button>

                {/* AI Chat Toggle Button */}
                <button
                  onClick={() => setAiPanelState(aiPanelState === 'collapsed' ? 'normal' : 'collapsed')}
                  className={`absolute top-[72px] right-4 z-10 w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 ${aiPanelState !== 'collapsed'
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-purple-100 text-purple-600 hover:bg-purple-200'
                    }`}
                  title={aiPanelState !== 'collapsed' ? "Masquer l'assistant AI" : "Afficher l'assistant AI"}
                >
                  <Bot className="w-5 h-5" />
                </button>

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

                        {/* V7 Toggle */}
                        <div className="mb-4 p-3 bg-accent/20 rounded-md border border-accent/30">
                          <label className="flex items-center justify-between cursor-pointer">
                            <div className="flex-1">
                              <div className="font-medium text-sm">
                                {useV7 ? '🚀 Multi-Agent V7' : '⚡ Single-LLM V5'}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {useV7
                                  ? 'Thorough analysis with 8 agents (~30-90s)'
                                  : 'Fast generation (~5-15s)'}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={toggleV7}
                              className={`ml-3 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${useV7 ? 'bg-primary' : 'bg-muted'
                                }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useV7 ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                              />
                            </button>
                          </label>
                        </div>

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
                            {isLoading ? (useV7 ? 'Running V7...' : 'Generating...') : 'Generate Model'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Results Panel - Collapsible */}
              <div
                className="border-t bg-card transition-all duration-300 overflow-hidden flex flex-col"
                style={{ height: `${resultsPanelHeight[resultsPanelState]}px` }}
              >
                {/* Results Panel Header */}
                <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 shrink-0">
                  <span className="text-sm font-medium">Simulation Results</span>
                  <div className="flex items-center gap-1">
                    {resultsPanelState !== 'collapsed' && (
                      <button
                        onClick={() => setResultsPanelState(resultsPanelState === 'expanded' ? 'normal' : 'expanded')}
                        className="p-1 rounded hover:bg-accent transition-colors"
                        title={resultsPanelState === 'expanded' ? 'Reduce' : 'Expand'}
                      >
                        {resultsPanelState === 'expanded' ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronUp className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => setResultsPanelState(resultsPanelState === 'collapsed' ? 'normal' : 'collapsed')}
                      className="p-1 rounded hover:bg-accent transition-colors"
                      title={resultsPanelState === 'collapsed' ? 'Show Results' : 'Hide Results'}
                    >
                      {resultsPanelState === 'collapsed' ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                {/* Results Content */}
                {resultsPanelState !== 'collapsed' && (
                  <div className="flex-1 min-h-0 overflow-auto">
                    <SimulationResults />
                  </div>
                )}
              </div>
            </>
          ) : activeView === 'simulations' ? (
            <div className="h-full overflow-hidden">
              <SimulationsManager />
            </div>
          ) : (
            <div className="h-full overflow-hidden">
              <VisualizationView />
            </div>
          )}
        </div>

        {/* Right Side: AI Panel + Inspector - Only shown in canvas view */}
        {activeView === 'canvas' && (
          <div className="flex">
            {/* AI Chat Panel */}
            <div
              className={`border-l bg-card transition-all duration-300 overflow-hidden flex flex-col ${aiPanelState === 'collapsed' ? 'w-0 border-l-0' : ''
                }`}
              style={{ width: aiPanelState === 'collapsed' ? 0 : `${aiPanelWidth[aiPanelState]}px` }}
            >
              {aiPanelState !== 'collapsed' && (
                <>
                  {/* AI Panel Header */}
                  <div className="flex items-center justify-between px-3 py-2 border-b bg-gradient-to-r from-purple-50 to-blue-50 shrink-0">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium">AI Assistant</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setAiPanelState(aiPanelState === 'expanded' ? 'normal' : 'expanded')}
                        className="p-1 rounded hover:bg-accent transition-colors"
                        title={aiPanelState === 'expanded' ? 'Reduce' : 'Expand'}
                      >
                        {aiPanelState === 'expanded' ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronUp className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => setAiPanelState('collapsed')}
                        className="p-1 rounded hover:bg-accent transition-colors"
                        title="Hide AI Panel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {/* AI Panel Content */}
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <AIChatPanel />
                  </div>
                </>
              )}
            </div>

            {/* Inspector Panel */}
            {inspectorVisible && (
              <div className="w-80 border-l bg-card resize-x overflow-auto" style={{ minWidth: '200px', maxWidth: '600px' }}>
                <Inspector />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
