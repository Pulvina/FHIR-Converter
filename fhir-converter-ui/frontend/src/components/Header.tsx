import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, Info } from 'lucide-react';
import './Header.css';

const Header: React.FC = () => {
  const location = useLocation();

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <Activity size={32} className="header-icon" />
          <h1 className="header-title">FHIR Converter</h1>
        </div>
        <nav className="header-nav">
          <Link 
            to="/" 
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            Convert
          </Link>
          <Link 
            to="/about" 
            className={`nav-link ${location.pathname === '/about' ? 'active' : ''}`}
          >
            <Info size={16} />
            About
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;