
export interface Product {
  id: string;
  code: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  image: string;
}

export interface Customer {
  id: string;
  name: string;
  taxId: string;
  address: string;
  creditLimit: number;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Order {
  id: string;
  date: string;
  customerId: string;
  customerName: string;
  items: CartItem[];
  total: number;
  status: 'Pending' | 'Processed' | 'Shipped' | 'Cancelled';
  sqlLog?: string;
}

export interface SqlQueryLog {
  timestamp: string;
  query: string;
  type: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ERROR';
}

export interface BridgeConfig {
  baseUrl: string;
  status: 'connected' | 'disconnected' | 'checking';
  lastPing?: string;
}
