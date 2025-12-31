import React from 'react';
import { Link } from 'react-router-dom';

const Nav = () => {
    const nav_bar = React.useRef(null);

    React.useEffect(() => {
        nav_bar.current.addEventListener('click', () => {
            console.log("Clicked on nav item");
        });
    }, []);

    return (
        <>
            <nav className="nav">
                <ul className="nav-list" ref={nav_bar}>
                    <li><Link to="/">Home</Link></li>
                    <li><Link to="/visualizations">Vizualizacije</Link></li>
                    <li><Link to="/about">About</Link></li>
                </ul>
            </nav>
        </>
    );
}

export default Nav;