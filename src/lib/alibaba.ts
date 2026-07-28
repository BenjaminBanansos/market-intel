/**
 * Alibaba Integration Layer
 * 
 * This service handles syncing product data and inventory from 
 * Alibaba's Dropshipping/Wholesale API.
 */

export interface AlibabaProduct {
  id: string;
  source_id: string;
  name: string;
  price_usd: number;
  stock_status: 'IN_STOCK' | 'OUT_OF_STOCK';
}

const MOCK_ALIBABA_DATA: AlibabaProduct[] = [
  { id: 'ali-001', source_id: '97806328', name: 'Zebra Shade Fabric - Charcoal', price_usd: 12.50, stock_status: 'IN_STOCK' },
  { id: 'ali-002', source_id: '97806329', name: 'Zebra Shade Fabric - Arctic', price_usd: 12.50, stock_status: 'IN_STOCK' },
  { id: 'ali-003', source_id: '97806330', name: 'Roller Fabric - Pure White', price_usd: 8.20, stock_status: 'IN_STOCK' },
];

export async function fetchAlibabaInventory() {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // In a real implementation, we would use axios.get('https://api.alibaba.com/...')
  // with the user's API credentials.
  return MOCK_ALIBABA_DATA;
}

export async function createAlibabaOrder(orderData: any) {
  console.log('Sending order to Alibaba:', orderData);
  return {
    success: true,
    alibaba_order_id: `ALI-ORDER-${Math.floor(Math.random() * 100000)}`,
    status: 'PLACED'
  };
}
