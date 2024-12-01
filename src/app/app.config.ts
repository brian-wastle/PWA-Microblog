import { ApplicationConfig, provideZoneChangeDetection, isDevMode } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { withFetch } from '@angular/common/http';
import { provideClientHydration } from '@angular/platform-browser';
import { appRoutingProviders } from './app.routes';
import { routes } from './app.routes';
import { provideServiceWorker } from '@angular/service-worker';
import { authConfig } from './auth/auth.config';
import { provideAuth } from 'angular-auth-oidc-client';

export const appConfig: ApplicationConfig = {
  providers: [appRoutingProviders, provideZoneChangeDetection({ eventCoalescing: true }), provideRouter(routes), provideHttpClient(withFetch()), provideClientHydration(), provideServiceWorker('ngsw-worker.js', {
            enabled: !isDevMode(),
            registrationStrategy: 'registerWhenStable:30000'
          }), provideAuth(authConfig)]
};
