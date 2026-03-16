import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { chatWithGuide, analyzeImage } from '../services/gemini';
import { MessageSquare, Image as ImageIcon, X, Send, Upload, Heart, Drumstick, Hammer, ScrollText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export const UI = () => {
  const {
    inventory,
    activeItemIndex,
    setActiveItemIndex,
    chatMessages,
    addChatMessage,
    isChatOpen,
    setChatOpen,
    isImageAnalyzerOpen,
    setImageAnalyzerOpen,
    health,
    hunger,
    eatFood,
    isCraftingOpen,
    setCraftingOpen,
    craftItem,
    quests,
    npcDialogue,
    setNpcDialogue
  } = useStore();

  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatOpen]);

  useEffect(() => {
    const handlePointerLockChange = () => {
      if (document.pointerLockElement) {
        setChatOpen(false);
        setImageAnalyzerOpen(false);
        setCraftingOpen(false);
      }
    };

    document.addEventListener('pointerlockchange', handlePointerLockChange);
    return () => document.removeEventListener('pointerlockchange', handlePointerLockChange);
  }, [setChatOpen, setImageAnalyzerOpen, setCraftingOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyT' && !isChatOpen && !isImageAnalyzerOpen && !isCraftingOpen) {
        e.preventDefault();
        setChatOpen(true);
        document.exitPointerLock();
      }
      if (e.code === 'KeyI' && !isChatOpen && !isImageAnalyzerOpen && !isCraftingOpen) {
        e.preventDefault();
        setImageAnalyzerOpen(true);
        document.exitPointerLock();
      }
      if (e.code === 'KeyC' && !isChatOpen && !isImageAnalyzerOpen && !isCraftingOpen) {
        e.preventDefault();
        setCraftingOpen(true);
        document.exitPointerLock();
      }
      if (e.code === 'KeyE' && !isChatOpen && !isImageAnalyzerOpen && !isCraftingOpen) {
        eatFood();
      }
      if (e.code === 'Escape') {
        setChatOpen(false);
        setImageAnalyzerOpen(false);
        setCraftingOpen(false);
        setNpcDialogue(null);
      }
      
      // Hotbar selection
      if (!isChatOpen && !isImageAnalyzerOpen && !isCraftingOpen) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= 9) {
          setActiveItemIndex(num - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isChatOpen, isImageAnalyzerOpen, isCraftingOpen, setActiveItemIndex, setChatOpen, setImageAnalyzerOpen, setCraftingOpen, eatFood, setNpcDialogue]);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const message = chatInput;
    setChatInput('');
    addChatMessage(message, 'user');
    setIsTyping(true);

    const response = await chatWithGuide(message, chatMessages);
    addChatMessage(response, 'ai');
    setIsTyping(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzeImage = async () => {
    if (!imagePreview || !imageFile) return;
    setIsAnalyzing(true);
    const result = await analyzeImage(imagePreview, imageFile.type);
    setAnalysisResult(result);
    setIsAnalyzing(false);
  };

  const activeItem = inventory[activeItemIndex];

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Crosshair */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white/50 text-2xl font-light">
        +
      </div>

      {/* Survival HUD */}
      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 flex gap-8">
        <div className="flex gap-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <Heart key={i} size={20} className={i < Math.ceil(health / 2) ? "text-red-500 fill-red-500" : "text-gray-500"} />
          ))}
        </div>
        <div className="flex gap-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <Drumstick key={i} size={20} className={i < Math.ceil(hunger / 2) ? "text-amber-600 fill-amber-600" : "text-gray-500"} />
          ))}
        </div>
      </div>

      {/* Hotbar */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 bg-black/50 p-2 rounded-xl backdrop-blur-sm">
        {Array.from({ length: 9 }).map((_, index) => {
          const item = inventory[index];
          return (
            <div
              key={index}
              className={`w-12 h-12 rounded-lg flex items-center justify-center border-2 transition-all relative ${
                activeItemIndex === index ? 'border-white scale-110 bg-white/20' : 'border-transparent bg-black/40'
              }`}
            >
              <span className="text-white text-xs absolute top-1 left-1 opacity-50">{index + 1}</span>
              {item && (
                <>
                  <div className={`w-8 h-8 rounded-sm ${getBlockColor(item.type)} shadow-inner flex items-center justify-center text-[10px] font-bold`} />
                  <span className="text-white text-xs absolute bottom-1 right-1 font-bold">{item.count}</span>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Controls Hint */}
      <div className="absolute top-4 right-4 bg-black/50 text-white/80 p-4 rounded-xl text-sm backdrop-blur-sm">
        <p className="font-bold mb-2 text-white">Controls</p>
        <p>W, A, S, D - Move</p>
        <p>Space - Jump</p>
        <p>Left Click - Break/Interact</p>
        <p>Right Click - Place Block</p>
        <p>1-9 - Select Item</p>
        <p className="mt-2 text-emerald-400 font-medium">T - Open AI Chat</p>
        <p className="text-blue-400 font-medium">I - AI Image Analyzer</p>
        <p className="text-amber-400 font-medium">C - Crafting Menu</p>
        <p className="text-red-400 font-medium">E - Eat Food</p>
        <p>ESC - Close Menus</p>
      </div>

      {/* Quests */}
      <div className="absolute top-4 left-4 bg-black/50 text-white/80 p-4 rounded-xl text-sm backdrop-blur-sm w-64">
        <p className="font-bold mb-2 text-white flex items-center gap-2"><ScrollText size={16} /> Quests</p>
        <div className="space-y-2">
          <div className={quests.find_biomes.completed ? "text-emerald-400 line-through" : ""}>
            • Find 3 Biomes ({quests.find_biomes.progress.length}/3)
          </div>
          <div className={quests.craft_iron_pickaxe.completed ? "text-emerald-400 line-through" : ""}>
            • Craft Iron Pickaxe ({quests.craft_iron_pickaxe.progress}/1)
          </div>
          <div className={quests.build_farm.completed ? "text-emerald-400 line-through" : ""}>
            • Build Farm ({quests.build_farm.progress}/10)
          </div>
          <div className={quests.find_ruin.completed ? "text-emerald-400 line-through" : ""}>
            • Find Ancient Ruin ({quests.find_ruin.progress}/1)
          </div>
        </div>
      </div>

      {/* NPC Dialogue */}
      {npcDialogue && (
        <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 bg-black/80 text-white p-6 rounded-2xl border border-white/20 max-w-lg text-center backdrop-blur-md">
          <p className="text-lg font-serif italic">"{npcDialogue}"</p>
          <p className="text-sm text-white/50 mt-2">Press ESC to close</p>
        </div>
      )}

      {/* Crafting Menu */}
      {isCraftingOpen && (
        <div 
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] bg-black/90 rounded-2xl border border-white/10 flex flex-col pointer-events-auto backdrop-blur-md shadow-2xl"
        >
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
            <div className="flex items-center gap-2 text-amber-400">
              <Hammer size={18} />
              <span className="font-medium">Crafting</span>
            </div>
            <button onClick={() => setCraftingOpen(false)} className="text-white/50 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>
          <div className="p-4 grid grid-cols-1 gap-4">
            <div className="bg-white/5 p-4 rounded-xl flex justify-between items-center">
              <div>
                <p className="font-bold text-white">Iron Pickaxe</p>
                <p className="text-sm text-white/50">Requires: 10 Iron Ore</p>
              </div>
              <button 
                onClick={() => craftItem('iron_pickaxe')}
                className="bg-amber-500/20 text-amber-400 px-4 py-2 rounded-lg hover:bg-amber-500/30 transition-colors"
              >
                Craft
              </button>
            </div>
            <div className="bg-white/5 p-4 rounded-xl flex justify-between items-center">
              <div>
                <p className="font-bold text-white">Wooden Axe</p>
                <p className="text-sm text-white/50">Requires: 5 Wood</p>
              </div>
              <button 
                onClick={() => craftItem('wooden_axe')}
                className="bg-amber-500/20 text-amber-400 px-4 py-2 rounded-lg hover:bg-amber-500/30 transition-colors"
              >
                Craft
              </button>
            </div>
            <div className="bg-white/5 p-4 rounded-xl flex justify-between items-center">
              <div>
                <p className="font-bold text-white">Bread</p>
                <p className="text-sm text-white/50">Requires: 3 Wheat</p>
              </div>
              <button 
                onClick={() => craftItem('bread')}
                className="bg-amber-500/20 text-amber-400 px-4 py-2 rounded-lg hover:bg-amber-500/30 transition-colors"
              >
                Craft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Window */}
      {isChatOpen && (
        <div 
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute left-4 bottom-24 w-96 h-96 bg-black/80 rounded-2xl border border-white/10 flex flex-col pointer-events-auto backdrop-blur-md overflow-hidden shadow-2xl"
        >
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
            <div className="flex items-center gap-2 text-emerald-400">
              <MessageSquare size={18} />
              <span className="font-medium">AI Guide</span>
            </div>
            <button onClick={() => setChatOpen(false)} className="text-white/50 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl ${
                  msg.sender === 'user' 
                    ? 'bg-emerald-500/20 text-emerald-100 rounded-br-sm' 
                    : 'bg-white/10 text-white/90 rounded-bl-sm'
                }`}>
                  {msg.sender === 'user' ? (
                    msg.text
                  ) : (
                    <div className="prose prose-invert prose-sm">
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white/10 text-white/50 p-3 rounded-2xl rounded-bl-sm flex gap-1">
                  <span className="animate-bounce">.</span><span className="animate-bounce delay-100">.</span><span className="animate-bounce delay-200">.</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleChatSubmit} className="p-3 border-t border-white/10 bg-black/50 flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask for crafting recipes or tips..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 transition-colors"
              autoFocus
            />
            <button 
              type="submit" 
              disabled={!chatInput.trim() || isTyping}
              className="bg-emerald-500/20 text-emerald-400 p-2 rounded-xl hover:bg-emerald-500/30 disabled:opacity-50 transition-colors"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      )}

      {/* Image Analyzer Window */}
      {isImageAnalyzerOpen && (
        <div 
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute right-4 bottom-24 w-[400px] max-h-[600px] bg-black/80 rounded-2xl border border-white/10 flex flex-col pointer-events-auto backdrop-blur-md overflow-hidden shadow-2xl"
        >
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
            <div className="flex items-center gap-2 text-blue-400">
              <ImageIcon size={18} />
              <span className="font-medium">AI Blueprint Analyzer</span>
            </div>
            <button onClick={() => setImageAnalyzerOpen(false)} className="text-white/50 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            <p className="text-white/70 text-sm">Upload an image of a real-world building or object, and I will give you a blueprint to build it in-game.</p>
            
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-white/10 border-dashed rounded-xl cursor-pointer hover:bg-white/5 transition-colors group">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-2 text-white/40 group-hover:text-blue-400 transition-colors" />
                <p className="text-sm text-white/60"><span className="font-semibold">Click to upload</span> or drag and drop</p>
              </div>
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            </label>

            {imagePreview && (
              <div className="relative rounded-xl overflow-hidden border border-white/10">
                <img src={imagePreview} alt="Preview" className="w-full h-auto object-cover" />
              </div>
            )}

            {imagePreview && !analysisResult && (
              <button
                onClick={handleAnalyzeImage}
                disabled={isAnalyzing}
                className="w-full bg-blue-500/20 text-blue-400 py-3 rounded-xl font-medium hover:bg-blue-500/30 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    Analyzing Blueprint...
                  </>
                ) : (
                  'Analyze Image'
                )}
              </button>
            )}

            {analysisResult && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 mt-2">
                <h3 className="text-blue-400 font-medium mb-2 flex items-center gap-2">
                  <ImageIcon size={16} /> Blueprint Ready
                </h3>
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{analysisResult}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const getBlockColor = (type: string) => {
  switch (type) {
    case 'dirt': return 'bg-[#5c3a21]';
    case 'grass': return 'bg-[#41980a] border-t-4 border-[#41980a]';
    case 'stone': return 'bg-[#7d7d7d]';
    case 'wood': return 'bg-[#5c4033]';
    case 'leaves': return 'bg-[#2d5a27]';
    case 'glass': return 'bg-blue-200/50 border border-white/50';
    case 'iron_ore': return 'bg-[#d8af93] border-2 border-[#5c3a21]';
    case 'wheat_seeds': return 'bg-[#e2c044] rounded-full scale-50';
    case 'wheat': return 'bg-[#e2c044]';
    case 'chest': return 'bg-[#8b5a2b] border-2 border-[#3e2723]';
    case 'npc': return 'bg-[#9c27b0]';
    case 'iron_pickaxe': return 'bg-gray-300 border-b-4 border-amber-800';
    case 'wooden_axe': return 'bg-amber-700 border-b-4 border-amber-900';
    case 'bread': return 'bg-amber-600 rounded-full';
    case 'diamond': return 'bg-cyan-400';
    default: return 'bg-white';
  }
};
