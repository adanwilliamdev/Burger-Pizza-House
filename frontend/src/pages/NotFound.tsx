import React from 'react';
import { Link } from 'react-router-dom';
import { Pizza, Home } from 'lucide-react';

export const NotFound: React.FC = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-surface dark:bg-gray-900 text-center px-6">
    <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6">
      <Pizza className="w-10 h-10 text-primary" />
    </div>
    <h1 className="text-[64px] font-bold leading-none text-ink dark:text-gray-100">404</h1>
    <p className="text-card-title mt-2">Essa página saiu para entrega e não voltou.</p>
    <p className="text-caption mt-1 max-w-sm">
      A página que você tentou acessar não existe ou foi movida.
    </p>
    <Link to="/dashboard" className="btn-primary mt-6 inline-flex items-center gap-2">
      <Home className="w-4 h-4" />
      Voltar ao início
    </Link>
  </div>
);
