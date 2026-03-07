import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Play, Info, CheckCircle2, Sparkles } from 'lucide-react';
import { TEMPLATES } from '../data';

export function TemplateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const template = TEMPLATES.find((t) => t.id === id);

  const [formData, setFormData] = useState({
    companyName: '',
    setting: '',
    videoStyle: '',
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!template) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white font-sans">
        <p className="text-slate-500 mb-4 text-lg">Template not found.</p>
        <button onClick={() => navigate('/')} className="text-blue-600 font-medium hover:underline">Return to Marketplace</button>
      </div>
    );
  }

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setIsSuccess(true);
      setTimeout(() => {
        alert(`Successfully submitted!\n\nGenerating commercial for ${formData.companyName || 'your business'} using the "${template.name}" template.\nEstimated Cost: $${template.cost}`);
        setIsSuccess(false);
      }, 500);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-slate-900">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10 px-6 py-4 md:px-12 flex items-center">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="mr-2" size={16} />
          Back to templates
        </button>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-12 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
        {/* Left Col: Media Preview */}
        <div className="flex flex-col gap-6 lg:sticky lg:top-28">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mb-3">{template.name}</h1>
            <p className="text-slate-500 text-lg leading-relaxed">{template.description}</p>
          </div>

          <div className={`w-full aspect-video rounded-xl overflow-hidden relative group flex items-center justify-center ${
            template.isCustom 
              ? 'bg-slate-50 border border-dashed border-slate-300' 
              : 'bg-slate-100 border border-slate-100'
          }`}>
             {template.isCustom ? (
               <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                 <Sparkles size={32} strokeWidth={1.5} className="mb-3" />
                 <p className="text-sm font-medium">Custom Template Preview</p>
               </div>
             ) : (
               <>
                 <img 
                   src={template.imageUrl} 
                   alt={template.name} 
                   className="w-full h-full object-cover opacity-95 transition-transform duration-1000 group-hover:scale-[1.02]"
                 />
                 <div className="absolute inset-0 bg-slate-900/10 flex items-center justify-center transition-opacity opacity-0 group-hover:opacity-100">
                    <button className="w-16 h-16 bg-white/95 hover:bg-white backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm text-slate-900 transition-transform hover:scale-105">
                      <Play size={24} fill="currentColor" className="ml-1" />
                    </button>
                 </div>
               </>
             )}
          </div>
          
          <div className="bg-slate-50 border border-slate-100 p-5 rounded-xl flex items-start gap-4 text-sm text-slate-600">
            <Info className="shrink-0 mt-0.5 text-blue-500" size={18} />
            <p className="leading-relaxed">
              Fill out your requirements on the right. Our system will generate a tailored, production-quality commercial using this template.
            </p>
          </div>
        </div>

        {/* Right Col: Configuration */}
        <div className="flex flex-col pt-2 lg:pt-0">
          <form className="flex flex-col gap-6" onSubmit={(e) => e.preventDefault()}>
            <div className="flex flex-col gap-2.5">
              <label htmlFor="companyName" className="text-sm font-medium text-slate-900">
                Company Name
              </label>
              <input 
                id="companyName"
                type="text" 
                placeholder="e.g. Acme Corp, Seaside Cafe"
                className="w-full px-4 py-3.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow text-slate-900 bg-white text-base placeholder:text-slate-400 shadow-sm"
                value={formData.companyName}
                onChange={(e) => setFormData({...formData, companyName: e.target.value})}
              />
            </div>

            <div className="flex flex-col gap-2.5">
              <label htmlFor="setting" className="text-sm font-medium text-slate-900">
                Setting & Location
              </label>
              <input 
                id="setting"
                type="text" 
                placeholder="e.g. A bustling downtown street"
                className="w-full px-4 py-3.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow text-slate-900 bg-white text-base placeholder:text-slate-400 shadow-sm"
                value={formData.setting}
                onChange={(e) => setFormData({...formData, setting: e.target.value})}
              />
            </div>

            <div className="flex flex-col gap-2.5">
              <label htmlFor="videoStyle" className="text-sm font-medium text-slate-900">
                Video Style & Vibe
              </label>
              <input 
                id="videoStyle"
                type="text" 
                placeholder="e.g. Cinematic, professional, warm"
                className="w-full px-4 py-3.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow text-slate-900 bg-white text-base placeholder:text-slate-400 shadow-sm"
                value={formData.videoStyle}
                onChange={(e) => setFormData({...formData, videoStyle: e.target.value})}
              />
            </div>
            
            <div className="mt-8 pt-8 border-t border-slate-100 flex flex-col gap-6">
               <div className="flex flex-row items-center justify-between">
                 <span className="text-sm font-medium text-slate-500">Estimated Cost</span>
                 <span className="text-2xl font-semibold text-slate-900">${template.cost}</span>
               </div>
               
               <button 
                 onClick={handleGenerate}
                 disabled={isGenerating || isSuccess}
                 className="w-full text-white font-medium py-4 px-6 rounded-lg flex items-center justify-center gap-2 transition-all text-base shadow-sm"
                 style={
                   isGenerating || isSuccess 
                     ? { backgroundColor: '#cbd5e1', cursor: 'not-allowed' } 
                     : { backgroundColor: '#FF7A00' }
                 }
               >
                 {isGenerating ? (
                   <>
                     <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                     Generating...
                   </>
                 ) : isSuccess ? (
                   <>
                     <CheckCircle2 size={20} />
                     Generated
                   </>
                 ) : (
                   'Generate Commercial'
                 )}
               </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
