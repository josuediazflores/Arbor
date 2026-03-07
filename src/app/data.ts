export type Genre = 'all' | 'tech' | 'entertainment' | 'retail' | 'restaurant' | 'service' | 'real-estate';

export interface Template {
  id: string;
  genre: Genre;
  name: string;
  description: string;
  cost: number;
  imageUrl: string;
  isCustom?: boolean;
}

export const GENRES = [
  { id: 'all', label: 'All Categories' },
  { id: 'tech', label: 'Tech' },
  { id: 'entertainment', label: 'Entertainment' },
  { id: 'retail', label: 'Retail' },
  { id: 'restaurant', label: 'Restaurants' },
  { id: 'service', label: 'Services' },
  { id: 'real-estate', label: 'Real Estate' },
];

export const TEMPLATES: Template[] = [
  { id: '1', genre: 'restaurant', name: 'Cozy Cafe Vibe', description: 'Highlight your best coffee and pastries with a warm, inviting cinematic look.', cost: 50, imageUrl: 'https://images.unsplash.com/photo-1766981795246-533e5bedfecf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3p5JTIwY2FmZSUyMGNvZmZlZSUyMHBhc3RyeXxlbnwxfHx8fDE3NzI5MTM5NDZ8MA&ixlib=rb-4.1.0&q=80&w=1080' },
  { id: '2', genre: 'restaurant', name: 'Fast Casual Energy', description: 'Upbeat and fast-paced commercial perfect for quick bites.', cost: 40, imageUrl: 'https://images.unsplash.com/photo-1762922425249-144c3bb9167e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXN0JTIwY2FzdWFsJTIwYnVyZ2VyJTIwZnJpZXMlMjByZXN0YXVyYW50fGVufDF8fHx8MTc3MjkxMzk1Mnww&ixlib=rb-4.1.0&q=80&w=1080' },
  { id: '3', genre: 'retail', name: 'Boutique Showcase', description: 'Elegant sweeps over your newest inventory.', cost: 60, imageUrl: 'https://images.unsplash.com/photo-1761090617068-f1b3257d27ad?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZXRhaWwlMjBjbG90aGluZyUyMGJvdXRpcXVlJTIwc3RvcmV8ZW58MXx8fHwxNzcyOTEzOTU3fDA&ixlib=rb-4.1.0&q=80&w=1080' },
  { id: '4', genre: 'service', name: 'Trusted Professional', description: 'Show your team in action with a reliable, professional tone.', cost: 45, imageUrl: 'https://images.unsplash.com/photo-1771122453274-d3270e73cf94?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwbHVtYmVyJTIwdG9vbHN8ZW58MXx8fHwxNzcyOTEzOTY2fDA&ixlib=rb-4.1.0&q=80&w=1080' },
  { id: '5', genre: 'real-estate', name: 'Modern Property Tour', description: 'Smooth drone shots and bright interiors.', cost: 80, imageUrl: 'https://images.unsplash.com/photo-1756435292384-1bf32eff7baf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBob3VzZSUyMHJlYWwlMjBlc3RhdGV8ZW58MXx8fHwxNzcyOTEzOTcxfDA&ixlib=rb-4.1.0&q=80&w=1080' },
  { id: '6', genre: 'entertainment', name: 'High Energy Promo', description: 'Flashy cuts and bold text for events or gym promos.', cost: 55, imageUrl: 'https://images.unsplash.com/photo-1676109829011-a9f0f3e40f00?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxneW0lMjB3ZWlnaHRzJTIwZml0bmVzcyUyMGNlbnRlcnxlbnwxfHx8fDE3NzI5MTM5NzZ8MA&ixlib=rb-4.1.0&q=80&w=1080' },
  { id: 'custom', genre: 'all', name: 'Custom Commercial', description: 'Start with a blank canvas and build your fully customized AI commercial. Perfect for unique visions.', cost: 100, imageUrl: 'https://images.unsplash.com/photo-1703583955210-4cca12837223?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGNvbG9yZnVsJTIwYmxhbmslMjBjYW52YXN8ZW58MXx8fHwxNzcyOTE0MDI3fDA&ixlib=rb-4.1.0&q=80&w=1080', isCustom: true },
];
