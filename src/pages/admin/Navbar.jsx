import { Link , useLocation} from "react-router-dom"

const  nonCurrentTileStyle = 'flex items-center space-x-3 transition-all duration-300 ease-in-out text-secondary px-4 py-3 font-body text-sm font-medium hover:bg-surface-variant/50 rounded-lg';
const currentTileStyle = 'flex items-center space-x-3 transition-all duration-300 ease-in-out bg-secondary-container text-primary rounded-lg px-4 py-3 font-body text-sm font-medium';


const Navbar = () => {

    const location = useLocation();


    return (
        <aside id="sidebar-nav" className="h-screen w-64 border-r border-outline-variant/15 bg-surface-container-low sticky top-0 hidden md:flex flex-col p-6 space-y-2">
            <div className="mb-10 px-4">
                <h1 className="font-headline text-lg font-bold text-primary">Feedback Portal</h1>
                <p className="text-xs text-secondary font-medium tracking-wider uppercase">Empathetic Editorial</p>
            </div>
            <nav className="flex-1 space-y-1">
                <Link id="nav-dashboard" className={location.pathname === '/admin' ? currentTileStyle : nonCurrentTileStyle} to={'/admin'}>
                    <span className="material-symbols-outlined" data-icon="dashboard">dashboard</span>
                    <span>Dashboard</span>
                </Link>
                <a id="nav-form-creator" className="flex items-center space-x-3 transition-all duration-300 ease-in-out text-secondary px-4 py-3 font-body text-sm font-medium hover:bg-surface-variant/50 rounded-lg" href="#">
                    <span className="material-symbols-outlined" data-icon="add_circle">add_circle</span>
                    <span>Form Creator</span>
                </a>
                <a id="nav-live-forms" className="flex items-center space-x-3 transition-all duration-300 ease-in-out text-secondary px-4 py-3 font-body text-sm font-medium hover:bg-surface-variant/50 rounded-lg" href="#">
                    <span className="material-symbols-outlined" data-icon="live_tv">live_tv</span>
                    <span>Live Forms</span>
                </a>
                <Link id="nav-results" className={location.pathname === '/admin/result' ? currentTileStyle : nonCurrentTileStyle} to={'/admin/result'}>
                    <span className="material-symbols-outlined" data-icon="analytics">analytics</span>
                    <span>Results</span>
                </Link>
            </nav>
            <div className="pt-6 border-t border-outline-variant/10 space-y-1">
                <a id="nav-settings" className="flex items-center space-x-3 transition-all duration-300 ease-in-out text-secondary px-4 py-3 font-body text-sm font-medium hover:bg-surface-variant/50 rounded-lg" href="#">
                    <span className="material-symbols-outlined" data-icon="settings">settings</span>
                    <span>Settings</span>
                </a>
                <a id="nav-logout" className="flex items-center space-x-3 transition-all duration-300 ease-in-out text-secondary px-4 py-3 font-body text-sm font-medium hover:bg-surface-variant/50 rounded-lg" href="#">
                    <span className="material-symbols-outlined" data-icon="logout">logout</span>
                    <span>Logout</span>
                </a>
            </div>
        </aside>
    )
}

export default Navbar
