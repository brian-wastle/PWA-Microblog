import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { LocationStrategy, PathLocationStrategy } from '@angular/common';

bootstrapApplication(AppComponent, {
  ...appConfig,
  providers: [
    ...appConfig.providers,
    { provide: LocationStrategy, useClass: PathLocationStrategy }  // Apply the PathLocationStrategy
  ]
})
  .catch((err) => console.error(err));
