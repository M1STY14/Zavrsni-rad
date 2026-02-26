import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Nav = () => {
    const location = useLocation();

    return (
        <nav className="nav">
            <ul className="nav-list">
                <li><Link to="/" className={location.pathname === '/' ? 'nav-active' : ''}>Home</Link></li>
                <li><Link to="/visualizations" className={location.pathname === '/visualizations' ? 'nav-active' : ''}>Visualizations</Link></li>
                <li><Link to="/about" className={location.pathname === '/about' ? 'nav-active' : ''}>About</Link></li>
            </ul>
        </nav>
    );
};

export default Nav;
