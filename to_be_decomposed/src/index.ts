import { initializeAuth } from './auth';
import { loadGameLibrary } from './manage';
import { checkAuthStatus } from './services';

console.log('Application initializing...');
console.log('Current path:', window.location.pathname);

// recycle this everywhere 
function parseJwt(token: string) {
	try {
		const base64Url = token.split('.')[1];
		const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
		const jsonPayload = decodeURIComponent(
			atob(base64).split('').map(c => {
				return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
			}).join('')
		);
		return JSON.parse(jsonPayload);
	} catch (error) {
		console.error('Failed to parse JWT token:', error);
		return null;
	}
}

async function initializeApp(): Promise<void> {
	console.log('Initializing app...');
	
	const path = window.location.pathname;
	console.log('Current path:', path);
	
	try {
		const authCheckResult = await checkAuthStatus();
		const isAuthenticated = authCheckResult.isAuthenticated;
		console.log('Authentication status:', isAuthenticated);
		
		const token = localStorage.getItem('token');
		if (token) {
			console.log('Token found in localStorage');
		}
		
		const isLoginPage = path === '/login' || path === '/';
		
		if (isAuthenticated) {
			console.log('User is authenticated');
			
			if (isLoginPage) {
				console.log('Redirecting to index.html...');
				window.location.href = '/index.html';
				return;
			}
			
			setupRoutes();
			
			handleCurrentRoute();
		} else {
			console.log('User is not authenticated');
			
			if (!isLoginPage) {
				console.log('Redirecting to login...');
				window.location.href = '/login';
				return;
			}
			
			console.log('Initializing auth components...');
			initializeAuth();
		}
	} catch (error) {
		console.error('Error during app initialization:', error);
		
		window.location.href = '/login';
	}
}

function setupRoutes(): void {
	window.addEventListener('popstate', handleRouteChange);

	document.addEventListener('click', (event) => {
		const target = event.target as HTMLElement;
		const link = target.closest('a');

		if (link && link.getAttribute('href')?.startsWith('/')) {
			event.preventDefault();
			navigateTo(link.getAttribute('href') || '/');
		}
	});
}

async function handleRouteChange(): Promise<void> {
	console.log('Route change detected');
	const path = window.location.pathname;
	console.log('New path:', path);

	if (path !== '/login' && path !== '/') {
		try {
			const authCheckResult = await checkAuthStatus();
			if (!authCheckResult.isAuthenticated) {
				console.log('User not authenticated, redirecting to login');
				window.location.href = '/login';
				return;
			}
		} catch (error) {
			console.error('Error checking auth status:', error);
			window.location.href = '/login';
			return;
		}
	}

	handleCurrentRoute();
}

function handleCurrentRoute(): void {
	const path = window.location.pathname;
	console.log('Handling current route:', path);
	
	if (path === '/gamelibrary') {
		console.log('Loading game library...');
		loadGameLibrary();
	} else if (path === '/settings/2fa') {
		console.log('Loading 2FA...');
		managedload2FA();
	}
}

export function navigateTo(path: string): void {
	console.log('Navigating to:', path);
	history.pushState(null, '', path);
	handleRouteChange();
}

if (document.readyState === 'loading') {
	console.log('Document still loading, waiting for DOMContentLoaded');
	document.addEventListener('DOMContentLoaded', initializeApp);
} else {
	console.log('Document already loaded, running initApp directly');
	initializeApp();
}

export default {
	navigateTo
}; 