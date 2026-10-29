/** Shape of `public/data/smart-furniture.json` (20 × 16 m concept envelope, metres). */

export interface FurniturePart {
  poly: [number, number][];
  z0: number;
  z1: number;
  color: string;
  group: string;
  roof: boolean;
}

export interface SmartFurnitureData {
  objects: FurniturePart[];
  dimensions: [number, number];
}
