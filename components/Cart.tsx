
import React from 'react';
import { CartItem } from '../types';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onRemove: (id: string) => void;
  onUpdateQty: (id: string, qty: number) => void;
  onCheckout: () => void;
  isProcessing: boolean;
}

export const Cart: React.FC<CartProps> = ({ isOpen, onClose, items, onRemove, onUpdateQty, onCheckout, isProcessing }) => {
  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl flex flex-col animate-slide-left">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Tu Pedido</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              <p>Tu carrito está vacío</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex items-center space-x-4 border-b pb-4">
                <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-lg" />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">{item.name}</h3>
                  <p className="text-sm text-gray-500">${item.price.toFixed(2)} c/u</p>
                  <div className="flex items-center space-x-3 mt-2">
                    <button 
                      onClick={() => onUpdateQty(item.id, Math.max(1, item.quantity - 1))}
                      className="w-6 h-6 rounded border flex items-center justify-center hover:bg-gray-50"
                    >-</button>
                    <span className="text-sm font-medium">{item.quantity}</span>
                    <button 
                      onClick={() => onUpdateQty(item.id, item.quantity + 1)}
                      className="w-6 h-6 rounded border flex items-center justify-center hover:bg-gray-50"
                    >+</button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">${(item.price * item.quantity).toFixed(2)}</p>
                  <button 
                    onClick={() => onRemove(item.id)}
                    className="text-xs text-red-500 hover:underline mt-2"
                  >Eliminar</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 border-t bg-gray-50 space-y-4">
          <div className="flex justify-between items-center text-lg">
            <span className="text-gray-600 font-medium">Total Estimado</span>
            <span className="text-2xl font-bold text-blue-700">${total.toFixed(2)}</span>
          </div>
          <p className="text-xs text-gray-500 text-center italic">
            Este pedido será sincronizado automáticamente con tu base de datos SQL Administrativa.
          </p>
          <button 
            disabled={items.length === 0 || isProcessing}
            onClick={onCheckout}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center"
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Procesando en ERP...
              </>
            ) : 'Confirmar Pedido'}
          </button>
        </div>
      </div>
    </div>
  );
};
