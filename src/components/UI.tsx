import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { chatWithGuide, analyzeImage } from '../services/gemini';
import { MessageSquare, Image as ImageIcon, X, Send, Upload, Heart, Drumstick, Hammer, ScrollText, Backpack } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { textureDataURIs } from '../utils/textures';
import { checkRecipe } from '../utils/crafting';

const itemNames: Record<string, string> = {
  dirt: '泥土',
  grass: '草方块',
  stone: '石头',
  wood: '木头',
  leaves: '树叶',
  glass: '玻璃',
  iron_ore: '铁矿石',
  wheat_seeds: '小麦种子',
  wheat: '小麦',
  chest: '宝箱',
  bread: '面包',
  diamond: '钻石',
  npc: 'NPC',
  torch: '火把',
  flower: '小红花',
  tnt: '炸药',
  slime: '史莱姆块',
  jetpack: '喷气背包',
  water: '水',
  nuke: '核弹',
  laser: '激光枪',
  crafting_table: '合成工作台',
  sand: '沙子',
  snow: '雪块',
  cactus: '仙人掌'
};

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
    setNpcDialogue,
    isInventoryOpen,
    setInventoryOpen,
    swapInventoryItems,
    craftingGrid,
    setCraftingGrid,
    addToInventory,
    removeFromInventory
  } = useStore(useShallow(state => ({
    inventory: state.inventory,
    activeItemIndex: state.activeItemIndex,
    setActiveItemIndex: state.setActiveItemIndex,
    chatMessages: state.chatMessages,
    addChatMessage: state.addChatMessage,
    isChatOpen: state.isChatOpen,
    setChatOpen: state.setChatOpen,
    isImageAnalyzerOpen: state.isImageAnalyzerOpen,
    setImageAnalyzerOpen: state.setImageAnalyzerOpen,
    health: state.health,
    hunger: state.hunger,
    eatFood: state.eatFood,
    isCraftingOpen: state.isCraftingOpen,
    setCraftingOpen: state.setCraftingOpen,
    craftItem: state.craftItem,
    quests: state.quests,
    npcDialogue: state.npcDialogue,
    setNpcDialogue: state.setNpcDialogue,
    isInventoryOpen: state.isInventoryOpen,
    setInventoryOpen: state.setInventoryOpen,
    swapInventoryItems: state.swapInventoryItems,
    craftingGrid: state.craftingGrid,
    setCraftingGrid: state.setCraftingGrid,
    addToInventory: state.addToInventory,
    removeFromInventory: state.removeFromInventory
  })));

  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<number | null>(null);

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
        setInventoryOpen(false);
        
        // Return crafting items to inventory if closing
        const state = useStore.getState();
        const grid = state.craftingGrid;
        let changed = false;
        const newGrid = [...grid];
        for (let i = 0; i < 9; i++) {
          if (newGrid[i]) {
            state.addToInventory(newGrid[i]!.type, newGrid[i]!.count);
            newGrid[i] = null;
            changed = true;
          }
        }
        if (changed) state.setCraftingGrid(newGrid);
      }
    };

    document.addEventListener('pointerlockchange', handlePointerLockChange);
    return () => document.removeEventListener('pointerlockchange', handlePointerLockChange);
  }, [setChatOpen, setImageAnalyzerOpen, setCraftingOpen, setInventoryOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const state = useStore.getState();
      if (e.code === 'KeyT' && !state.isChatOpen && !state.isImageAnalyzerOpen && !state.isCraftingOpen && !state.isInventoryOpen) {
        e.preventDefault();
        setChatOpen(true);
        document.exitPointerLock();
      }
      if (e.code === 'KeyI' && !state.isChatOpen && !state.isImageAnalyzerOpen && !state.isCraftingOpen && !state.isInventoryOpen) {
        e.preventDefault();
        setImageAnalyzerOpen(true);
        document.exitPointerLock();
      }
      if (e.code === 'KeyE' && !state.isChatOpen && !state.isImageAnalyzerOpen && !state.isCraftingOpen && !state.isInventoryOpen) {
        e.preventDefault();
        setInventoryOpen(true);
        document.exitPointerLock();
      }
      if (e.code === 'KeyC' && !state.isChatOpen && !state.isImageAnalyzerOpen && !state.isCraftingOpen && !state.isInventoryOpen) {
        e.preventDefault();
        setCraftingOpen(true);
        document.exitPointerLock();
      }
      if (e.code === 'Escape') {
        setChatOpen(false);
        setImageAnalyzerOpen(false);
        setCraftingOpen(false);
        setInventoryOpen(false);
        setNpcDialogue(null);
      }
      
      // Hotbar selection
      if (!state.isChatOpen && !state.isImageAnalyzerOpen && !state.isCraftingOpen && !state.isInventoryOpen) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= 9) {
          setActiveItemIndex(num - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    const handleWheel = (e: WheelEvent) => {
      const state = useStore.getState();
      if (state.isChatOpen || state.isImageAnalyzerOpen || state.isCraftingOpen || state.isInventoryOpen) return;
      if (e.deltaY > 0) {
        setActiveItemIndex((state.activeItemIndex + 1) % 9);
      } else if (e.deltaY < 0) {
        setActiveItemIndex((state.activeItemIndex - 1 + 9) % 9);
      }
    };
    window.addEventListener('wheel', handleWheel);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [setActiveItemIndex, setChatOpen, setImageAnalyzerOpen, setCraftingOpen, setInventoryOpen, setNpcDialogue]);

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

      {/* Item Name */}
      <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 text-white text-xl font-bold text-shadow-md">
        {activeItem ? itemNames[activeItem.type] || activeItem.type : ''}
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
                  <div 
                    className="w-8 h-8 rounded-sm shadow-inner"
                    style={{
                      backgroundImage: textureDataURIs[item.type] ? `url(${textureDataURIs[item.type]})` : 'none',
                      backgroundSize: 'cover',
                      imageRendering: 'pixelated'
                    }}
                  />
                  <span className="text-white text-xs absolute bottom-1 right-1 font-bold">{item.count}</span>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Controls Hint */}
      <div className="absolute top-64 right-4 bg-black/50 text-white/80 p-4 rounded-xl text-sm backdrop-blur-sm">
        <p className="font-bold mb-2 text-white">操作指南</p>
        <p>W, A, S, D - 移动</p>
        <p>Space - 跳跃</p>
        <p>左键 - 破坏/交互</p>
        <p>右键 - 放置/使用物品</p>
        <p>滚轮/1-9 - 切换物品</p>
        <p className="mt-2 text-emerald-400 font-medium">T - 打开 AI 聊天</p>
        <p className="text-blue-400 font-medium">I - AI 蓝图分析</p>
        <p className="text-amber-400 font-medium">C - 制作菜单</p>
        <p className="text-red-400 font-medium">E - 打开背包</p>
        <p>ESC - 关闭菜单</p>
      </div>

      {/* Quests */}
      <div className="absolute top-4 left-4 bg-black/50 text-white/80 p-4 rounded-xl text-sm backdrop-blur-sm w-64">
        <p className="font-bold mb-2 text-white flex items-center gap-2"><ScrollText size={16} /> 任务</p>
        <div className="space-y-2">
          <div className={quests.find_biomes.completed ? "text-emerald-400 line-through" : ""}>
            • 寻找 3 种生物群落 ({quests.find_biomes.progress.length}/3)
          </div>
          <div className={quests.craft_iron_pickaxe.completed ? "text-emerald-400 line-through" : ""}>
            • 制作铁镐 ({quests.craft_iron_pickaxe.progress}/1)
          </div>
          <div className={quests.build_farm.completed ? "text-emerald-400 line-through" : ""}>
            • 建立农场 ({quests.build_farm.progress}/10)
          </div>
          <div className={quests.find_ruin.completed ? "text-emerald-400 line-through" : ""}>
            • 寻找古老遗迹 ({quests.find_ruin.progress}/1)
          </div>
        </div>
      </div>

      {/* NPC Dialogue */}
      {npcDialogue && (
        <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 bg-black/80 text-white p-6 rounded-2xl border border-white/20 max-w-lg text-center backdrop-blur-md">
          <p className="text-lg font-serif italic">"{npcDialogue}"</p>
          <p className="text-sm text-white/50 mt-2">按 ESC 关闭</p>
        </div>
      )}

      {/* Crosshair */}
      {!isChatOpen && !isImageAnalyzerOpen && !isCraftingOpen && !isInventoryOpen && (
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="w-4 h-4 relative">
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/80 -translate-x-1/2 mix-blend-difference"></div>
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/80 -translate-y-1/2 mix-blend-difference"></div>
          </div>
        </div>
      )}

      {/* Backpack UI */}
      {isInventoryOpen && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-auto backdrop-blur-sm z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-[600px] shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Backpack className="text-emerald-400" /> 背包
              </h2>
              <button onClick={() => {
                setInventoryOpen(false);
                document.body.requestPointerLock();
              }} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <div className="grid grid-cols-9 gap-2 mb-6">
              {Array.from({ length: 36 }).map((_, index) => {
                const item = inventory[index];
                return (
                  <div
                    key={index}
                    className={`w-12 h-12 bg-black/40 border ${draggedIndex === index ? 'border-emerald-500 opacity-50' : 'border-zinc-700'} rounded-lg flex items-center justify-center relative hover:border-emerald-500 transition-colors`}
                    draggable={!!item}
                    onDragStart={(e) => {
                      setDraggedIndex(index);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedIndex !== null && draggedIndex !== index) {
                        swapInventoryItems(draggedIndex, index);
                      }
                      setDraggedIndex(null);
                    }}
                    onDragEnd={() => setDraggedIndex(null)}
                  >
                    {item && (
                      <>
                        <div 
                          className="w-8 h-8 rounded-sm shadow-inner"
                          style={{
                            backgroundImage: textureDataURIs[item.type] ? `url(${textureDataURIs[item.type]})` : 'none',
                            backgroundSize: 'cover',
                            imageRendering: 'pixelated'
                          }}
                          title={itemNames[item.type] || item.type}
                        />
                        <span className="text-white text-[10px] absolute bottom-1 right-1 font-bold">{item.count}</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="text-sm text-gray-400 text-center">
              按 <span className="text-emerald-400 font-bold">E</span> 或 <span className="text-emerald-400 font-bold">ESC</span> 关闭
            </div>
          </div>
        </div>
      )}

      {/* Crafting Menu */}
      {isCraftingOpen && (
        <div 
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] bg-black/90 rounded-2xl border border-white/10 flex flex-col pointer-events-auto backdrop-blur-md shadow-2xl"
        >
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
            <div className="flex items-center gap-2 text-amber-400">
              <Hammer size={18} />
              <span className="font-medium">合成工作台</span>
            </div>
            <button onClick={() => setCraftingOpen(false)} className="text-white/50 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>
          <div className="p-6 flex gap-8">
            {/* Inventory Selection */}
            <div className="flex-1">
              <p className="text-white/70 mb-2 text-sm">背包物品 (点击选择)</p>
              <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto pr-2">
                {inventory.map((item, index) => {
                  if (!item || item.count <= 0) return null;
                  return (
                    <div 
                      key={index}
                      onClick={() => setSelectedInventoryItem(index)}
                      className={`relative aspect-square bg-white/5 rounded-lg border flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors ${selectedInventoryItem === index ? 'border-amber-400' : 'border-white/10'}`}
                    >
                      <img 
                        src={textureDataURIs[item.type]} 
                        alt={item.type} 
                        className="w-8 h-8 object-contain pixelated"
                        title={itemNames[item.type] || item.type}
                      />
                      <span className="text-white text-[10px] absolute bottom-1 right-1 font-bold">{item.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Crafting Grid */}
            <div className="flex flex-col items-center justify-center">
              <p className="text-white/70 mb-2 text-sm">合成区 (点击放置/取回)</p>
              <div className="flex items-center gap-4">
                <div className="grid grid-cols-3 gap-1 bg-white/5 p-2 rounded-xl border border-white/10">
                  {craftingGrid.map((item, index) => (
                    <div 
                      key={index}
                      onClick={() => {
                        const newGrid = [...craftingGrid];
                        if (item) {
                          // Return to inventory
                          addToInventory(item.type, 1);
                          newGrid[index] = null;
                        } else if (selectedInventoryItem !== null) {
                          // Place from inventory
                          const invItem = inventory[selectedInventoryItem];
                          if (invItem && invItem.count > 0) {
                            removeFromInventory(invItem.type, 1);
                            newGrid[index] = { type: invItem.type, count: 1 };
                          }
                        }
                        setCraftingGrid(newGrid);
                      }}
                      className="w-12 h-12 bg-black/50 rounded border border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors relative"
                    >
                      {item && (
                        <img 
                          src={textureDataURIs[item.type]} 
                          alt={item.type} 
                          className="w-8 h-8 object-contain pixelated"
                        />
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="text-white/50">➔</div>
                
                {/* Result Slot */}
                <div 
                  className="w-16 h-16 bg-white/10 rounded-xl border-2 border-amber-400/50 flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors relative"
                  onClick={() => {
                    const result = checkRecipe(craftingGrid.map(i => i?.type || null));
                    if (result) {
                      addToInventory(result.type, result.count);
                      setCraftingGrid(Array(9).fill(null));
                      import('../utils/sounds').then(m => m.playSound('break'));
                      
                      // Quest check
                      if (result.type === 'iron_pickaxe') {
                        const state = useStore.getState();
                        if (!state.quests.craft_iron_pickaxe.completed) {
                          state.addChatMessage('任务完成：制作铁镐！奖励：10 个木头。', 'ai');
                          state.addToInventory('wood', 10);
                          useStore.setState({ quests: { ...state.quests, craft_iron_pickaxe: { progress: 1, target: 1, completed: true } } });
                        }
                      }
                    }
                  }}
                >
                  {(() => {
                    const result = checkRecipe(craftingGrid.map(i => i?.type || null));
                    if (result) {
                      return (
                        <>
                          <img 
                            src={textureDataURIs[result.type]} 
                            alt={result.type} 
                            className="w-10 h-10 object-contain pixelated"
                            title={itemNames[result.type] || result.type}
                          />
                          {result.count > 1 && (
                            <span className="text-white text-xs absolute bottom-1 right-1 font-bold">{result.count}</span>
                          )}
                        </>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
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
              <span className="font-medium">AI 向导</span>
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
              placeholder="询问制作配方或提示..."
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
              <span className="font-medium">AI 蓝图分析器</span>
            </div>
            <button onClick={() => setImageAnalyzerOpen(false)} className="text-white/50 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            <p className="text-white/70 text-sm">上传现实世界建筑或物体的图片，我将为你提供在游戏中建造它的蓝图。</p>
            
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-white/10 border-dashed rounded-xl cursor-pointer hover:bg-white/5 transition-colors group">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-2 text-white/40 group-hover:text-blue-400 transition-colors" />
                <p className="text-sm text-white/60"><span className="font-semibold">点击上传</span> 或拖拽文件</p>
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
                    正在分析蓝图...
                  </>
                ) : (
                  '分析图片'
                )}
              </button>
            )}

            {analysisResult && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 mt-2">
                <h3 className="text-blue-400 font-medium mb-2 flex items-center gap-2">
                  <ImageIcon size={16} /> 蓝图已就绪
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
