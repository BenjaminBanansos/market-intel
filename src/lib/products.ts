export interface FabricSwatch {
  id: string;
  name: string;
  hex?: string;
  imageUrl?: string;
  priceModifier: number;
}

export interface DimensionConstraints {
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
}

export interface CustomizationRule {
  id: string;
  name: string;
  condition: string; // e.g., "width > 2500"
  action: string;    // e.g., "markup 15%"
  status: 'active' | 'draft';
}

export interface Addon {
  id: string;
  name: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  basePrice: number; // For sqft mode, this is Price Per Sqft
  basePriceMode: 'fixed' | 'perSqFt';
  description: string;
  fabrics: FabricSwatch[];
  constraints?: DimensionConstraints;
  logic?: CustomizationRule[];
  mediaAssets?: string[];
  imageUrl?: string;
  addons?: Addon[];
  
  // Advanced Product Metadata
  transparency?: string;
  material?: string;
  weight?: string;
  repeatSize?: string;
  
  status: 'published' | 'draft';
}

export interface Category {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  productCount: number;
  viewCount: number;
}

// Mock data for initial seeding
export const categories: Category[] = [
  { id: 'zebra', name: 'Zebra Shades', description: 'Dual layered fabric for precision light control.', productCount: 43, viewCount: 15200 },
  { id: 'roller', name: 'Roller Shades', description: 'Minimalist design meets functional simplicity.', productCount: 128, viewCount: 6300 },
  { id: 'roman', name: 'Roman Shades', description: 'Timeless elegance with soft fabric folds.', productCount: 65, viewCount: 11500 }
];
