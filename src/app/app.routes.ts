import { Routes, PreloadAllModules, provideRouter, withPreloading } from '@angular/router';
import { HomepageComponent } from './pages/homepage/homepage.component';

export const routes: Routes = [
  { path: '', component: HomepageComponent },
  { path: 'login', loadComponent: () => import('./pages/loginpage/loginpage.component').then(m => m.LoginPageComponent) },
  { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) }
];

export const appRoutingProviders = [
  provideRouter(routes, withPreloading(PreloadAllModules))
];
