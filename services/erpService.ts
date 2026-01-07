
import { Product, Order, Customer, SqlQueryLog } from '../types';

const MOCK_PRODUCTS: Product[] = [
  { id: 'M1', code: 'MOCK-01', name: 'Laptop de Ejemplo', description: 'Datos de prueba (Bridge desconectado)', price: 999, stock: 10, category: 'Demo', image: '' },
];

const MOCK_CUSTOMERS: Customer[] = [
  { id: 'C1', name: 'Cliente de Prueba', taxId: '000', address: 'Calle 123', creditLimit: 1000 },
];

let queryLogs: SqlQueryLog[] = [];

const logQuery = (type: SqlQueryLog['type'], query: string) => {
  queryLogs.unshift({
    timestamp: new Date().toLocaleTimeString(),
    type,
    query
  });
  if (queryLogs.length > 30) queryLogs.pop();
};

export const erpService = {
  async testConnection(url: string): Promise<boolean> {
    try {
      const response = await fetch(`${url}/health`);
      return response.ok;
    } catch (e) {
      return false;
    }
  },

  async getProducts(baseUrl?: string): Promise<Product[]> {
    if (baseUrl) {
      logQuery('SELECT', `SQL: SELECT TOP 200 CodProd... FROM dbo.saprod`);
      try {
        const res = await fetch(`${baseUrl}/products`);
        if (res.ok) {
          const data = await res.json();
          return data.map((p: any) => ({
            id: p.id || p.CodProd,
            code: p.code || p.CodProd,
            name: p.name || p.Descrip,
            price: Number(p.price || p.Precio1) || 0,
            stock: Number(p.stock || p.Existen) || 0,
            description: p.description || p.Descrip || '',
            image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400'
          }));
        } else {
          const error = await res.json();
          throw new Error(error.error || "Fallo conexión con SQL");
        }
      } catch (e: any) {
        logQuery('ERROR', e.message);
        throw e;
      }
    }
    return MOCK_PRODUCTS;
  },

  async getCustomers(baseUrl?: string): Promise<Customer[]> {
    if (baseUrl) {
      logQuery('SELECT', `SQL: SELECT TOP 100 CodClie... FROM dbo.sacli`);
      try {
        const res = await fetch(`${baseUrl}/customers`);
        if (res.ok) {
          const data = await res.json();
          return data.map((c: any) => ({
            id: c.id || c.CodClie,
            name: c.name || c.Descrip,
            taxId: c.taxId || c.Id3 || '',
            address: c.address || c.Direc1 || ''
          }));
        }
      } catch (e) {
        logQuery('ERROR', 'Error obteniendo clientes SQL.');
      }
    }
    return MOCK_CUSTOMERS;
  },

  async createOrder(order: Omit<Order, 'id' | 'date' | 'status'>, baseUrl?: string): Promise<Order> {
    const orderId = `PED-${Math.floor(Math.random() * 90000) + 10000}`;
    if (baseUrl) {
      logQuery('INSERT', `SQL: INSERT INTO dbo.safact VALUES ('${orderId}', ...)`);
      const res = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...order, id: orderId })
      });
      if (res.ok) return await res.json();
      const err = await res.json();
      throw new Error(err.error || "Error al insertar en SQL");
    }
    return { ...order, id: orderId, date: new Date().toISOString(), status: 'Processed' };
  },

  getLogs: () => [...queryLogs]
};
