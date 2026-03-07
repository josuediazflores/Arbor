import React from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { Play, Sparkles } from 'lucide-react';
import { GENRES, TEMPLATES, Genre } from '../data';

export function Marketplace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentGenre = (searchParams.get('genre') as Genre) || 'all';
  const navigate = useNavigate();

  const filteredTemplates = TEMPLATES.filter(
    (t) => t.isCustom || currentGenre === 'all' || t.genre === currentGenre
  );

  return (
    <div className="min-h-screen bg-white flex flex-col items-center py-12 px-6 md:px-12 font-sans text-slate-900">
      {/* Header Section */}
      <div className="max-w-6xl w-full flex flex-col gap-10">
        <header className="flex flex-col gap-4">
          <h1 className="text-4xl tracking-tight font-semibold flex items-center text-blue-600">
            Manifest<span style={{ color: '#FF7A00' }}>.</span>
          </h1>
          <p className="text-slate-500 max-w-2xl text-lg leading-relaxed">
            Professional AI commercial templates for local businesses. Select a format, provide your details, and generate a broadcast-ready video instantly.
          </p>
        </header>

        {/* Genre Filters */}
        <div className="flex flex-wrap gap-2 pb-6 border-b border-slate-100">
          {GENRES.map((g) => (
            <button
              key={g.id}
              onClick={() => setSearchParams({ genre: g.id })}
              className={`px-4 py-2 rounded-md text-sm transition-colors ${
                currentGenre === g.id
                  ? 'bg-slate-900 text-white font-medium'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              onClick={() => navigate(`/template/${template.id}`)}
              className="group cursor-pointer flex flex-col"
            >
              <div className={`relative aspect-video rounded-xl overflow-hidden mb-4 ${
                template.isCustom 
                  ? 'bg-slate-50 border border-dashed border-slate-300 group-hover:border-blue-400 transition-colors' 
                  : 'bg-slate-100 border border-slate-100'
              }`}>
                {template.isCustom ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors">
                    <Sparkles size={24} strokeWidth={1.5} className="mb-2" />
                    <span className="text-sm font-medium">Create Custom</span>
                  </div>
                ) : (
                  <>
                    <img 
                      src={template.imageUrl} 
                      alt={template.name} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-12 h-12 bg-white/95 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm text-slate-900">
                        <Play size={18} fill="currentColor" className="ml-1" />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-col flex-1 px-1">
                <div className="flex justify-between items-start mb-1 gap-2">
                  <h3 className="text-base font-medium text-slate-900 line-clamp-1">
                    {template.name}
                  </h3>
                  <span className="text-sm font-medium text-slate-500">
                    ${template.cost}
                  </span>
                </div>
                <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
                  {template.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
